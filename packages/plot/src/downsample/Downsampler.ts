import type { SeriesDataRequest } from '../model/PlotDataSource';
import { createSeriesData, type SeriesData } from '../model/PlotTypes';

/**
 * Reduces a fully materialized series to the points needed for one request.
 *
 * This is the in-memory counterpart to a server side downsample. Sources that
 * push work to a backend implement {@link SeriesDataRequest} handling directly
 * and never need a `Downsampler`.
 */
export type Downsampler = (
  input: SeriesData,
  request: SeriesDataRequest
) => SeriesData;

/** Returns the input unchanged. Useful for small series and for tests. */
export const identityDownsampler: Downsampler = input => input;

/**
 * Finds the index of the last point with `x` less than `value`, or -1.
 * Assumes `data` is sorted ascending by `x`.
 */
function findLastIndexBefore(data: SeriesData, value: number): number {
  let low = 0;
  let high = data.length - 1;
  let result = -1;
  while (low <= high) {
    const mid = (low + high) >> 1; // eslint-disable-line no-bitwise
    if (data.x[mid] < value) {
      result = mid;
      low = mid + 1;
    } else {
      high = mid - 1;
    }
  }
  return result;
}

function copyPoints(
  input: SeriesData,
  indexes: number[],
  count: number
): SeriesData {
  const output = createSeriesData(count);
  for (let i = 0; i < count; i += 1) {
    const index = indexes[i];
    output.x[i] = input.x[index];
    output.y[i] = input.y[index];
  }
  output.length = count;
  return output;
}

/**
 * Keeps the first, last, minimum, and maximum point of every pixel column.
 *
 * The rasterized result is pixel identical to drawing every point at the
 * requested resolution, so no visual fidelity is lost. Requires `input` to be
 * sorted ascending by `x`.
 */
export const minMaxDownsampler: Downsampler = (input, request) => {
  const { viewport, pixelSize } = request;
  const columns = Math.max(1, Math.floor(pixelSize.width));
  const xSpan = viewport.xMax - viewport.xMin;
  if (input.length <= columns * 4 || xSpan <= 0) {
    return input;
  }

  // Include one point outside each edge so lines still enter and exit the plot
  const startIndex = Math.max(0, findLastIndexBefore(input, viewport.xMin));
  const indexes: number[] = [];
  let count = 0;

  let bucket = -1;
  let bucketFirst = -1;
  let bucketLast = -1;
  let bucketMin = -1;
  let bucketMax = -1;

  const flush = (): void => {
    if (bucketFirst < 0) {
      return;
    }
    const ordered = [bucketFirst, bucketMin, bucketMax, bucketLast].sort(
      (a, b) => a - b
    );
    for (let i = 0; i < ordered.length; i += 1) {
      if (i === 0 || ordered[i] !== ordered[i - 1]) {
        indexes[count] = ordered[i];
        count += 1;
      }
    }
    bucketFirst = -1;
  };

  for (let i = startIndex; i < input.length; i += 1) {
    const x = input.x[i];
    const y = input.y[i];
    const column = Math.floor(((x - viewport.xMin) / xSpan) * columns);
    if (column !== bucket) {
      flush();
      bucket = column;
      bucketFirst = i;
      bucketMin = i;
      bucketMax = i;
    } else {
      if (y < input.y[bucketMin]) {
        bucketMin = i;
      }
      if (y > input.y[bucketMax]) {
        bucketMax = i;
      }
    }
    bucketLast = i;
    if (x > viewport.xMax && column > columns) {
      break;
    }
  }
  flush();

  return copyPoints(input, indexes, count);
};

/**
 * Largest Triangle Three Buckets.
 *
 * Produces a fixed point budget that preserves the perceived shape of a line.
 * Unlike {@link minMaxDownsampler} it can clip narrow spikes, so prefer it only
 * when a hard point budget matters more than exactness.
 */
export const lttbDownsampler: Downsampler = (input, request) => {
  const threshold = Math.max(3, Math.floor(request.pixelSize.width));
  if (input.length <= threshold) {
    return input;
  }

  const indexes: number[] = [0];
  let count = 1;
  const every = (input.length - 2) / (threshold - 2);
  let a = 0;

  for (let i = 0; i < threshold - 2; i += 1) {
    const avgRangeStart = Math.floor((i + 1) * every) + 1;
    const avgRangeEnd = Math.min(Math.floor((i + 2) * every) + 1, input.length);
    const avgRangeLength = avgRangeEnd - avgRangeStart;

    let avgX = 0;
    let avgY = 0;
    for (let j = avgRangeStart; j < avgRangeEnd; j += 1) {
      avgX += input.x[j];
      avgY += input.y[j];
    }
    avgX /= avgRangeLength;
    avgY /= avgRangeLength;

    const rangeStart = Math.floor(i * every) + 1;
    const rangeEnd = Math.floor((i + 1) * every) + 1;
    const pointAX = input.x[a];
    const pointAY = input.y[a];

    let maxArea = -1;
    let maxAreaIndex = rangeStart;
    for (let j = rangeStart; j < rangeEnd; j += 1) {
      const area = Math.abs(
        (pointAX - avgX) * (input.y[j] - pointAY) -
          (pointAX - input.x[j]) * (avgY - pointAY)
      );
      if (area > maxArea) {
        maxArea = area;
        maxAreaIndex = j;
      }
    }

    indexes[count] = maxAreaIndex;
    count += 1;
    a = maxAreaIndex;
  }

  indexes[count] = input.length - 1;
  count += 1;

  return copyPoints(input, indexes, count);
};
