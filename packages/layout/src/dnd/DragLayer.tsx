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
import type { ReactNode } from 'react';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { DropTarget, NodeId, Transform } from '../types';
import DragContext, {
  type DragContextValue,
  type DragHover,
} from './DragContext';
import { computeDropZone, type DropZone } from './dropZone';
import {
  isPanelDraggableId,
  isStackDroppableId,
  panelIdFromDraggable,
  stackIdFromDroppable,
} from './ids';

function buildDropTarget(
  hover: DragHover,
  stackChildrenCount: number
): DropTarget {
  if (hover.zone === 'center') {
    return {
      type: 'stack',
      stackId: hover.stackId,
      index: stackChildrenCount,
    };
  }
  return {
    type: 'sibling',
    nodeId: hover.stackId,
    side: hover.zone,
  };
}

export interface DragLayerProps {
  children: ReactNode;
  /** Whether DnD is enabled. When false, this is a passthrough wrapper. */
  enabled: boolean;
  dispatch: (transform: Transform) => void;
  /**
   * Lookup the current panel count of a stack. Used to compute the drop index
   * when the drop zone is 'center' (append to stack).
   */
  getStackChildCount: (stackId: NodeId) => number;
  /** Render the dragged panel's tab in the drag overlay. */
  renderGhost?: (panelId: NodeId) => ReactNode;
}

export default function DragLayer({
  children,
  enabled,
  dispatch,
  getStackChildCount,
  renderGhost,
}: DragLayerProps): JSX.Element {
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 4 },
    }),
    useSensor(KeyboardSensor)
  );

  const [activePanelId, setActivePanelId] = useState<NodeId | null>(null);
  const [sourceStackId, setSourceStackId] = useState<NodeId | null>(null);
  const [hover, setHover] = useState<DragHover | null>(null);

  // pointer tracker — dnd-kit doesn't expose absolute pointer in onDragMove
  // reliably across sensors, so we maintain it ourselves while dragging
  const pointerRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });
  useEffect(() => {
    if (activePanelId == null) return undefined;
    const handleMove = (e: PointerEvent): void => {
      pointerRef.current = { x: e.clientX, y: e.clientY };
    };
    window.addEventListener('pointermove', handleMove);
    return () => window.removeEventListener('pointermove', handleMove);
  }, [activePanelId]);

  // global Escape to cancel — dnd-kit cancels via keyboard sensor only when
  // it's the active sensor; for pointer-driven drags we need a top-level guard
  useEffect(() => {
    if (activePanelId == null) return undefined;
    const handleKey = (e: KeyboardEvent): void => {
      if (e.key === 'Escape') {
        setActivePanelId(null);
        setSourceStackId(null);
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
      | { stackId?: NodeId }
      | undefined;
    setSourceStackId(sourceData?.stackId ?? null);
    setHover(null);
  }, []);

  const handleDragMove = useCallback(
    (event: DragMoveEvent) => {
      if (event.over == null) {
        setHover(null);
        return;
      }
      const overId = String(event.over.id);
      if (!isStackDroppableId(overId)) return;
      const stackId = stackIdFromDroppable(overId);
      // suppress all drop indicators on the source stack — dropping a panel
      // back into its own stack is either a no-op or surprising mid-drag UX
      if (stackId === sourceStackId) {
        setHover(null);
        return;
      }
      const { rect } = event.over;
      const pointer = pointerRef.current;
      let zone: DropZone = computeDropZone(
        {
          left: rect.left,
          top: rect.top,
          width: rect.width,
          height: rect.height,
        },
        pointer
      );
      // if the pointer is over the stack's tab strip, treat it as a center
      // drop (join the stack) rather than a top-edge split
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
          zone = 'center';
        }
      }
      setHover(prev => {
        if (prev && prev.stackId === stackId && prev.zone === zone) return prev;
        return { stackId, zone };
      });
    },
    [sourceStackId]
  );

  const handleDragEnd = useCallback(
    (event: DragEndEvent) => {
      const id = String(event.active.id);
      if (isPanelDraggableId(id) && hover != null) {
        const panelId = panelIdFromDraggable(id);
        const target = buildDropTarget(
          hover,
          getStackChildCount(hover.stackId)
        );
        dispatch({ kind: 'movePanel', panelId, target });
      }
      setActivePanelId(null);
      setSourceStackId(null);
      setHover(null);
    },
    [hover, dispatch, getStackChildCount]
  );

  const handleDragCancel = useCallback((_event: DragCancelEvent) => {
    setActivePanelId(null);
    setSourceStackId(null);
    setHover(null);
  }, []);

  const contextValue = useMemo<DragContextValue>(
    () => ({ activePanelId, sourceStackId, hover }),
    [activePanelId, sourceStackId, hover]
  );

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
      </DragContext.Provider>
      <DragOverlay dropAnimation={null}>
        {activePanelId != null && renderGhost != null
          ? renderGhost(activePanelId)
          : null}
      </DragOverlay>
    </DndContext>
  );
}
