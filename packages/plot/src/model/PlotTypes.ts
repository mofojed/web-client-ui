/**
 * Core value types for the plot package. These are intentionally free of any
 * Deephaven or framework specific concepts so that any data source can be
 * adapted to them.
 */

/** The kinds of series that can be drawn. Renderers advertise which they support. */
export type PlotSeriesType = 'scatter' | 'line';

/** An axis aligned rectangle in data space. */
export interface Bounds {
  xMin: number;
  xMax: number;
  yMin: number;
  yMax: number;
}

/** Size in device independent pixels. */
export interface PixelSize {
  width: number;
  height: number;
}

/**
 * Columnar point data for a single series.
 *
 * `x` and `y` are parallel arrays. They may be longer than `length`, allowing a
 * source to over-allocate and append without reallocating.
 */
export interface SeriesData {
  x: Float64Array;
  y: Float64Array;
  length: number;
}

/** Visual style for a series. Passed to the data source so it can honour fidelity requirements. */
export interface SeriesStyle {
  /** CSS color. When omitted the theme colorway is used based on series index. */
  color?: string;
  /** Line width in pixels. Only used by `line` series. */
  lineWidth?: number;
  /** Point diameter in pixels. Only used by `scatter` series. */
  pointSize?: number;
}

/** Describes a single series without providing any of its data. */
export interface SeriesDescriptor {
  id: string;
  name: string;
  type: PlotSeriesType;
  style?: SeriesStyle;
  /** Known bounds of the full series, if the source can cheaply provide them. */
  bounds?: Bounds;
}

/**
 * The "shape" of a plot: enough information to lay out axes and allocate
 * renderer resources without transferring any point data.
 */
export interface PlotShape {
  series: SeriesDescriptor[];
  /** Union of all series bounds, if known. Used to pick the initial viewport. */
  bounds?: Bounds;
  title?: string;
  xAxisLabel?: string;
  yAxisLabel?: string;
}

/**
 * An incremental change to a single series.
 *
 * Renderers that can apply deltas cheaply (WebGPU writes into an existing GPU
 * buffer) should do so. Renderers that cannot may treat any delta as "redraw
 * everything" without changing behaviour.
 */
export type SeriesDelta =
  | { type: 'append'; seriesId: string; data: SeriesData }
  | { type: 'update'; seriesId: string; offset: number; data: SeriesData }
  | { type: 'replace'; seriesId: string; data: SeriesData }
  | { type: 'clear'; seriesId: string };

/** Creates an empty {@link SeriesData} with the given capacity. */
export function createSeriesData(capacity = 0): SeriesData {
  return {
    x: new Float64Array(capacity),
    y: new Float64Array(capacity),
    length: 0,
  };
}

/** Creates a {@link SeriesData} from plain number arrays. */
export function seriesDataFromArrays(
  x: ArrayLike<number>,
  y: ArrayLike<number>
): SeriesData {
  const length = Math.min(x.length, y.length);
  const data = createSeriesData(length);
  for (let i = 0; i < length; i += 1) {
    data.x[i] = x[i];
    data.y[i] = y[i];
  }
  data.length = length;
  return data;
}

/** Returns a copy holding only the populated portion of `data`. */
export function copySeriesData(data: SeriesData): SeriesData {
  const copy = createSeriesData(data.length);
  copy.x.set(data.x.subarray(0, data.length));
  copy.y.set(data.y.subarray(0, data.length));
  copy.length = data.length;
  return copy;
}

/**
 * Grows the backing arrays of `data` in place so it can hold `capacity` points.
 * Capacity is doubled rather than fitted exactly so repeated appends amortize.
 */
/* eslint-disable no-param-reassign -- these grow and append in place by design */
export function ensureSeriesCapacity(
  data: SeriesData,
  capacity: number
): SeriesData {
  if (data.x.length >= capacity) {
    return data;
  }
  let nextCapacity = Math.max(data.x.length, 1);
  while (nextCapacity < capacity) {
    nextCapacity *= 2;
  }
  const x = new Float64Array(nextCapacity);
  const y = new Float64Array(nextCapacity);
  x.set(data.x);
  y.set(data.y);
  data.x = x;
  data.y = y;
  return data;
}

/** Appends `source` to `target`, growing `target` as needed. */
export function appendSeriesData(
  target: SeriesData,
  source: SeriesData
): SeriesData {
  ensureSeriesCapacity(target, target.length + source.length);
  for (let i = 0; i < source.length; i += 1) {
    target.x[target.length + i] = source.x[i];
    target.y[target.length + i] = source.y[i];
  }
  target.length += source.length;
  return target;
}
/* eslint-enable no-param-reassign */

/** Computes the bounds of the populated portion of a {@link SeriesData}. */
export function getSeriesBounds(data: SeriesData): Bounds | undefined {
  if (data.length === 0) {
    return undefined;
  }
  let xMin = Infinity;
  let xMax = -Infinity;
  let yMin = Infinity;
  let yMax = -Infinity;
  for (let i = 0; i < data.length; i += 1) {
    const xValue = data.x[i];
    const yValue = data.y[i];
    if (Number.isFinite(xValue) && Number.isFinite(yValue)) {
      xMin = Math.min(xMin, xValue);
      xMax = Math.max(xMax, xValue);
      yMin = Math.min(yMin, yValue);
      yMax = Math.max(yMax, yValue);
    }
  }
  if (!Number.isFinite(xMin)) {
    return undefined;
  }
  return { xMin, xMax, yMin, yMax };
}

/** Returns the smallest bounds containing both inputs. */
export function unionBounds(
  a: Bounds | undefined,
  b: Bounds | undefined
): Bounds | undefined {
  if (a == null) {
    return b;
  }
  if (b == null) {
    return a;
  }
  return {
    xMin: Math.min(a.xMin, b.xMin),
    xMax: Math.max(a.xMax, b.xMax),
    yMin: Math.min(a.yMin, b.yMin),
    yMax: Math.max(a.yMax, b.yMax),
  };
}

/**
 * Expands zero-width or zero-height bounds and applies a proportional margin so
 * that data does not sit exactly on the plot edge.
 */
export function padBounds(bounds: Bounds, fraction = 0.05): Bounds {
  const xSpan = bounds.xMax - bounds.xMin;
  const ySpan = bounds.yMax - bounds.yMin;
  const xPad = xSpan > 0 ? xSpan * fraction : 0.5;
  const yPad = ySpan > 0 ? ySpan * fraction : 0.5;
  return {
    xMin: bounds.xMin - xPad,
    xMax: bounds.xMax + xPad,
    yMin: bounds.yMin - yPad,
    yMax: bounds.yMax + yPad,
  };
}

/** Returns true if the two bounds are equal within a small relative epsilon. */
export function boundsEqual(
  a: Bounds | undefined,
  b: Bounds | undefined,
  epsilon = 1e-9
): boolean {
  if (a === b) {
    return true;
  }
  if (a == null || b == null) {
    return false;
  }
  const scale =
    Math.max(
      Math.abs(a.xMax - a.xMin),
      Math.abs(a.yMax - a.yMin),
      Number.MIN_VALUE
    ) * epsilon;
  return (
    Math.abs(a.xMin - b.xMin) <= scale &&
    Math.abs(a.xMax - b.xMax) <= scale &&
    Math.abs(a.yMin - b.yMin) <= scale &&
    Math.abs(a.yMax - b.yMax) <= scale
  );
}
