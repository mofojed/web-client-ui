import {
  appendSeriesData,
  createSeriesData,
  ensureSeriesCapacity,
  type SeriesData,
  type SeriesDelta,
} from '../model/PlotTypes';

/** Applies a delta to the previous data for a series, returning the new data. */
export function applyDeltaToSeriesData(
  existing: SeriesData | undefined,
  delta: SeriesDelta
): SeriesData {
  switch (delta.type) {
    case 'replace':
      return delta.data;
    case 'clear':
      return createSeriesData();
    case 'append': {
      const target = existing ?? createSeriesData();
      return appendSeriesData(target, delta.data);
    }
    case 'update': {
      const target = existing ?? createSeriesData();
      const end = delta.offset + delta.data.length;
      ensureSeriesCapacity(target, end);
      for (let i = 0; i < delta.data.length; i += 1) {
        target.x[delta.offset + i] = delta.data.x[i];
        target.y[delta.offset + i] = delta.data.y[i];
      }
      target.length = Math.max(target.length, end);
      return target;
    }
  }
}

export default applyDeltaToSeriesData;
