import type {
  Bounds,
  PixelSize,
  PlotShape,
  SeriesData,
  SeriesDelta,
  SeriesStyle,
} from './PlotTypes';

import { PlotEventEmitter } from './PlotEventEmitter';

/**
 * Parameters describing exactly what the renderer needs to draw one series.
 *
 * A source is free to return every point it has, or to return a reduced set
 * that is visually indistinguishable at the given `pixelSize`. See
 * `docs/downsampling.md`.
 */
export interface SeriesDataRequest {
  seriesId: string;
  /** The region of data space currently visible. */
  viewport: Bounds;
  /** Size of the plot area the viewport is being drawn into. */
  pixelSize: PixelSize;
  /** Style the series will be drawn with, which affects how much detail is visible. */
  style: SeriesStyle;
  /** Aborted when a newer request supersedes this one. */
  signal?: AbortSignal;
}

export interface SeriesDataResult {
  data: SeriesData;
  /**
   * True when every point the source holds for this series is included.
   *
   * Only complete results can have `append` and `update` deltas applied
   * directly. Once a result has been downsampled the indexes no longer line up
   * with the source, so a fresh request has to be made instead.
   */
  complete: boolean;
}

export interface PlotDataSourceEventMap {
  /** Series were added, removed, or their descriptors changed. */
  shapechanged: { shape: PlotShape };
  /** Data changed. Renderers may apply the deltas or refetch. */
  datachanged: { deltas: SeriesDelta[] };
  disconnect: Record<string, never>;
  reconnect: Record<string, never>;
  error: { error: unknown };
}

/**
 * Supplies a plot with its shape and its data.
 *
 * Implementations do not have to hold any data in memory. `getShape` is the
 * only thing required up front; point data is pulled lazily through
 * `requestSeriesData` for whatever viewport is currently being rendered.
 */
export interface PlotDataSource {
  /** Resolves the series list and, when cheaply available, the overall bounds. */
  getShape: () => Promise<PlotShape>;

  /**
   * Resolves the points to draw for a request. The result must be ordered by
   * ascending `x` for `line` series.
   */
  requestSeriesData: (request: SeriesDataRequest) => Promise<SeriesDataResult>;

  addEventListener: <K extends keyof PlotDataSourceEventMap>(
    type: K,
    listener: (detail: PlotDataSourceEventMap[K]) => void
  ) => void;

  removeEventListener: <K extends keyof PlotDataSourceEventMap>(
    type: K,
    listener: (detail: PlotDataSourceEventMap[K]) => void
  ) => void;

  /** Releases any resources held by the source. */
  close?: () => void;
}

/** Convenience base class providing the event plumbing required by {@link PlotDataSource}. */
export abstract class AbstractPlotDataSource
  extends PlotEventEmitter<PlotDataSourceEventMap>
  implements PlotDataSource
{
  abstract getShape(): Promise<PlotShape>;

  abstract requestSeriesData(
    request: SeriesDataRequest
  ): Promise<SeriesDataResult>;

  protected fireShapeChanged(shape: PlotShape): void {
    this.emit('shapechanged', { shape });
  }

  protected fireDataChanged(deltas: SeriesDelta[]): void {
    this.emit('datachanged', { deltas });
  }

  protected fireError(error: unknown): void {
    this.emit('error', { error });
  }

  close(): void {
    this.removeAllListeners();
  }
}
