import {
  DndContext,
  DragOverlay,
  KeyboardSensor,
  PointerSensor,
  pointerWithin,
  useSensor,
  useSensors,
  type DragCancelEvent,
  type DragEndEvent,
  type DragMoveEvent,
  type DragStartEvent,
} from '@dnd-kit/core';
import type { ReactNode, RefObject } from 'react';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { DropTarget, NodeId, Transform } from '../types';
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
import {
  isPanelDraggableId,
  isStackDroppableId,
  panelIdFromDraggable,
  stackIdFromDroppable,
} from './ids';
import OuterEdgeIndicator from './OuterEdgeIndicator';

const OUTER_BAND_PX = 16;

function buildDropTarget(
  hover: DragHover,
  sourceStackId: NodeId | null,
  sourcePanelIndex: number | null,
  getStackChildCount: (id: NodeId) => number
): DropTarget {
  if (hover.kind === 'outerEdge') {
    return { type: 'sibling', nodeId: hover.rootId, side: hover.side };
  }
  if (hover.zone !== 'center') {
    return { type: 'sibling', nodeId: hover.stackId, side: hover.zone };
  }
  let index = hover.insertIndex ?? getStackChildCount(hover.stackId);
  // when reordering within the source stack, the reducer removes first then
  // inserts. shift the index down by 1 if the source sat before our drop
  // position so the panel lands where the user pointed.
  if (
    sourceStackId === hover.stackId &&
    sourcePanelIndex !== null &&
    sourcePanelIndex < index
  ) {
    index -= 1;
  }
  return { type: 'stack', stackId: hover.stackId, index };
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
  /** Render the dragged panel's tab in the drag overlay. */
  renderGhost?: (panelId: NodeId) => ReactNode;
  /** Ref to the dashboard container — used to compute outer-edge hotspots. */
  dashboardRef: RefObject<HTMLElement>;
  /** Resolved root node id, used as the target of outer-edge splits. */
  rootNodeId: NodeId;
}

export default function DragLayer({
  children,
  enabled,
  dispatch,
  getStackChildCount,
  renderGhost,
  dashboardRef,
  rootNodeId,
}: DragLayerProps): JSX.Element {
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 4 },
    }),
    useSensor(KeyboardSensor)
  );

  const [activePanelId, setActivePanelId] = useState<NodeId | null>(null);
  const [sourceStackId, setSourceStackId] = useState<NodeId | null>(null);
  const [sourcePanelIndex, setSourcePanelIndex] = useState<number | null>(null);
  const [hover, setHover] = useState<DragHover | null>(null);

  const pointerRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });
  useEffect(() => {
    if (activePanelId == null) return undefined;
    const handleMove = (e: PointerEvent): void => {
      pointerRef.current = { x: e.clientX, y: e.clientY };
    };
    window.addEventListener('pointermove', handleMove);
    return () => window.removeEventListener('pointermove', handleMove);
  }, [activePanelId]);

  useEffect(() => {
    if (activePanelId == null) return undefined;
    const handleKey = (e: KeyboardEvent): void => {
      if (e.key === 'Escape') {
        setActivePanelId(null);
        setSourceStackId(null);
        setSourcePanelIndex(null);
        setHover(null);
      }
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [activePanelId]);

  const handleDragStart = useCallback((event: DragStartEvent) => {
    const id = String(event.active.id);
    if (!isPanelDraggableId(id)) return;
    setActivePanelId(panelIdFromDraggable(id));
    const sourceData = event.active.data.current as
      | { stackId?: NodeId; index?: number }
      | undefined;
    setSourceStackId(sourceData?.stackId ?? null);
    setSourcePanelIndex(
      typeof sourceData?.index === 'number' ? sourceData.index : null
    );
    setHover(null);
  }, []);

  const handleDragMove = useCallback(
    (event: DragMoveEvent) => {
      const pointer = pointerRef.current;

      // 1. outer edge hotspots take priority — close to the dashboard's
      //    outer edge means a root-level split regardless of which panel is
      //    underneath
      const dashboardEl = dashboardRef.current;
      if (dashboardEl != null) {
        const dashboardRect = dashboardEl.getBoundingClientRect();
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
            return { kind: 'outerEdge', rootId: rootNodeId, side: outer };
          });
          return;
        }
      }

      if (event.over == null) {
        setHover(null);
        return;
      }
      const overId = String(event.over.id);
      if (!isStackDroppableId(overId)) return;
      const stackId = stackIdFromDroppable(overId);

      // 2. tab strip → join stack at the precise insertion index. allowed
      //    even on the source stack (intra-stack reorder).
      const stackEl = document.querySelector(`[data-stack-id="${stackId}"]`);
      const tabsEl = stackEl?.querySelector('.dh-layout-tabs');
      if (tabsEl != null) {
        const tabsRect = tabsEl.getBoundingClientRect();
        if (
          pointer.x >= tabsRect.left &&
          pointer.x <= tabsRect.right &&
          pointer.y >= tabsRect.top &&
          pointer.y <= tabsRect.bottom
        ) {
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

      // 3. body drops on the source stack are suppressed — the body is
      //    where 5-zone hotspots live and dropping a panel back into its
      //    own body is a no-op
      if (stackId === sourceStackId) {
        setHover(null);
        return;
      }

      // 4. fall back to the geometric 5-zone hotspot inside the stack rect
      const { rect } = event.over;
      const zone: DropZone = computeDropZone(
        {
          left: rect.left,
          top: rect.top,
          width: rect.width,
          height: rect.height,
        },
        pointer
      );
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
    [dashboardRef, rootNodeId, sourceStackId]
  );

  const handleDragEnd = useCallback(
    (event: DragEndEvent) => {
      const id = String(event.active.id);
      if (isPanelDraggableId(id) && hover != null) {
        const panelId = panelIdFromDraggable(id);
        const target = buildDropTarget(
          hover,
          sourceStackId,
          sourcePanelIndex,
          getStackChildCount
        );
        dispatch({ kind: 'movePanel', panelId, target });
      }
      setActivePanelId(null);
      setSourceStackId(null);
      setSourcePanelIndex(null);
      setHover(null);
    },
    [hover, sourceStackId, sourcePanelIndex, dispatch, getStackChildCount]
  );

  const handleDragCancel = useCallback((_event: DragCancelEvent) => {
    setActivePanelId(null);
    setSourceStackId(null);
    setSourcePanelIndex(null);
    setHover(null);
  }, []);

  const contextValue = useMemo<DragContextValue>(
    () => ({ activePanelId, sourceStackId, hover }),
    [activePanelId, sourceStackId, hover]
  );

  const outerHover = hover?.kind === 'outerEdge' ? hover : null;

  if (!enabled) {
    return (
      <DragContext.Provider value={contextValue}>
        {children}
      </DragContext.Provider>
    );
  }

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={pointerWithin}
      onDragStart={handleDragStart}
      onDragMove={handleDragMove}
      onDragEnd={handleDragEnd}
      onDragCancel={handleDragCancel}
    >
      <DragContext.Provider value={contextValue}>
        {children}
        {outerHover != null && <OuterEdgeIndicator side={outerHover.side} />}
      </DragContext.Provider>
      <DragOverlay dropAnimation={null}>
        {activePanelId != null && renderGhost != null
          ? renderGhost(activePanelId)
          : null}
      </DragOverlay>
    </DndContext>
  );
}
