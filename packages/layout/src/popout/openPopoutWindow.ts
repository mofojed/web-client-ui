import Log from '@deephaven/log';
import type { NodeId, PopoutGeometry } from '../types';
import { buildPopoutUrl } from './popoutQuery';

const log = Log.module('@deephaven/layout/openPopoutWindow');

const PERMISSION_DENIED_KEY = '__deephaven-window-management-denied';

interface ScreenDetailScreen {
  label?: string;
  availLeft?: number;
  availTop?: number;
  availWidth?: number;
  availHeight?: number;
  left?: number;
  top?: number;
}

interface ScreenDetails {
  screens: ScreenDetailScreen[];
}

/**
 * Try to refine the geometry using the Window Management API to land the
 * window on the same monitor it was last seen on. Resolves with the same
 * geometry if the API isn't available, permission was denied, or the
 * target screen no longer exists.
 */
async function adjustForMonitor(
  geometry: PopoutGeometry
): Promise<PopoutGeometry> {
  if (geometry.screenLabel == null) return geometry;
  if (typeof window === 'undefined') return geometry;
  const w = window as unknown as {
    getScreenDetails?: () => Promise<ScreenDetails>;
  };
  if (typeof w.getScreenDetails !== 'function') return geometry;
  if (typeof localStorage !== 'undefined') {
    if (localStorage.getItem(PERMISSION_DENIED_KEY) === '1') return geometry;
  }
  try {
    const details = await w.getScreenDetails();
    const target = details.screens.find(s => s.label === geometry.screenLabel);
    if (target == null) return geometry;
    const left = target.availLeft ?? target.left ?? 0;
    const top = target.availTop ?? target.top ?? 0;
    const w0 = target.availWidth ?? 1920;
    const h0 = target.availHeight ?? 1080;
    const width = Math.min(geometry.width, w0);
    const height = Math.min(geometry.height, h0);
    const screenX = Math.max(
      left,
      Math.min(left + w0 - width, geometry.screenX)
    );
    const screenY = Math.max(
      top,
      Math.min(top + h0 - height, geometry.screenY)
    );
    return { ...geometry, screenX, screenY, width, height };
  } catch (e) {
    log.warn(
      'getScreenDetails() failed (likely permission denied), falling back:',
      e
    );
    if (typeof localStorage !== 'undefined') {
      try {
        localStorage.setItem(PERMISSION_DENIED_KEY, '1');
      } catch {
        /* ignore */
      }
    }
    return geometry;
  }
}

function buildFeatures(geometry: PopoutGeometry): string {
  // The "popup" feature, plus an explicit width/height/left/top, tells
  // Chrome/Edge/Firefox to open as a chromeless popup window rather than
  // a regular tab. The "toolbar/location/menubar/status=no" features are
  // legacy hints; modern browsers ignore them but include them for
  // completeness.
  return [
    'popup=yes',
    `width=${Math.round(geometry.width)}`,
    `height=${Math.round(geometry.height)}`,
    `left=${Math.round(geometry.screenX)}`,
    `top=${Math.round(geometry.screenY)}`,
    'toolbar=no',
    'location=no',
    'menubar=no',
    'status=no',
  ].join(',');
}

export interface OpenPopoutOptions {
  panelId: NodeId;
  layoutKey: string;
  geometry: PopoutGeometry;
}

/**
 * Open a chromeless child window for `panelId`. Returns the Window handle
 * synchronously so this can be called inside a user-gesture handler
 * (`dragend`, `click`, etc.) without losing popup-blocker context. Any
 * monitor-aware refinement happens asynchronously after the window has
 * already been placed; if it succeeds, we move/resize the window to its
 * final position.
 *
 * Returns null if the browser blocked the popup.
 */
export function openPopoutWindow(options: OpenPopoutOptions): Window | null {
  const url = buildPopoutUrl(options.panelId, options.layoutKey);
  const features = buildFeatures(options.geometry);
  const name = `dh-popout-${options.panelId}`;
  const child = window.open(url, name, features);
  if (child == null) {
    log.warn('Popout blocked by browser for panel', options.panelId);
    return null;
  }
  // best-effort: refine position via Window Management API if available.
  // We can do this asynchronously because the window is already open; if
  // the result differs, just move/resize it.
  if (options.geometry.screenLabel != null) {
    adjustForMonitor(options.geometry)
      .then(adjusted => {
        if (
          adjusted.screenX !== options.geometry.screenX ||
          adjusted.screenY !== options.geometry.screenY ||
          adjusted.width !== options.geometry.width ||
          adjusted.height !== options.geometry.height
        ) {
          try {
            child.moveTo(adjusted.screenX, adjusted.screenY);
            child.resizeTo(adjusted.width, adjusted.height);
          } catch (e) {
            log.warn('Failed to refine popout window position:', e);
          }
        }
        return adjusted;
      })
      .catch(err => log.warn('Window Management refinement failed:', err));
  }
  return child;
}
