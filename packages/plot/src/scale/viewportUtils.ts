import type { Bounds, PixelSize } from '../model/PlotTypes';

/** Zooms `bounds` about a normalized anchor, where 0 is the min edge and 1 the max. */
export function zoomBounds(
  bounds: Bounds,
  factor: number,
  anchorX: number,
  anchorY: number
): Bounds {
  const xSpan = bounds.xMax - bounds.xMin;
  const ySpan = bounds.yMax - bounds.yMin;
  const xCenter = bounds.xMin + xSpan * anchorX;
  const yCenter = bounds.yMin + ySpan * anchorY;
  return {
    xMin: xCenter - xSpan * anchorX * factor,
    xMax: xCenter + xSpan * (1 - anchorX) * factor,
    yMin: yCenter - ySpan * anchorY * factor,
    yMax: yCenter + ySpan * (1 - anchorY) * factor,
  };
}

/** Translates `bounds` by a pixel delta, given the plot area size. */
export function panBounds(
  bounds: Bounds,
  deltaX: number,
  deltaY: number,
  pixelSize: PixelSize
): Bounds {
  const xPerPixel =
    pixelSize.width > 0 ? (bounds.xMax - bounds.xMin) / pixelSize.width : 0;
  // Screen y grows downward while data y grows upward
  const yPerPixel =
    pixelSize.height > 0 ? (bounds.yMax - bounds.yMin) / pixelSize.height : 0;
  const xShift = -deltaX * xPerPixel;
  const yShift = deltaY * yPerPixel;
  return {
    xMin: bounds.xMin + xShift,
    xMax: bounds.xMax + xShift,
    yMin: bounds.yMin + yShift,
    yMax: bounds.yMax + yShift,
  };
}
