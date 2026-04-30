/* eslint-disable react-refresh/only-export-components */
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
} from 'react';
import type { ReactNode } from 'react';
import Log from '@deephaven/log';
import type {
  LayoutState,
  NodeId,
  PopoutEntry,
  PopoutGeometry,
  Transform,
} from '../types';
import { dehydrate } from '../state/hydrate';
import PopoutBridge from './PopoutBridge';
import { openPopoutWindow } from './openPopoutWindow';

const log = Log.module('@deephaven/layout/PopoutController');

export interface PopoutControllerValue {
  /** Storage key shared with all child windows. Null if popouts are disabled. */
  layoutKey: string | null;
  /**
   * Identifier for this window. `null` for the top-level / parent window;
   * the popoutId for a popout window. Used by cross-window drag to route
   * messages and decide which transform variant to dispatch on drop.
   */
  windowId: NodeId | null;
  /** BroadcastChannel bridge, or null if disabled. */
  bridge: PopoutBridge | null;
  /**
   * Open a popout window synchronously and dispatch the popoutPanel
   * transform. Must be called from a user-gesture handler (e.g. dragend)
   * to avoid the browser downgrading the popup to a regular tab.
   * Returns false if popouts are disabled.
   */
  openPopout: (panelId: NodeId, geometry: PopoutGeometry) => boolean;
}

const PopoutControllerContext = createContext<PopoutControllerValue>({
  layoutKey: null,
  windowId: null,
  bridge: null,
  openPopout: () => false,
});

export function usePopoutController(): PopoutControllerValue {
  return useContext(PopoutControllerContext);
}

export interface PopoutControllerProps {
  /**
   * Storage key the parent dashboard persists to. Used to namespace the
   * BroadcastChannel and to construct child-window URLs. Pass null/undefined
   * to disable the popout subsystem entirely (e.g. for nested dashboards).
   */
  layoutKey: string | null | undefined;
  /**
   * The full master state. Broadcast on every change so child windows can
   * keep their dashboards in sync with the source-of-truth state.
   */
  state: LayoutState;
  /** Current popouts map from `resolveLayout(state).popouts`. */
  popouts: Record<NodeId, PopoutEntry>;
  /** Dispatch transforms back into the parent state. */
  dispatch: (transform: Transform) => void;
  /**
   * `null` for the parent window (default); the popoutId for a popout
   * window. When non-null, the controller skips parent-only
   * responsibilities (managing child windows, broadcasting state).
   */
  windowId?: NodeId | null;
  children: ReactNode;
}

/**
 * Sits on a Dashboard and reconciles the in-state `popouts` map with live
 * child windows: opens windows for new entries (called synchronously from
 * the drag-end handler so the browser keeps popup-blocker context),
 * closes windows for removed entries, and listens for cross-window state
 * updates over BroadcastChannel.
 */
export default function PopoutController({
  layoutKey,
  state,
  popouts,
  dispatch,
  windowId = null,
  children,
}: PopoutControllerProps): JSX.Element {
  const enabled = layoutKey != null && layoutKey !== '';
  const isParent = windowId == null;

  const bridgeRef = useRef<PopoutBridge | null>(null);
  if (enabled && bridgeRef.current == null) {
    bridgeRef.current = new PopoutBridge(layoutKey);
  }

  const dispatchRef = useRef(dispatch);
  dispatchRef.current = dispatch;

  const layoutKeyRef = useRef<string | null | undefined>(layoutKey);
  layoutKeyRef.current = layoutKey;

  const childWindowsRef = useRef<Map<NodeId, Window>>(new Map());

  // (parent only) listen for child → parent messages
  useEffect(() => {
    if (!isParent) return undefined;
    const bridge = bridgeRef.current;
    if (bridge == null) return undefined;
    return bridge.subscribe(msg => {
      if (msg.type === 'panelState') {
        dispatchRef.current({
          kind: 'updatePanelState',
          panelId: msg.panelId,
          state: msg.state,
        });
      } else if (msg.type === 'updateGeometry') {
        dispatchRef.current({
          kind: 'updatePopoutGeometry',
          panelId: msg.panelId,
          geometry: {
            screenX: msg.screenX,
            screenY: msg.screenY,
            width: msg.width,
            height: msg.height,
          },
        });
      } else if (msg.type === 'closePopout') {
        dispatchRef.current({ kind: 'closePopoutPanel', panelId: msg.panelId });
      } else if (msg.type === 'transform') {
        // a popout asked the parent to apply a transform on its behalf.
        // The popout has already wrapped any tree changes in popoutScope.
        dispatchRef.current(msg.transform);
      }
    });
  }, [isParent]);

  // (parent only) broadcast the master state on every change so popouts
  // can re-render their views.
  useEffect(() => {
    if (!isParent) return;
    const bridge = bridgeRef.current;
    if (bridge == null) return;
    try {
      bridge.send({ type: 'state', state: dehydrate(state) });
    } catch (e) {
      log.warn('Failed to broadcast state to popouts:', e);
    }
  }, [isParent, state]);

  /**
   * Synchronous popout opener for the dragend code path. Calling
   * window.open inside the user-gesture handler is required for the
   * browser to honour popup mode (otherwise modern Chrome opens the URL
   * as a regular tab with full URL bar).
   */
  const openPopout = useCallback(
    (panelId: NodeId, geometry: PopoutGeometry): boolean => {
      const key = layoutKeyRef.current;
      if (key == null || key === '') return false;
      const child = openPopoutWindow({ panelId, layoutKey: key, geometry });
      if (child != null) {
        childWindowsRef.current.set(panelId, child);
      }
      dispatchRef.current({ kind: 'popoutPanel', panelId, geometry });
      return true;
    },
    []
  );

  // (parent only) reconcile open windows with popouts entries. A popout
  // can't manage child windows of its own.
  useEffect(() => {
    if (!enabled || !isParent) return;
    const open = childWindowsRef.current;
    const seen = new Set<NodeId>();

    Object.entries(popouts).forEach(([panelId, entry]) => {
      seen.add(panelId);
      const existing = open.get(panelId);
      if (existing != null && !existing.closed) return;
      const child = openPopoutWindow({
        panelId,
        layoutKey: layoutKey as string,
        geometry: entry.geometry,
      });
      if (child != null) open.set(panelId, child);
    });

    Array.from(open.entries()).forEach(([panelId, child]) => {
      if (seen.has(panelId)) return;
      if (!child.closed) {
        try {
          child.close();
        } catch {
          /* ignore */
        }
      }
      open.delete(panelId);
    });
  }, [popouts, enabled, isParent, layoutKey]);

  // (parent only) poll for child windows the user closed manually so we
  // can drop their entries from state.
  useEffect(() => {
    if (!enabled || !isParent) return undefined;
    const handle = window.setInterval(() => {
      const open = childWindowsRef.current;
      Array.from(open.entries()).forEach(([panelId, child]) => {
        if (child.closed) {
          open.delete(panelId);
          dispatchRef.current({ kind: 'closePopoutPanel', panelId });
        }
      });
    }, 1000);
    return () => window.clearInterval(handle);
  }, [enabled, isParent]);

  useEffect(
    () => () => {
      bridgeRef.current?.close();
      bridgeRef.current = null;
    },
    []
  );

  const value = useMemo<PopoutControllerValue>(
    () => ({
      layoutKey: enabled ? (layoutKey as string) : null,
      windowId,
      bridge: bridgeRef.current,
      openPopout,
    }),
    [enabled, layoutKey, windowId, openPopout]
  );

  return (
    <PopoutControllerContext.Provider value={value}>
      {children}
    </PopoutControllerContext.Provider>
  );
}
