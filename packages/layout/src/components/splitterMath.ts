import type { NodeId } from '../types';

export interface SplitterDragState {
  /** The pointer coordinate at the moment drag started. */
  startCoord: number;
  /** Pixel size of the parent container along the relevant axis. */
  parentSize: number;
  /** Pixel size of the sibling immediately before the splitter at drag start. */
  prevPixel: number;
  /** Pixel size of the sibling immediately after the splitter at drag start. */
  nextPixel: number;
  /** All siblings' fractional sizes captured at drag start, including prev/next. */
  initialFractions: Record<NodeId, number>;
  prevId: NodeId;
  nextId: NodeId;
  prevMinSize: number;
  nextMinSize: number;
}

export interface SplitterDragResult {
  fractions: Record<NodeId, number>;
  prevPixel: number;
  nextPixel: number;
}

/**
 * Given the drag state and the current pointer coordinate, return the new
 * fractional sizes for each sibling and the new pixel sizes of the prev/next
 * pair (handy for live DOM-style preview if a consumer prefers that).
 */
export function computeSplitterSizes(
  drag: SplitterDragState,
  currentCoord: number
): SplitterDragResult {
  const delta = currentCoord - drag.startCoord;

  let newPrev = drag.prevPixel + delta;
  let newNext = drag.nextPixel - delta;
  const total = drag.prevPixel + drag.nextPixel;

  if (newPrev < drag.prevMinSize) {
    newPrev = drag.prevMinSize;
    newNext = total - newPrev;
  }
  if (newNext < drag.nextMinSize) {
    newNext = drag.nextMinSize;
    newPrev = total - newNext;
  }

  const fractions: Record<NodeId, number> = { ...drag.initialFractions };
  fractions[drag.prevId] = newPrev / drag.parentSize;
  fractions[drag.nextId] = newNext / drag.parentSize;

  return { fractions, prevPixel: newPrev, nextPixel: newNext };
}
