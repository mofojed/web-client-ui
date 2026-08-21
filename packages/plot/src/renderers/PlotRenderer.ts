import type {
  Bounds,
  PlotSeriesType,
  PlotShape,
  SeriesData,
  SeriesDelta,
} from '../model/PlotTypes';
import type { PlotTheme } from '../theme/PlotTheme';

export interface PlotRendererCapabilities {
  /** Series types this renderer knows how to draw. */
  seriesTypes: readonly PlotSeriesType[];
  /**
   * True when `applyDeltas` updates only the changed points. Renderers that
   * return false still accept deltas, they just redraw everything.
   */
  incrementalUpdates: boolean;
}

/**
 * Draws series into a canvas.
 *
 * A renderer only ever draws the data area. Axes, gridlines, and labels are
 * drawn by the shared `AxisPainter` so every renderer looks identical outside
 * the data itself.
 */
export interface PlotRenderer {
  readonly name: string;
  readonly capabilities: PlotRendererCapabilities;

  initialize: (canvas: HTMLCanvasElement, theme: PlotTheme) => Promise<void>;

  /** Declares the series to draw. Existing data for series still present is kept. */
  setShape: (shape: PlotShape) => void;

  /** Replaces all data for a series. */
  setSeriesData: (seriesId: string, data: SeriesData) => void;

  /** Applies incremental changes. May fall back to a full redraw. */
  applyDeltas: (deltas: SeriesDelta[]) => void;

  setViewport: (viewport: Bounds) => void;

  setTheme: (theme: PlotTheme) => void;

  resize: (width: number, height: number, devicePixelRatio: number) => void;

  render: () => void;

  destroy: () => void;
}

export interface PlotRendererFactory {
  readonly name: string;
  readonly capabilities: PlotRendererCapabilities;
  /** Resolves false when the platform cannot run this renderer. */
  isSupported: () => Promise<boolean>;
  create: () => PlotRenderer;
}
