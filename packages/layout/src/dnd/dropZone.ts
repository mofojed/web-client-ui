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
