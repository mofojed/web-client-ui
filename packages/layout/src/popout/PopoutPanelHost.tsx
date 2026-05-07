import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Log from '@deephaven/log';
import type {
  HydrateOptions,
  LayoutNode,
  LayoutState,
  NodeId,
  SerializedLayoutState,
  Transform,
} from '../types';
import type { PanelRegistry } from '../components/types';
import { hydrate } from '../state/hydrate';
import { resolveLayout } from '../state/compact';
import Dashboard from '../components/Dashboard';
import PopoutBridge, { type PopoutMessage } from './PopoutBridge';
import { POPOUT_PARAM, POPOUT_LAYOUT_KEY_PARAM } from './popoutQuery';

const log = Log.module('@deephaven/layout/PopoutPanelHost');

const GEOMETRY_POLL_MS = 250;
/**
 * If we don't hear from the parent for this long, assume it's gone (closed
 * for real, not just refreshing) and close ourselves. Picked generously so
 * a slow parent refresh — bootstrap chain, plugins, JS API — fits inside
 * the silence window.
 */
const PARENT_SILENCE_TIMEOUT_MS = 5000;
const PARENT_LIVENESS_POLL_MS = 1000;

export interface PopoutPanelHostProps {
  /**
   * Same panel registry the parent dashboard uses. The host looks up the
   * popped-out panel's component definition here.
   */
  components: PanelRegistry;
  /**
   * Whether the popout's Dashboard renders in edit mode. Edit mode shows
   * the tab header even on a single-panel stack, which is what makes the
   * popped-out panel draggable back to the parent. Defaults to true.
   */
  editMode?: boolean;
  /**
   * Optional hydrate hook (per-panel state deserialization). Should match
   * what the parent passed to `usePersistedLayoutState`.
   */
  hydrateOptions?: HydrateOptions;
  /**
   * Storage backend to read the parent's master state from. Defaults to
   * the parent's localStorage / sessionStorage (whichever has the entry).
   */
  storage?: Storage | null;
}

function getQueryParams(): {
  popoutId: NodeId | null;
  layoutKey: string | null;
} {
  if (typeof window === 'undefined') {
    return { popoutId: null, layoutKey: null };
  }
  const params = new URLSearchParams(window.location.search);
  return {
    popoutId: params.get(POPOUT_PARAM),
    layoutKey: params.get(POPOUT_LAYOUT_KEY_PARAM),
  };
}

function getDefaultStorage(layoutKey: string): Storage | null {
  if (typeof window === 'undefined') return null;
  const candidates: Storage[] = [];
  try {
    const opener = window.opener as Window | null;
    if (opener != null && !opener.closed) {
      try {
        candidates.push(opener.sessionStorage);
      } catch {
        /* cross-origin */
      }
      try {
        candidates.push(opener.localStorage);
      } catch {
        /* cross-origin */
      }
    }
  } catch {
    /* opener inaccessible */
  }
  try {
    candidates.push(window.localStorage);
  } catch {
    /* disabled */
  }
  try {
    candidates.push(window.sessionStorage);
  } catch {
    /* disabled */
  }
  const found = candidates.find(c => {
    try {
      return c.getItem(layoutKey) != null;
    } catch {
      return false;
    }
  });
  return found ?? candidates[0] ?? null;
}

function readMaster(
  storage: Storage | null,
  layoutKey: string,
  hydrateOptions?: HydrateOptions
): LayoutState | null {
  if (storage == null) return null;
  try {
    const raw = storage.getItem(layoutKey);
    if (raw == null) return null;
    return hydrate(JSON.parse(raw) as SerializedLayoutState, hydrateOptions);
  } catch (e) {
    log.warn('Failed to read parent state:', e);
    return null;
  }
}

/**
 * Root component for a popped-out child window. Renders a `<Dashboard>`
 * over the popout's sub-layout (read from the parent's master state).
 *
 * The popout's Dashboard dispatches transforms locally; we wrap each one
 * in a `popoutScope` and broadcast it to the parent so the parent's
 * single source of truth stays consistent. The parent re-broadcasts state
 * updates which we re-render against.
 */
export default function PopoutPanelHost({
  components,
  editMode = true,
  hydrateOptions,
  storage: storageProp,
}: PopoutPanelHostProps): JSX.Element {
  const { popoutId, layoutKey } = useMemo(getQueryParams, []);
  const storage = useMemo(() => {
    if (storageProp !== undefined) return storageProp;
    if (layoutKey == null) return null;
    return getDefaultStorage(layoutKey);
  }, [storageProp, layoutKey]);

  const bridgeRef = useRef<PopoutBridge | null>(null);
  if (layoutKey != null && bridgeRef.current == null) {
    bridgeRef.current = new PopoutBridge(layoutKey);
  }

  /**
   * Wall-clock time of the most recent parent-originated message. Initial
   * value is `now()` so we don't immediately time out before the parent
   * has had a chance to send its first heartbeat.
   */
  const lastParentContactRef = useRef<number>(Date.now());

  // local view of this popout's layout — kept in sync with the parent via
  // the bridge. Initial value comes from parent's storage.
  const [popoutLayout, setPopoutLayout] = useState<LayoutNode | null>(() => {
    if (popoutId == null || layoutKey == null) return null;
    const master = readMaster(storage, layoutKey, hydrateOptions);
    if (master == null) return null;
    const resolved = resolveLayout(master);
    return resolved.popouts[popoutId]?.layout ?? null;
  });

  // listen for parent's state broadcasts and refresh our view
  useEffect(() => {
    const bridge = bridgeRef.current;
    if (bridge == null || popoutId == null) return undefined;

    // Announce ourselves so a freshly-mounted parent (e.g. just refreshed)
    // knows we're already open and can skip re-opening our window.
    bridge.send({ type: 'popoutAlive', panelId: popoutId });

    return bridge.subscribe((msg: PopoutMessage) => {
      // Only parent-originated messages count as liveness contact —
      // sibling popouts also chatter on this channel and shouldn't
      // mask a dead parent.
      if (
        msg.type === 'state' ||
        msg.type === 'heartbeat' ||
        msg.type === 'discoverPopouts'
      ) {
        lastParentContactRef.current = Date.now();
      }
      if (msg.type === 'discoverPopouts') {
        bridge.send({ type: 'popoutAlive', panelId: popoutId });
        return;
      }
      if (msg.type === 'state') {
        try {
          const hydrated = hydrate(msg.state, hydrateOptions);
          const resolved = resolveLayout(hydrated);
          const next = resolved.popouts[popoutId]?.layout ?? null;
          setPopoutLayout(next);
          if (next == null) {
            // our entry is gone — parent dropped us. Close the window.
            window.close();
          }
        } catch (e) {
          log.warn('Failed to apply state broadcast:', e);
        }
      }
    });
  }, [popoutId, hydrateOptions]);

  // Close ourselves if the parent stops broadcasting. Distinguishes a
  // refresh (brief gap, new parent picks up heartbeat) from a real close
  // (no new heartbeat ever arrives).
  useEffect(() => {
    if (popoutId == null) return undefined;
    const handle = window.setInterval(() => {
      if (
        Date.now() - lastParentContactRef.current >
        PARENT_SILENCE_TIMEOUT_MS
      ) {
        log.debug('Parent silent — closing popout window.');
        window.close();
      }
    }, PARENT_LIVENESS_POLL_MS);
    return () => window.clearInterval(handle);
  }, [popoutId]);

  // poll our own window position; broadcast changes so parent persists
  // them. We can't listen for "move" events directly.
  useEffect(() => {
    if (popoutId == null) return undefined;
    const bridge = bridgeRef.current;
    if (bridge == null) return undefined;
    let lastX = window.screenX;
    let lastY = window.screenY;
    let lastW = window.outerWidth;
    let lastH = window.outerHeight;
    const handle = window.setInterval(() => {
      const x = window.screenX;
      const y = window.screenY;
      const w = window.outerWidth;
      const h = window.outerHeight;
      if (x !== lastX || y !== lastY || w !== lastW || h !== lastH) {
        lastX = x;
        lastY = y;
        lastW = w;
        lastH = h;
        bridge.send({
          type: 'updateGeometry',
          panelId: popoutId,
          screenX: x,
          screenY: y,
          width: w,
          height: h,
        });
      }
    }, GEOMETRY_POLL_MS);
    return () => window.clearInterval(handle);
  }, [popoutId]);

  // notify the parent on close so the entry can be dropped immediately
  useEffect(() => {
    if (popoutId == null) return undefined;
    const bridge = bridgeRef.current;
    if (bridge == null) return undefined;
    const handler = (): void => {
      bridge.send({ type: 'closePopout', panelId: popoutId });
    };
    window.addEventListener('beforeunload', handler);
    return () => window.removeEventListener('beforeunload', handler);
  }, [popoutId]);

  useEffect(
    () => () => {
      bridgeRef.current?.close();
      bridgeRef.current = null;
    },
    []
  );

  // Build a LayoutState for the popout's Dashboard. The Dashboard wants a
  // { initial, transforms } shape; we treat each broadcast as a fresh
  // baseline and dispatch transforms upward via the bridge.
  const dashboardLayout: LayoutState | null = useMemo(
    () =>
      popoutLayout != null ? { initial: popoutLayout, transforms: [] } : null,
    [popoutLayout]
  );

  const handleChange = useCallback(
    (_next: LayoutState, transform: Transform) => {
      const bridge = bridgeRef.current;
      if (bridge == null || popoutId == null) return;
      // forward as a popoutScope transform on the parent's master state
      const wrapped: Transform = {
        kind: 'popoutScope',
        popoutId,
        inner: transform,
      };
      bridge.send({ type: 'transform', transform: wrapped });
    },
    [popoutId]
  );

  if (popoutId == null || layoutKey == null) {
    return (
      <div className="dh-layout-popout-error">
        Missing popout parameters in URL.
      </div>
    );
  }

  if (dashboardLayout == null) {
    return (
      <div className="dh-layout-popout-error">
        Could not find popout “{popoutId}” in shared layout state.
      </div>
    );
  }

  return (
    <div className="dh-layout-popout-host">
      <Dashboard
        layout={dashboardLayout}
        components={components}
        onChange={handleChange}
        editMode={editMode}
        layoutKey={layoutKey}
        windowId={popoutId}
      />
    </div>
  );
}
