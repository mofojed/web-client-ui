import {
  copySeriesData,
  createSeriesData,
  type Bounds,
  type PlotShape,
  type SeriesData,
  type SeriesDelta,
  type SeriesDescriptor,
} from '../../model/PlotTypes';
import {
  defaultPlotTheme,
  getSeriesColor,
  type PlotTheme,
} from '../../theme/PlotTheme';
import type {
  PlotRenderer,
  PlotRendererCapabilities,
  PlotRendererFactory,
} from '../PlotRenderer';
import { applyDeltaToSeriesData } from '../applyDeltaToSeriesData';

const CAPABILITIES: PlotRendererCapabilities = {
  seriesTypes: ['scatter', 'line'],
  incrementalUpdates: false,
};

/**
 * Canvas 2D renderer.
 *
 * Deliberately naive: every `render` redraws the whole scene. It exists as the
 * universally available fallback and as the reference for what the WebGPU
 * renderer should produce.
 */
export class CanvasRenderer implements PlotRenderer {
  readonly name = 'canvas';

  readonly capabilities = CAPABILITIES;

  private context: CanvasRenderingContext2D | null = null;

  private theme: PlotTheme = defaultPlotTheme;

  private descriptors: SeriesDescriptor[] = [];

  private seriesData = new Map<string, SeriesData>();

  private viewport: Bounds = { xMin: 0, xMax: 1, yMin: 0, yMax: 1 };

  private width = 0;

  private height = 0;

  async initialize(canvas: HTMLCanvasElement, theme: PlotTheme): Promise<void> {
    const context = canvas.getContext('2d');
    if (context == null) {
      throw new Error('Unable to acquire a 2d canvas context');
    }
    this.context = context;
    this.theme = theme;
  }

  setShape(shape: PlotShape): void {
    this.descriptors = shape.series;
    const ids = new Set(shape.series.map(series => series.id));
    Array.from(this.seriesData.keys()).forEach(id => {
      if (!ids.has(id)) {
        this.seriesData.delete(id);
      }
    });
  }

  setSeriesData(seriesId: string, data: SeriesData): void {
    // Sources may hand back their own arrays, so keep a private copy to mutate
    this.seriesData.set(seriesId, copySeriesData(data));
  }

  applyDeltas(deltas: SeriesDelta[]): void {
    for (let i = 0; i < deltas.length; i += 1) {
      const delta = deltas[i];
      this.seriesData.set(
        delta.seriesId,
        applyDeltaToSeriesData(this.seriesData.get(delta.seriesId), delta)
      );
    }
  }

  setViewport(viewport: Bounds): void {
    this.viewport = viewport;
  }

  setTheme(theme: PlotTheme): void {
    this.theme = theme;
  }

  resize(width: number, height: number, devicePixelRatio: number): void {
    this.width = width;
    this.height = height;
    const { context } = this;
    if (context == null) {
      return;
    }
    context.canvas.width = Math.max(1, Math.round(width * devicePixelRatio));
    context.canvas.height = Math.max(1, Math.round(height * devicePixelRatio));
    context.setTransform(devicePixelRatio, 0, 0, devicePixelRatio, 0, 0);
  }

  private toScreenX(value: number): number {
    const span = this.viewport.xMax - this.viewport.xMin;
    if (span === 0) {
      return 0;
    }
    return ((value - this.viewport.xMin) / span) * this.width;
  }

  private toScreenY(value: number): number {
    const span = this.viewport.yMax - this.viewport.yMin;
    if (span === 0) {
      return this.height;
    }
    return this.height - ((value - this.viewport.yMin) / span) * this.height;
  }

  private drawLine(data: SeriesData, color: string, lineWidth: number): void {
    const context = this.context as CanvasRenderingContext2D;
    context.beginPath();
    context.strokeStyle = color;
    context.lineWidth = lineWidth;
    context.lineJoin = 'round';
    context.lineCap = 'round';
    let started = false;
    for (let i = 0; i < data.length; i += 1) {
      const x = data.x[i];
      const y = data.y[i];
      if (!Number.isFinite(x) || !Number.isFinite(y)) {
        started = false;
      } else {
        const screenX = this.toScreenX(x);
        const screenY = this.toScreenY(y);
        if (started) {
          context.lineTo(screenX, screenY);
        } else {
          context.moveTo(screenX, screenY);
          started = true;
        }
      }
    }
    context.stroke();
  }

  private drawScatter(data: SeriesData, color: string, size: number): void {
    const context = this.context as CanvasRenderingContext2D;
    const radius = size / 2;
    context.fillStyle = color;
    context.beginPath();
    for (let i = 0; i < data.length; i += 1) {
      const x = data.x[i];
      const y = data.y[i];
      if (Number.isFinite(x) && Number.isFinite(y)) {
        const screenX = this.toScreenX(x);
        const screenY = this.toScreenY(y);
        context.moveTo(screenX + radius, screenY);
        context.arc(screenX, screenY, radius, 0, Math.PI * 2);
      }
    }
    context.fill();
  }

  render(): void {
    const { context, theme } = this;
    if (context == null) {
      return;
    }
    context.clearRect(0, 0, this.width, this.height);

    for (let i = 0; i < this.descriptors.length; i += 1) {
      const descriptor = this.descriptors[i];
      const data = this.seriesData.get(descriptor.id) ?? createSeriesData();
      if (data.length > 0) {
        const color = getSeriesColor(theme, i, descriptor.style?.color);
        if (descriptor.type === 'line') {
          this.drawLine(
            data,
            color,
            descriptor.style?.lineWidth ?? theme.lineWidth
          );
        } else {
          this.drawScatter(
            data,
            color,
            descriptor.style?.pointSize ?? theme.pointSize
          );
        }
      }
    }
  }

  destroy(): void {
    this.seriesData.clear();
    this.descriptors = [];
    this.context = null;
  }
}

export const canvasRendererFactory: PlotRendererFactory = {
  name: 'canvas',
  capabilities: CAPABILITIES,
  isSupported: async () =>
    typeof document !== 'undefined' &&
    typeof document.createElement('canvas').getContext === 'function',
  create: () => new CanvasRenderer(),
};

export default CanvasRenderer;
