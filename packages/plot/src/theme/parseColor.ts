/** RGBA components in the 0-1 range. */
export type Rgba = [number, number, number, number];

const HEX_SHORT = /^#([0-9a-f])([0-9a-f])([0-9a-f])([0-9a-f])?$/i;
const HEX_LONG = /^#([0-9a-f]{2})([0-9a-f]{2})([0-9a-f]{2})([0-9a-f]{2})?$/i;
const RGB_FUNCTION = /^rgba?\(([^)]+)\)$/i;

let measureContext: CanvasRenderingContext2D | null | undefined;

function parseWithCanvas(color: string): Rgba | undefined {
  if (measureContext === undefined) {
    measureContext =
      typeof document === 'undefined'
        ? null
        : document.createElement('canvas').getContext('2d');
  }
  if (measureContext == null) {
    return undefined;
  }
  measureContext.clearRect(0, 0, 1, 1);
  measureContext.fillStyle = '#000';
  measureContext.fillStyle = color;
  measureContext.fillRect(0, 0, 1, 1);
  const { data } = measureContext.getImageData(0, 0, 1, 1);
  const alpha = data[3] / 255;
  if (alpha === 0) {
    return [0, 0, 0, 0];
  }
  // getImageData returns premultiplied values, so undo the multiply
  return [
    data[0] / 255 / alpha,
    data[1] / 255 / alpha,
    data[2] / 255 / alpha,
    alpha,
  ];
}

/**
 * Converts a CSS color to normalized RGBA.
 *
 * Hex and `rgb()`/`rgba()` are parsed directly; anything else falls back to the
 * browser via a scratch canvas. Returns opaque black when parsing fails.
 */
export function parseColor(color: string): Rgba {
  const trimmed = color.trim();

  const shortMatch = HEX_SHORT.exec(trimmed);
  if (shortMatch != null) {
    const expand = (value: string): number => parseInt(value + value, 16) / 255;
    return [
      expand(shortMatch[1]),
      expand(shortMatch[2]),
      expand(shortMatch[3]),
      shortMatch[4] != null ? expand(shortMatch[4]) : 1,
    ];
  }

  const longMatch = HEX_LONG.exec(trimmed);
  if (longMatch != null) {
    const convert = (value: string): number => parseInt(value, 16) / 255;
    return [
      convert(longMatch[1]),
      convert(longMatch[2]),
      convert(longMatch[3]),
      longMatch[4] != null ? convert(longMatch[4]) : 1,
    ];
  }

  const functionMatch = RGB_FUNCTION.exec(trimmed);
  if (functionMatch != null) {
    const parts = functionMatch[1]
      .split(/[,/\s]+/)
      .filter(part => part.length > 0);
    if (parts.length >= 3) {
      const channel = (value: string): number =>
        value.endsWith('%')
          ? Number.parseFloat(value) / 100
          : Number.parseFloat(value) / 255;
      return [
        channel(parts[0]),
        channel(parts[1]),
        channel(parts[2]),
        parts.length > 3 ? Number.parseFloat(parts[3]) : 1,
      ];
    }
  }

  return parseWithCanvas(trimmed) ?? [0, 0, 0, 1];
}

export default parseColor;
