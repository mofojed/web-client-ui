import type { NodeId } from '../types';

/**
 * Custom MIME type written to dataTransfer on dragstart so we can recognize
 * our own drags (and ignore unrelated drags like file drops or text
 * selections from elsewhere on the page).
 *
 * Per spec, custom MIME types must be all lowercase.
 */
export const DRAG_MIME = 'application/x-deephaven-panel';

export interface PanelDragPayload {
  panelId: NodeId;
  stackId: NodeId | null;
  index: number;
}

/**
 * Identify a dragstart originating from a panel tab by reading data-*
 * attributes off the event's target. We deliberately don't rely on
 * dataTransfer.types here because the tab's own onDragStart (which calls
 * setData) is a React synthetic handler that runs *after* the dashboard's
 * native dragstart listener — so dataTransfer is still empty when we look.
 * The data attributes on the tab DOM are populated by render and are
 * always present.
 */
export function parsePanelDragPayload(
  event: DragEvent
): PanelDragPayload | null {
  const target = event.target as Element | null;
  if (target == null) return null;
  const tabEl = target.closest('[data-panel-id]') as HTMLElement | null;
  if (tabEl == null) return null;
  const panelId = tabEl.getAttribute('data-panel-id');
  if (panelId == null) return null;
  const stackEl = tabEl.closest('[data-stack-id]') as HTMLElement | null;
  const stackId = stackEl?.getAttribute('data-stack-id') ?? null;
  const indexAttr = tabEl.getAttribute('data-panel-index');
  const index = indexAttr != null ? Number(indexAttr) : 0;
  return { panelId, stackId, index: Number.isFinite(index) ? index : 0 };
}

/**
 * Initialize a tab `dragstart` event: set the custom MIME type, choose the
 * effect, and set a custom drag image so the OS-rendered ghost matches the
 * tab being dragged. The drag image is captured at this moment and cannot
 * be updated mid-drag, so build it before calling.
 */
export function startPanelDrag(
  event: DragEvent,
  payload: PanelDragPayload,
  dragImage?: HTMLElement,
  dragImageOffset?: { x: number; y: number }
): void {
  const dt = event.dataTransfer;
  if (dt == null) return;
  dt.effectAllowed = 'move';
  // Per HTML5 spec, getData() during dragstart returns empty for security.
  // We still write the MIME so the type appears in `types` during dragover.
  try {
    dt.setData(DRAG_MIME, JSON.stringify(payload));
  } catch {
    // some browsers (Safari pre-15) reject custom mime types — fall through;
    // the `types` array still contains DRAG_MIME for downstream checks
  }
  if (dragImage != null && typeof dt.setDragImage === 'function') {
    const offset = dragImageOffset ?? { x: 16, y: 16 };
    dt.setDragImage(dragImage, offset.x, offset.y);
  }
}
