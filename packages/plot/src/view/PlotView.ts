import Log from '@deephaven/log';
import { PlotEventEmitter } from '../model/PlotEventEmitter';
import type {
  PlotDataSource,
  SeriesDataRequest,
} from '../model/PlotDataSource';
import {
  boundsEqual,
  padBounds,
  type Bounds,
  type PlotShape,
  type SeriesDelta,
} from '../model/PlotTypes';
import type { PlotRenderer } from '../renderers/PlotRenderer';
import { type RendererRegistry } from '../renderers/RendererRegistry';
import { defaultRendererRegistry } from '../renderers/defaultRendererRegistry';
import { panBounds, zoomBounds } from '../scale/viewportUtils';
import { defaultPlotTheme, type PlotTheme } from '../theme/PlotTheme';
import { AxisPainter, type PlotArea } from './AxisPainter';

const log = Log.module('PlotView');

const DEFAULT_VIEWPORT: Bounds = { xMin: 0, xMax: 1, yMin: 0, yMax: 1 };
const ZOOM_STEP = 1.1;

export interface PlotViewOptions {
  registry?: RendererRegistry;
  /** Renderer names in order of preference. Defaults to WebGPU then Canvas. */
  rendererPreference?: readonly string[];
  theme?: PlotTheme;
  /** Enables wheel zoom, drag pan, and double click reset. Defaults to true. */
  interactive?: boolean;
}

export interface PlotViewEventMap {
  rendererchanged: { name: string };
  viewportchanged: { viewport: Bounds };
  shapechanged: { shape: PlotShape };
  /** Fired after the renderer has drawn a frame. */
  frame: Record<string, never>;
  /** Fired once the plot has drawn all outstanding data requests. */
  idle: Record<string, never>;
  error: { error: unknown };
}

interface SeriesState {
  /** True when the renderer holds every point, so deltas can be applied directly. */
  complete: boolean;
}

/**
 * Owns the DOM, the renderer, and the data request lifecycle for one plot.
 *
 * Framework free on purpose. `Plot` is a thin React wrapper around this.
 */
export class PlotView extends PlotEventEmitter<PlotViewEventMap> {
  private container: HTMLElement;

  private source: PlotDataSource;

  private options: PlotViewOptions;

  private registry: RendererRegistry;

  private axesCanvas: HTMLCanvasElement;

  private dataCanvas: HTMLCanvasElement;

  private axisPainter: AxisPainter;

  private renderer: PlotRenderer | null = null;

  private theme: PlotTheme;

  private shape: PlotShape = { series: [] };

  private seriesStates = new Map<string, SeriesState>();

  private viewport: Bounds = DEFAULT_VIEWPORT;

  private homeViewport: Bounds = DEFAULT_VIEWPORT;

  private width = 0;

  private height = 0;

  private frame: number | undefined;

  private dirty = false;

  private requestTimeout: ReturnType<typeof setTimeout> | undefined;

  /** True once the user has zoomed or panned, which stops viewport following. */
  private isViewportPinned = false;

  private resizeObserver: ResizeObserver | undefined;

  private abortController: AbortController | undefined;

  private requestRevision = 0;

  private pendingRequests = 0;

  private isDestroyed = false;

  private dragOrigin: { x: number; y: number } | undefined;

  constructor(
    container: HTMLElement,
    source: PlotDataSource,
    options: PlotViewOptions = {}
  ) {
    super();
    this.container = container;
    this.source = source;
    this.options = options;
    this.registry = options.registry ?? defaultRendererRegistry;
    this.theme = options.theme ?? defaultPlotTheme;

    this.container.style.position = 'relative';
    this.container.setAttribute('data-dh-plot-status', 'loading');

    this.axesCanvas = document.createElement('canvas');
    this.axesCanvas.setAttribute('data-dh-plot-layer', 'axes');
    this.axesCanvas.style.position = 'absolute';
    this.axesCanvas.style.inset = '0';
    this.axesCanvas.style.width = '100%';
    this.axesCanvas.style.height = '100%';

    this.dataCanvas = document.createElement('canvas');
    this.dataCanvas.setAttribute('data-dh-plot-layer', 'data');
    this.dataCanvas.style.position = 'absolute';

    this.container.appendChild(this.axesCanvas);
    this.container.appendChild(this.dataCanvas);

    this.axisPainter = new AxisPainter(this.axesCanvas);

    this.handleShapeChanged = this.handleShapeChanged.bind(this);
    this.handleDataChanged = this.handleDataChanged.bind(this);
    this.handleSourceError = this.handleSourceError.bind(this);
    this.handleWheel = this.handleWheel.bind(this);
    this.handlePointerDown = this.handlePointerDown.bind(this);
    this.handlePointerMove = this.handlePointerMove.bind(this);
    this.handlePointerUp = this.handlePointerUp.bind(this);
    this.handleDoubleClick = this.handleDoubleClick.bind(this);
    this.renderFrame = this.renderFrame.bind(this);
  }

  /** Resolves a renderer, loads the shape, and draws the first frame. */
  async initialize(): Promise<void> {
    const shape = await this.source.getShape();
    if (this.isDestroyed) {
      return;
    }
    this.shape = shape;

    const seriesTypes = Array.from(
      new Set(shape.series.map(series => series.type))
    );
    const factory = await this.registry.resolve({
      preference: this.options.rendererPreference,
      seriesTypes,
    });
    if (this.isDestroyed) {
      return;
    }
    if (factory == null) {
      const reason = await this.registry.describeUnavailable({
        preference: this.options.rendererPreference,
        seriesTypes,
      });
      throw new Error(`No renderer could be used for this plot: ${reason}`);
    }

    const renderer = factory.create();
    await renderer.initialize(this.dataCanvas, this.theme);
    if (this.isDestroyed) {
      renderer.destroy();
      return;
    }
    this.renderer = renderer;
    this.container.setAttribute('data-dh-plot-renderer', renderer.name);
    this.emit('rendererchanged', { name: renderer.name });

    this.homeViewport =
      shape.bounds != null ? padBounds(shape.bounds) : DEFAULT_VIEWPORT;
    this.viewport = this.homeViewport;
    renderer.setShape(shape);
    renderer.setViewport(this.viewport);
    this.emit('shapechanged', { shape });

    this.source.addEventListener('shapechanged', this.handleShapeChanged);
    this.source.addEventListener('datachanged', this.handleDataChanged);
    this.source.addEventListener('error', this.handleSourceError);

    this.observeSize();
    if (this.options.interactive !== false) {
      this.addInteractionListeners();
    }

    this.scheduleDataRequest();
  }

  private observeSize(): void {
    const applySize = (): void => {
      const rect = this.container.getBoundingClientRect();
      this.setSize(rect.width, rect.height);
    };
    applySize();
    if (typeof ResizeObserver !== 'undefined') {
      this.resizeObserver = new ResizeObserver(applySize);
      this.resizeObserver.observe(this.container);
    }
  }

  private addInteractionListeners(): void {
    this.container.addEventListener('wheel', this.handleWheel, {
      passive: false,
    });
    this.container.addEventListener('pointerdown', this.handlePointerDown);
    this.container.addEventListener('pointermove', this.handlePointerMove);
    this.container.addEventListener('pointerup', this.handlePointerUp);
    this.container.addEventListener('pointercancel', this.handlePointerUp);
    this.container.addEventListener('dblclick', this.handleDoubleClick);
  }

  private removeInteractionListeners(): void {
    this.container.removeEventListener('wheel', this.handleWheel);
    this.container.removeEventListener('pointerdown', this.handlePointerDown);
    this.container.removeEventListener('pointermove', this.handlePointerMove);
    this.container.removeEventListener('pointerup', this.handlePointerUp);
    this.container.removeEventListener('pointercancel', this.handlePointerUp);
    this.container.removeEventListener('dblclick', this.handleDoubleClick);
  }

  getPlotArea(): PlotArea {
    const { margin } = this.theme;
    return {
      left: margin.left,
      top: margin.top,
      width: Math.max(1, this.width - margin.left - margin.right),
      height: Math.max(1, this.height - margin.top - margin.bottom),
    };
  }

  getRendererName(): string | undefined {
    return this.renderer?.name;
  }

  getViewport(): Bounds {
    return this.viewport;
  }

  getShape(): PlotShape {
    return this.shape;
  }

  setSize(width: number, height: number): void {
    if (width === this.width && height === this.height) {
      return;
    }
    this.width = width;
    this.height = height;
    if (width <= 0 || height <= 0) {
      return;
    }

    const ratio = window.devicePixelRatio > 0 ? window.devicePixelRatio : 1;
    const area = this.getPlotArea();
    this.axesCanvas.style.width = `${width}px`;
    this.axesCanvas.style.height = `${height}px`;
    this.axisPainter.resize(width, height, ratio);

    this.dataCanvas.style.left = `${area.left}px`;
    this.dataCanvas.style.top = `${area.top}px`;
    this.dataCanvas.style.width = `${area.width}px`;
    this.dataCanvas.style.height = `${area.height}px`;
    this.renderer?.resize(area.width, area.height, ratio);

    // The pixel budget changed, so even complete series may need more detail
    this.scheduleDataRequest();
  }

  setViewport(viewport: Bounds): void {
    // An explicit viewport stops the plot from following incoming data
    this.isViewportPinned = true;
    this.applyViewport(viewport);
  }

  private applyViewport(viewport: Bounds): void {
    if (boundsEqual(viewport, this.viewport)) {
      return;
    }
    this.viewport = viewport;
    this.renderer?.setViewport(viewport);
    this.emit('viewportchanged', { viewport });
    // A series the renderer holds in full cannot yield more data for a new
    // viewport, so panning and zooming it costs nothing but a redraw
    if (this.hasIncompleteSeries()) {
      this.scheduleDataRequest();
    }
    this.invalidate();
  }

  private hasIncompleteSeries(): boolean {
    return this.shape.series.some(
      descriptor => this.seriesStates.get(descriptor.id)?.complete !== true
    );
  }

  resetViewport(): void {
    this.isViewportPinned = false;
    this.applyViewport(this.homeViewport);
  }

  setTheme(theme: PlotTheme): void {
    this.theme = theme;
    this.renderer?.setTheme(theme);
    this.setSize(this.width, this.height);
    this.invalidate();
  }

  /** Queues a redraw on the next animation frame. */
  invalidate(): void {
    this.dirty = true;
    if (this.frame == null && !this.isDestroyed) {
      this.frame = requestAnimationFrame(this.renderFrame);
    }
  }

  /**
   * Queues a data request.
   *
   * A ticking source can fire several times in a turn, and each request
   * supersedes the last anyway, so they collapse into one. This deliberately
   * does not use `requestAnimationFrame`: that never fires in a hidden tab, and
   * a plot should still have its data ready when the tab is brought forward.
   */
  private scheduleDataRequest(): void {
    if (this.requestTimeout != null || this.isDestroyed) {
      return;
    }
    this.requestTimeout = setTimeout(() => {
      this.requestTimeout = undefined;
      this.requestData();
    }, 0);
  }

  private renderFrame(): void {
    this.frame = undefined;
    if (!this.dirty || this.isDestroyed) {
      return;
    }
    this.dirty = false;
    this.axisPainter.paint(
      this.width,
      this.height,
      this.getPlotArea(),
      this.viewport,
      this.shape,
      this.theme
    );
    this.renderer?.render();
    this.emit('frame', {});
  }

  /**
   * Asks the source for the data needed to draw the current viewport at the
   * current size. In-flight requests are aborted so only the latest wins.
   */
  requestData(): void {
    if (this.renderer == null || this.width <= 0 || this.height <= 0) {
      return;
    }
    this.abortController?.abort();
    const abortController = new AbortController();
    this.abortController = abortController;
    this.requestRevision += 1;
    const revision = this.requestRevision;
    const area = this.getPlotArea();
    const pixelSize = { width: area.width, height: area.height };

    this.container.setAttribute('data-dh-plot-status', 'loading');
    this.pendingRequests += 1;

    const requests = this.shape.series.map(async descriptor => {
      const request: SeriesDataRequest = {
        seriesId: descriptor.id,
        viewport: this.viewport,
        pixelSize,
        style: descriptor.style ?? {},
        signal: abortController.signal,
      };
      const result = await this.source.requestSeriesData(request);
      if (revision === this.requestRevision && !this.isDestroyed) {
        this.seriesStates.set(descriptor.id, { complete: result.complete });
        this.renderer?.setSeriesData(descriptor.id, result.data);
      }
    });

    Promise.all(requests)
      .then(() => {
        if (revision === this.requestRevision) {
          this.invalidate();
        }
      })
      .catch(error => {
        if (!abortController.signal.aborted) {
          log.error('Failed to load plot data', error);
          this.emit('error', { error });
        }
      })
      .finally(() => {
        this.pendingRequests -= 1;
        if (this.pendingRequests === 0 && !this.isDestroyed) {
          this.container.setAttribute('data-dh-plot-status', 'ready');
          this.emit('idle', {});
        }
      });
  }

  private handleShapeChanged({ shape }: { shape: PlotShape }): void {
    this.shape = shape;
    this.renderer?.setShape(shape);
    if (shape.bounds != null) {
      this.homeViewport = padBounds(shape.bounds);
      // Until the user takes control, keep newly appended data in view
      if (!this.isViewportPinned) {
        this.applyViewport(this.homeViewport);
      }
    }
    this.emit('shapechanged', { shape });
    this.invalidate();
  }

  private handleDataChanged({ deltas }: { deltas: SeriesDelta[] }): void {
    const { renderer } = this;
    if (renderer == null) {
      return;
    }
    // Deltas index into the source's data, so they only line up when the
    // renderer is holding a complete copy of the series
    const applicable = deltas.filter(
      delta => this.seriesStates.get(delta.seriesId)?.complete === true
    );
    if (applicable.length > 0) {
      renderer.applyDeltas(applicable);
      this.invalidate();
    }
    if (applicable.length < deltas.length) {
      this.scheduleDataRequest();
    }
  }

  private handleSourceError({ error }: { error: unknown }): void {
    log.error('Plot data source error', error);
    this.emit('error', { error });
  }

  private handleWheel(event: WheelEvent): void {
    event.preventDefault();
    const area = this.getPlotArea();
    const rect = this.container.getBoundingClientRect();
    const anchorX = (event.clientX - rect.left - area.left) / area.width;
    const anchorY = 1 - (event.clientY - rect.top - area.top) / area.height;
    const factor = event.deltaY > 0 ? ZOOM_STEP : 1 / ZOOM_STEP;
    this.setViewport(
      zoomBounds(
        this.viewport,
        factor,
        Math.min(1, Math.max(0, anchorX)),
        Math.min(1, Math.max(0, anchorY))
      )
    );
  }

  private handlePointerDown(event: PointerEvent): void {
    this.dragOrigin = { x: event.clientX, y: event.clientY };
    this.container.setPointerCapture(event.pointerId);
  }

  private handlePointerMove(event: PointerEvent): void {
    const { dragOrigin } = this;
    if (dragOrigin == null) {
      return;
    }
    const area = this.getPlotArea();
    this.dragOrigin = { x: event.clientX, y: event.clientY };
    this.setViewport(
      panBounds(
        this.viewport,
        event.clientX - dragOrigin.x,
        event.clientY - dragOrigin.y,
        { width: area.width, height: area.height }
      )
    );
  }

  private handlePointerUp(event: PointerEvent): void {
    this.dragOrigin = undefined;
    if (this.container.hasPointerCapture(event.pointerId)) {
      this.container.releasePointerCapture(event.pointerId);
    }
  }

  private handleDoubleClick(): void {
    this.resetViewport();
  }

  destroy(): void {
    this.isDestroyed = true;
    this.abortController?.abort();
    if (this.requestTimeout != null) {
      clearTimeout(this.requestTimeout);
      this.requestTimeout = undefined;
    }
    this.resizeObserver?.disconnect();
    this.removeInteractionListeners();
    this.source.removeEventListener('shapechanged', this.handleShapeChanged);
    this.source.removeEventListener('datachanged', this.handleDataChanged);
    this.source.removeEventListener('error', this.handleSourceError);
    if (this.frame != null) {
      cancelAnimationFrame(this.frame);
      this.frame = undefined;
    }
    this.renderer?.destroy();
    this.renderer = null;
    this.axesCanvas.remove();
    this.dataCanvas.remove();
    this.removeAllListeners();
  }
}

export default PlotView;
