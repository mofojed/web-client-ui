import type { Side } from '../types';

export type DropZone = 'center' | Side;

export interface PointInRect {
  x: number;
  y: number;
}

export interface Rect {
  left: number;
  top: number;
  width: number;
  height: number;
}

/**
 * Compute the drop zone for a pointer over a target rect:
 *   - center 50% × 50% box → 'center' (join stack)
 *   - outside the center box → closest edge ('top' | 'right' | 'bottom' | 'left')
 */
export function computeDropZone(rect: Rect, pointer: PointInRect): DropZone {
  if (rect.width <= 0 || rect.height <= 0) return 'center';
  const px = (pointer.x - rect.left) / rect.width;
  const py = (pointer.y - rect.top) / rect.height;
  const CENTER_LO = 0.25;
  const CENTER_HI = 0.75;
  if (
    px >= CENTER_LO &&
    px <= CENTER_HI &&
    py >= CENTER_LO &&
    py <= CENTER_HI
  ) {
    return 'center';
  }
  const distLeft = px;
  const distRight = 1 - px;
  const distTop = py;
  const distBottom = 1 - py;
  const min = Math.min(distLeft, distRight, distTop, distBottom);
  if (min === distLeft) return 'left';
  if (min === distRight) return 'right';
  if (min === distTop) return 'top';
  return 'bottom';
}

/**
 * If `pointer` lies inside `dashboardRect` and within `band` pixels of an
 * outer edge, return that side; otherwise null. Used to detect when a drag
 * should target a root-level split rather than the panel under the pointer.
 */
export function computeOuterEdge(
  dashboardRect: Rect,
  pointer: PointInRect,
  band: number
): Side | null {
  const right = dashboardRect.left + dashboardRect.width;
  const bottom = dashboardRect.top + dashboardRect.height;
  const dxLeft = pointer.x - dashboardRect.left;
  const dxRight = right - pointer.x;
  const dyTop = pointer.y - dashboardRect.top;
  const dyBottom = bottom - pointer.y;
  if (dxLeft < 0 || dxRight < 0 || dyTop < 0 || dyBottom < 0) return null;
  const min = Math.min(dxLeft, dxRight, dyTop, dyBottom);
  if (min > band) return null;
  if (min === dxLeft) return 'left';
  if (min === dxRight) return 'right';
  if (min === dyTop) return 'top';
  return 'bottom';
}

/**
 * Given the bounding rects of each tab in a stack's tab strip, return the
 * insertion index for `pointerX` — i.e. the position before which a panel
 * dropped at `pointerX` should land. `tabBounds.length` means "after the
 * last tab".
 */
export function computeTabInsertIndex(
  tabBounds: ReadonlyArray<{ left: number; right: number }>,
  pointerX: number
): number {
  for (let i = 0; i < tabBounds.length; i += 1) {
    const t = tabBounds[i];
    const mid = (t.left + t.right) / 2;
    if (pointerX < mid) return i;
  }
  return tabBounds.length;
}

/**
 * Returns CSS positioning for a drop indicator covering the target zone of
 * a rect. Coordinates are percentages of the parent.
 */
export function dropIndicatorRect(zone: DropZone): {
  top: string;
  left: string;
  right: string;
  bottom: string;
} {
  switch (zone) {
    case 'center':
      return { top: '0', left: '0', right: '0', bottom: '0' };
    case 'top':
      return { top: '0', left: '0', right: '0', bottom: '50%' };
    case 'bottom':
      return { top: '50%', left: '0', right: '0', bottom: '0' };
    case 'left':
      return { top: '0', left: '0', right: '50%', bottom: '0' };
    case 'right':
      return { top: '0', left: '50%', right: '0', bottom: '0' };
    default: {
      const exhaustive: never = zone;
      return exhaustive;
    }
  }
}
