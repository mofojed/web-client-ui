import type { NodeId } from '../types';

const DRAGGABLE_PANEL_PREFIX = 'panel:';
const DROPPABLE_STACK_PREFIX = 'drop:';

export function panelDraggableId(panelId: NodeId): string {
  return `${DRAGGABLE_PANEL_PREFIX}${panelId}`;
}

export function stackDroppableId(stackId: NodeId): string {
  return `${DROPPABLE_STACK_PREFIX}${stackId}`;
}

export function isPanelDraggableId(id: string): id is `panel:${string}` {
  return id.startsWith(DRAGGABLE_PANEL_PREFIX);
}

export function panelIdFromDraggable(id: string): NodeId {
  return id.slice(DRAGGABLE_PANEL_PREFIX.length);
}

export function isStackDroppableId(id: string): id is `drop:${string}` {
  return id.startsWith(DROPPABLE_STACK_PREFIX);
}

export function stackIdFromDroppable(id: string): NodeId {
  return id.slice(DROPPABLE_STACK_PREFIX.length);
}
