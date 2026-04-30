import type { NodeId } from '../types';

/**
 * Query parameter that flags a window as a popped-out child rendering a
 * single panel from the parent dashboard. The `__deephaven-` prefix avoids
 * collision with any user-facing query string keys.
 */
export const POPOUT_PARAM = '__deephaven-popout';

/**
 * Query parameter that names the storage key used by the parent dashboard,
 * so the child window knows which sessionStorage entry and BroadcastChannel
 * name to subscribe to.
 */
export const POPOUT_LAYOUT_KEY_PARAM = '__deephaven-layout-key';

export interface PopoutParams {
  panelId: NodeId;
  layoutKey: string | null;
}

/**
 * Inspect a `window.location.search` string. Returns null if no popout
 * parameter is present (i.e. this is the parent window).
 */
export function parsePopoutParams(search: string): PopoutParams | null {
  const params = new URLSearchParams(search);
  const panelId = params.get(POPOUT_PARAM);
  if (panelId == null || panelId === '') return null;
  const layoutKey = params.get(POPOUT_LAYOUT_KEY_PARAM);
  return { panelId, layoutKey: layoutKey === '' ? null : layoutKey };
}

/**
 * Build the URL the popped-out window should load. Uses the current page's
 * pathname + origin so the child loads the same SPA bundle, with our
 * private params appended.
 */
export function buildPopoutUrl(panelId: NodeId, layoutKey: string): string {
  const url = new URL(window.location.href);
  // strip any pre-existing popout params and any other search to keep the
  // child window's URL minimal
  url.search = '';
  url.searchParams.set(POPOUT_PARAM, panelId);
  url.searchParams.set(POPOUT_LAYOUT_KEY_PARAM, layoutKey);
  url.hash = '';
  return url.toString();
}
