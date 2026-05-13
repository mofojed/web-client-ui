import type { ReactNode, RefObject } from 'react';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type {
  DropTarget,
  NodeId,
  PanelNode,
  PopoutGeometry,
  Transform,
} from '../types';
import DragContext, {
  type DragContextValue,
  type DragHover,
} from './DragContext';
import {
  computeDropZone,
  computeOuterEdge,
  computeTabInsertIndex,
  type DropZone,
} from './dropZone';
import OuterEdgeIndicator from './OuterEdgeIndicator';
import PopoutPendingIndicator from './PopoutPendingIndicator';
import { parsePanelDragPayload } from './htmlDrag';
import { usePopoutController } from '../popout/PopoutController';

const OUTER_BAND_PX = 24;
const POPOUT_DEFAULT_WIDTH = 800;
const POPOUT_DEFAULT_HEIGHT = 600;

function buildDropTarget(
  hover: DragHover,
  sourceStackId: NodeId | null,
  sourcePanelIndex: number | null,
  getStackChildCount: (id: NodeId) => number
): DropTarget {
  if (hover.kind === 'outerEdge') {
    return { type: 'rootSibling', side: hover.side };
  }
  if (hover.zone !== 'center') {
    return { type: 'sibling', nodeId: hover.stackId, side: hover.zone };
  }
  let index = hover.insertIndex ?? getStackChildCount(hover.stackId);
  if (
    sourceStackId === hover.stackId &&
    sourcePanelIndex !== null &&
    sourcePanelIndex < index
  ) {
    index -= 1;
  }
  return { type: 'stack', stackId: hover.stackId, index };
}

/** Is the given pointer position outside the browser's viewport? */
function isOutsideViewport(clientX: number, clientY: number): boolean {
  return (
    clientX < 0 ||
    clientY < 0 ||
    clientX > window.innerWidth ||
    clientY > window.innerHeight
  );
}

export interface DragLayerProps {
  children: ReactNode;
  /** Whether DnD is enabled. When false, this is a passthrough wrapper. */
  enabled: boolean;
  dispatch: (transform: Transform) => void;
  /**
   * Lookup the current panel count of a stack. Used to compute the drop
   * index when the drop lands on a stack center without a tab-strip insert
   * position (the panel appends at the end).
   */
  getStackChildCount: (stackId: NodeId) => number;
  /**
   * Lookup the full PanelNode (component, state, title) for a given id.
   * Used at dragstart to broadcast panel data to other windows for
   * cross-window drag.
   */
  getPanel: (panelId: NodeId) => PanelNode | null;
  /** Ref to the dashboard container — used to compute outer-edge hotspots. */
  dashboardRef: RefObject<HTMLElement>;
}

/**
 * Wraps the dashboard with HTML5 native drag-and-drop event listeners.
 * Listens at the document level (not just the dashboard) so that motion
 * outside the dashboard — toolbar, viewport edge, beyond — can drive the
 * popout-pending state.
 *
 * Decision rules:
 *   - Pointer inside the dashboard rect → compute hover (outerEdge or
 *     stackZone). Edge-split lives in `OUTER_BAND_PX` of the inside edge.
 *   - Pointer outside the dashboard rect but inside the viewport → no
 *     in-window indicator and no popout indicator. The user is hovering
 *     over chrome/whitespace; we wait for them to commit.
 *   - Pointer outside the viewport → popout pending; show the
 *     full-viewport orange marching-ants frame.
 *
 * At dragend:
 *   - If hover is set (i.e. the cursor was over a valid in-dashboard
 *     target on the last dragover), dispatch movePanel.
 *   - Else if drop landed outside the viewport, dispatch popoutPanel.
 *   - Else: no-op (drop on dashboard chrome with no specific target).
 */
export default function DragLayer({
  children,
  enabled,
  dispatch,
  getStackChildCount,
  getPanel,
  dashboardRef,
}: DragLayerProps): JSX.Element {
  const [activePanelId, setActivePanelId] = useState<NodeId | null>(null);
  const [sourceStackId, setSourceStackId] = useState<NodeId | null>(null);
  const [sourcePanelIndex, setSourcePanelIndex] = useState<number | null>(null);
  const [hover, setHover] = useState<DragHover | null>(null);
  const [popoutPending, setPopoutPending] = useState(false);

  const activePanelIdRef = useRef<NodeId | null>(null);
  activePanelIdRef.current = activePanelId;
  const sourceStackIdRef = useRef<NodeId | null>(null);
  sourceStackIdRef.current = sourceStackId;
  const sourcePanelIndexRef = useRef<number | null>(null);
  sourcePanelIndexRef.current = sourcePanelIndex;
  const hoverRef = useRef<DragHover | null>(null);
  hoverRef.current = hover;
  const popoutPendingRef = useRef(false);
  popoutPendingRef.current = popoutPending;

  const dispatchRef = useRef(dispatch);
  dispatchRef.current = dispatch;
  const getStackChildCountRef = useRef(getStackChildCount);
  getStackChildCountRef.current = getStackChildCount;
  const getPanelRef = useRef(getPanel);
  getPanelRef.current = getPanel;

  const { openPopout, bridge, windowId } = usePopoutController();
  const openPopoutRef = useRef(openPopout);
  openPopoutRef.current = openPopout;
  const bridgeRef = useRef(bridge);
  bridgeRef.current = bridge;
  const windowIdRef = useRef(windowId);
  windowIdRef.current = windowId;

  const lastClientRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });

  // Cross-window drag state. When another window broadcasts crossDragStart,
  // we record it here. On dragenter, if the cursor enters our viewport
  // while a remote drag is registered, we adopt it as a local drag (so
  // hover indicators update and a drop event will fire).
  const remoteDragRef = useRef<{
    panel: PanelNode;
    sourceWindowId: NodeId | null;
  } | null>(null);
  // True after a drop in this window dispatched addPanel for a remote
  // drag. We use this to ignore the source's eventual dragend (the
  // crossDragComplete broadcast handles cleanup separately).
  const dropAcceptedRef = useRef(false);
  // True after we received crossDragComplete for our local drag, meaning
  // another window accepted the drop. Source's dragend reads this to
  // dispatch closePanel (or popoutScope(closePanel)) instead of movePanel.
  const remoteAcceptedRef = useRef(false);
  // Sticky flag set when the user presses Esc mid-drag. Subsequent
  // dragover/dragleave/dragend events check this so the drag visually
  // stops responding and no transform is dispatched, even though the
  // native drag continues until the user releases the mouse.
  const cancelledRef = useRef(false);

  const resetDragState = useCallback(() => {
    setActivePanelId(null);
    setSourceStackId(null);
    setSourcePanelIndex(null);
    setHover(null);
    setPopoutPending(false);
    remoteDragRef.current = null;
    dropAcceptedRef.current = false;
    remoteAcceptedRef.current = false;
    cancelledRef.current = false;
  }, []);

  // dragstart fires from a tab. We identify our own drags by reading data-*
  // attributes off the target — dataTransfer.types isn't reliable here
  // because the tab's React onDragStart (which calls setData) runs after
  // this native bubble-phase listener. Also broadcast the panel data over
  // the bridge so other windows can adopt this drag if the cursor enters.
  const handleDragStart = useCallback((event: DragEvent) => {
    const payload = parsePanelDragPayload(event);
    if (payload == null) return;
    setActivePanelId(payload.panelId);
    setSourceStackId(payload.stackId);
    setSourcePanelIndex(payload.index);
    setHover(null);
    setPopoutPending(false);
    remoteAcceptedRef.current = false;
    cancelledRef.current = false;

    const panel = getPanelRef.current(payload.panelId);
    if (panel != null && bridgeRef.current != null) {
      bridgeRef.current.send({
        type: 'crossDragStart',
        sourceWindowId: windowIdRef.current,
        panel,
      });
    }
  }, []);

  const handleDragOver = useCallback(
    (event: DragEvent) => {
      if (activePanelIdRef.current == null) return;
      // After Esc, refuse the drop so the OS shows a "not allowed" cursor
      // and stop updating any indicators. The native drag continues until
      // the user releases the mouse; dragend then short-circuits cleanly.
      if (cancelledRef.current) {
        setHover(null);
        setPopoutPending(false);
        return;
      }
      // accept the drag so dropEffect/cursor render correctly
      event.preventDefault();
      const dt = event.dataTransfer;
      if (dt != null) {
        dt.dropEffect = 'move';
      }

      const pointer = { x: event.clientX, y: event.clientY };
      lastClientRef.current = pointer;

      // outside the viewport → popout pending; clear hover.
      if (isOutsideViewport(pointer.x, pointer.y)) {
        setHover(null);
        setPopoutPending(true);
        return;
      }

      const dashboardEl = dashboardRef.current;
      if (dashboardEl == null) {
        setHover(null);
        setPopoutPending(false);
        return;
      }
      const dashboardRect = dashboardEl.getBoundingClientRect();
      const insideDashboard =
        pointer.x >= dashboardRect.left &&
        pointer.x <= dashboardRect.left + dashboardRect.width &&
        pointer.y >= dashboardRect.top &&
        pointer.y <= dashboardRect.top + dashboardRect.height;

      // outside dashboard but still inside the viewport → ambiguous. No
      // in-window indicator, no popout indicator. Wait for the user to
      // commit by either re-entering or leaving the viewport entirely.
      if (!insideDashboard) {
        setHover(null);
        setPopoutPending(false);
        return;
      }

      setPopoutPending(false);

      // 1. outer-edge band → root-level split
      const outer = computeOuterEdge(
        {
          left: dashboardRect.left,
          top: dashboardRect.top,
          width: dashboardRect.width,
          height: dashboardRect.height,
        },
        pointer,
        OUTER_BAND_PX
      );
      if (outer != null) {
        setHover(prev => {
          if (
            prev != null &&
            prev.kind === 'outerEdge' &&
            prev.side === outer
          ) {
            return prev;
          }
          return { kind: 'outerEdge', side: outer };
        });
        return;
      }

      // 2. find the stack the pointer is over
      const stackEl = (event.target as Element | null)?.closest(
        '[data-stack-id]'
      ) as HTMLElement | null;
      if (stackEl == null) {
        setHover(null);
        return;
      }
      const stackId = stackEl.getAttribute('data-stack-id');
      if (stackId == null) {
        setHover(null);
        return;
      }

      // 3. tab strip → join stack at the precise insertion index
      const tabsEl = stackEl.querySelector('.dh-layout-tabs');
      if (tabsEl != null) {
        const tabsRect = tabsEl.getBoundingClientRect();
        if (
          pointer.x >= tabsRect.left &&
          pointer.x <= tabsRect.right &&
          pointer.y >= tabsRect.top &&
          pointer.y <= tabsRect.bottom
        ) {
          if (
            stackId === sourceStackIdRef.current &&
            getStackChildCountRef.current(sourceStackIdRef.current) <= 1
          ) {
            setHover(null);
            return;
          }
          const tabBounds = Array.from(
            tabsEl.querySelectorAll('.dh-layout-tab')
          ).map(el => {
            const r = el.getBoundingClientRect();
            return { left: r.left, right: r.right };
          });
          const insertIndex = computeTabInsertIndex(tabBounds, pointer.x);
          setHover(prev => {
            if (
              prev != null &&
              prev.kind === 'stackZone' &&
              prev.stackId === stackId &&
              prev.zone === 'center' &&
              prev.insertIndex === insertIndex
            ) {
              return prev;
            }
            return {
              kind: 'stackZone',
              stackId,
              zone: 'center',
              insertIndex,
            };
          });
          return;
        }
      }

      // 4. fall back to the geometric 5-zone hotspot inside the stack rect
      const stackRect = stackEl.getBoundingClientRect();
      const zone: DropZone = computeDropZone(
        {
          left: stackRect.left,
          top: stackRect.top,
          width: stackRect.width,
          height: stackRect.height,
        },
        pointer
      );

      if (stackId === sourceStackIdRef.current) {
        if (zone === 'center') {
          setHover(null);
          return;
        }
        if (getStackChildCountRef.current(sourceStackIdRef.current) <= 1) {
          setHover(null);
          return;
        }
      }

      setHover(prev => {
        if (
          prev != null &&
          prev.kind === 'stackZone' &&
          prev.stackId === stackId &&
          prev.zone === zone &&
          prev.insertIndex === undefined
        ) {
          return prev;
        }
        return { kind: 'stackZone', stackId, zone };
      });
    },
    [dashboardRef]
  );

  // dragleave on document with no relatedTarget = cursor exited the
  // viewport. dragover stops firing in that case, so this is our signal
  // to switch into popout-pending mode.
  const handleDragLeave = useCallback((event: DragEvent) => {
    if (activePanelIdRef.current == null) return;
    if (cancelledRef.current) return;
    if (event.relatedTarget == null) {
      setHover(null);
      setPopoutPending(true);
    }
  }, []);

  // dragenter fires when the OS-level drag image enters our viewport.
  // If a remote window broadcast a cross-window drag and we don't yet
  // have local drag state, adopt the remote drag here so dragover and
  // drop run normally.
  const handleDragEnter = useCallback((event: DragEvent) => {
    if (activePanelIdRef.current != null) return;
    const remote = remoteDragRef.current;
    if (remote == null) return;
    if (remote.sourceWindowId === windowIdRef.current) return;
    // adopt the remote drag — set activePanelId so dragover/drop run.
    // sourceStackId is null because the panel doesn't live in our tree.
    setActivePanelId(remote.panel.id);
    setSourceStackId(null);
    setSourcePanelIndex(null);
    setHover(null);
    setPopoutPending(false);
    // accept this dragenter so the drag cursor shows we accept it.
    event.preventDefault();
  }, []);

  // drop fires in the destination window when the user releases over a
  // dragover-accepting element. For local drags this is redundant with
  // dragend, but for cross-window drags it's the only signal that we're
  // the destination.
  const handleDrop = useCallback(
    (event: DragEvent) => {
      const remote = remoteDragRef.current;
      // only handle cross-window drops here — local drops are handled
      // by dragend's existing branches
      if (remote == null) return;
      if (remote.sourceWindowId === windowIdRef.current) return;
      event.preventDefault();
      dropAcceptedRef.current = true;

      // Decide the target: prefer the in-dashboard hover state. If hover
      // is null (drop landed somewhere ambiguous), append into the root
      // as a sibling on the right so the panel still lands somewhere.
      const target: DropTarget =
        hoverRef.current != null
          ? buildDropTarget(
              hoverRef.current,
              null,
              null,
              getStackChildCountRef.current
            )
          : { type: 'rootSibling', side: 'right' };

      // dispatch addPanel into our local layout. If we're a popout window,
      // wrap in popoutScope; the parent will apply.
      const inner: Transform = {
        kind: 'addPanel',
        panel: remote.panel,
        target,
      };
      if (windowIdRef.current != null) {
        // we're a popout — broadcast a transform to the parent for our scope
        bridgeRef.current?.send({
          type: 'transform',
          transform: {
            kind: 'popoutScope',
            popoutId: windowIdRef.current,
            inner,
          },
        });
      } else {
        // we're the parent — dispatch directly
        dispatchRef.current(inner);
      }

      // tell the source window the drop was accepted; source must remove
      // its copy of the panel.
      bridgeRef.current?.send({
        type: 'crossDragComplete',
        sourceWindowId: remote.sourceWindowId,
        panelId: remote.panel.id,
      });

      resetDragState();
    },
    [resetDragState]
  );

  const handleDragEnd = useCallback(
    (event: DragEvent) => {
      const panelId = activePanelIdRef.current;
      if (panelId == null) return;

      // Detect cancellation. During native HTML5 drag, most browsers do
      // not deliver keydown to JS — Esc is handled at the OS/browser
      // level and surfaces only as a dragend with dataTransfer.dropEffect
      // === 'none'. Treat any dropEffect=none as cancellation UNLESS
      // popoutPending is set (release outside the viewport is the user's
      // explicit popout gesture, which also has dropEffect=none because
      // no dragover ever accepted the drop).
      const dropEffect = event.dataTransfer?.dropEffect;
      const isDropAccepted = dropEffect != null && dropEffect !== 'none';
      const isCancelled =
        cancelledRef.current || (!isDropAccepted && !popoutPendingRef.current);

      if (isCancelled) {
        bridgeRef.current?.send({
          type: 'crossDragCancel',
          sourceWindowId: windowIdRef.current,
          panelId,
        });
        resetDragState();
        return;
      }

      // hover takes priority and is always synchronous — if the cursor
      // was over a valid in-window target on the last dragover, the drop
      // is in-window regardless of any cross-window flow.
      if (hoverRef.current != null) {
        const target = buildDropTarget(
          hoverRef.current,
          sourceStackIdRef.current,
          sourcePanelIndexRef.current,
          getStackChildCountRef.current
        );
        if (windowIdRef.current != null) {
          bridgeRef.current?.send({
            type: 'transform',
            transform: {
              kind: 'popoutScope',
              popoutId: windowIdRef.current,
              inner: { kind: 'movePanel', panelId, target },
            },
          });
        } else {
          dispatchRef.current({ kind: 'movePanel', panelId, target });
        }
        bridgeRef.current?.send({
          type: 'crossDragCancel',
          sourceWindowId: windowIdRef.current,
          panelId,
        });
        resetDragState();
        return;
      }

      // For the popout-pending / no-hover branch we may be racing a
      // crossDragComplete message from a destination window. The
      // BroadcastChannel delivery happens in a later microtask, after
      // dragend's synchronous handler. Defer the decision long enough for
      // the message to land. 50ms is comfortably within the browser's
      // transient activation window so window.open still works if we
      // need to spawn a popout here.
      const deferredPanelId = panelId;
      const deferredScreen = { x: event.screenX, y: event.screenY };
      const deferredPopoutPending = popoutPendingRef.current;

      window.setTimeout(() => {
        if (remoteAcceptedRef.current) {
          // a destination window accepted the cross-window drop — remove
          // our copy of the panel
          if (windowIdRef.current != null) {
            bridgeRef.current?.send({
              type: 'transform',
              transform: {
                kind: 'popoutScope',
                popoutId: windowIdRef.current,
                inner: { kind: 'closePanel', panelId: deferredPanelId },
              },
            });
          } else {
            dispatchRef.current({
              kind: 'closePanel',
              panelId: deferredPanelId,
            });
          }
        } else if (deferredPopoutPending) {
          // No remote accepted, cursor was outside our viewport. Treat as
          // a popout-creation gesture (parent only — popouts can't spawn
          // their own popouts in v1).
          if (windowIdRef.current == null) {
            const geometry: PopoutGeometry = {
              screenX: deferredScreen.x - POPOUT_DEFAULT_WIDTH / 2,
              screenY: deferredScreen.y - 16,
              width: POPOUT_DEFAULT_WIDTH,
              height: POPOUT_DEFAULT_HEIGHT,
            };
            const opened = openPopoutRef.current(deferredPanelId, geometry);
            if (!opened) {
              dispatchRef.current({
                kind: 'popoutPanel',
                panelId: deferredPanelId,
                geometry,
              });
            }
          }
        }

        bridgeRef.current?.send({
          type: 'crossDragCancel',
          sourceWindowId: windowIdRef.current,
          panelId: deferredPanelId,
        });
        resetDragState();
      }, 50);
    },
    [resetDragState]
  );

  // listen at the document level so motion across the whole page (not just
  // the dashboard) drives popout-pending state correctly.
  useEffect(() => {
    if (!enabled) return undefined;
    const dashboardEl = dashboardRef.current;
    if (dashboardEl == null) return undefined;

    // dragstart can stay on the dashboard since it always originates from a
    // tab inside this dashboard.
    dashboardEl.addEventListener('dragstart', handleDragStart);
    document.addEventListener('dragenter', handleDragEnter);
    document.addEventListener('dragover', handleDragOver);
    document.addEventListener('dragleave', handleDragLeave);
    document.addEventListener('drop', handleDrop);
    document.addEventListener('dragend', handleDragEnd);
    return () => {
      dashboardEl.removeEventListener('dragstart', handleDragStart);
      document.removeEventListener('dragenter', handleDragEnter);
      document.removeEventListener('dragover', handleDragOver);
      document.removeEventListener('dragleave', handleDragLeave);
      document.removeEventListener('drop', handleDrop);
      document.removeEventListener('dragend', handleDragEnd);
    };
  }, [
    enabled,
    dashboardRef,
    handleDragStart,
    handleDragEnter,
    handleDragOver,
    handleDragLeave,
    handleDrop,
    handleDragEnd,
  ]);

  // Subscribe to cross-window drag broadcasts. Other windows announce
  // their drags here; we latch onto the panel data so dragenter can
  // adopt it.
  useEffect(() => {
    if (!enabled) return undefined;
    const b = bridgeRef.current;
    if (b == null) return undefined;
    return b.subscribe(msg => {
      if (msg.type === 'crossDragStart') {
        if (msg.sourceWindowId === windowIdRef.current) return;
        remoteDragRef.current = {
          panel: msg.panel,
          sourceWindowId: msg.sourceWindowId,
        };
      } else if (msg.type === 'crossDragComplete') {
        // we're the source — the destination dispatched addPanel, we
        // need to remove our copy. Set the flag; dragend handles the rest.
        if (
          msg.sourceWindowId === windowIdRef.current &&
          activePanelIdRef.current === msg.panelId
        ) {
          remoteAcceptedRef.current = true;
        } else if (msg.sourceWindowId !== windowIdRef.current) {
          // a different window confirmed acceptance — clear our remote
          // drag state in case we were tracking it
          if (
            remoteDragRef.current != null &&
            remoteDragRef.current.panel.id === msg.panelId
          ) {
            remoteDragRef.current = null;
          }
        }
      } else if (msg.type === 'crossDragCancel') {
        if (msg.sourceWindowId === windowIdRef.current) return;
        // remote source cancelled. If we adopted this drag, reset our
        // local state so the next drag starts clean.
        if (
          remoteDragRef.current != null &&
          remoteDragRef.current.panel.id === msg.panelId
        ) {
          remoteDragRef.current = null;
        }
        if (activePanelIdRef.current === msg.panelId) {
          setActivePanelId(null);
          setSourceStackId(null);
          setSourcePanelIndex(null);
          setHover(null);
          setPopoutPending(false);
        }
      }
    });
  }, [enabled]);

  // Esc cancels mid-drag. We can't synchronously reset state here because
  // the native drag is still live: another dragover would immediately
  // re-arm hover/popoutPending. Instead, flip a sticky `cancelledRef` so
  // every subsequent drag event short-circuits, and clear the indicators
  // now. The actual reset runs from dragend when the user releases.
  useEffect(() => {
    if (activePanelId == null) return undefined;
    const handleKey = (e: KeyboardEvent): void => {
      if (e.key !== 'Escape') return;
      if (cancelledRef.current) return;
      e.preventDefault();
      cancelledRef.current = true;
      setHover(null);
      setPopoutPending(false);
      bridgeRef.current?.send({
        type: 'crossDragCancel',
        sourceWindowId: windowIdRef.current,
        panelId: activePanelId,
      });
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [activePanelId]);

  const contextValue = useMemo<DragContextValue>(
    () => ({ activePanelId, sourceStackId, hover, popoutPending }),
    [activePanelId, sourceStackId, hover, popoutPending]
  );

  const outerHover = hover?.kind === 'outerEdge' ? hover : null;

  return (
    <DragContext.Provider value={contextValue}>
      {children}
      {outerHover != null && <OuterEdgeIndicator side={outerHover.side} />}
      {popoutPending && <PopoutPendingIndicator />}
    </DragContext.Provider>
  );
}
