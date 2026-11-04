import {
  AbstractPlotDataSource,
  createRandom,
  createSeriesData,
  type Bounds,
  type PlotShape,
  type SeriesData,
  type SeriesDataRequest,
  type SeriesDataResult,
  type SeriesDelta,
  type SeriesStyle,
} from '@deephaven/plot';
import type { StreamableSource } from './StreamableSource';

export interface Point {
  x: number;
  y: number;
}

export interface RollingScatterSeriesDefinition {
  id: string;
  name: string;
  style?: SeriesStyle;
  /**
   * Writes a new point into `out`. `time` advances by 1 per tick and
   * fractionally between the points generated within a tick.
   */
  sample: (time: number, random: () => number, out: Point) => void;
}

export interface RollingScatterSourceOptions {
  /** Points held per series. Once full, the newest points replace the oldest. */
  pointsPerSeries: number;
  /** Points replaced per series on every tick. */
  pointsPerTick: number;
  /** Milliseconds between ticks. Omit to tick once per animation frame. */
  intervalMs?: number;
  /** Fixed axis bounds, so a tick never has to rescan the whole buffer. */
  bounds: Bounds;
  /** Fixed seed keeps demo and e2e output reproducible. */
  seed?: number;
  title?: string;
  xAxisLabel?: string;
  yAxisLabel?: string;
}

/**
 * A scatter series held in a fixed size ring buffer.
 *
 * Every tick overwrites the oldest points in place and emits them as `update`
 * deltas, so the point count stays constant and a renderer that supports
 * incremental updates only uploads the points that changed. Nothing is ever
 * downsampled: the renderer always holds and draws every point, which makes
 * this a direct measure of raw renderer throughput.
 */
export class RollingScatterSource
  extends AbstractPlotDataSource
  implements StreamableSource
{
  private series: RollingScatterSeriesDefinition[];

  private options: RollingScatterSourceOptions;

  private random: () => number;

  private buffers = new Map<string, SeriesData>();

  /** Index of the oldest point, which is the next to be replaced. */
  private cursor = 0;

  private tickCount = 0;

  private interval: ReturnType<typeof setInterval> | undefined;

  private frame: number | undefined;

  private point: Point = { x: 0, y: 0 };

  constructor(
    series: RollingScatterSeriesDefinition[],
    options: RollingScatterSourceOptions
  ) {
    super();
    this.series = series;
    this.options = {
      ...options,
      pointsPerSeries: Math.max(1, Math.floor(options.pointsPerSeries)),
      pointsPerTick: Math.max(
        1,
        Math.min(
          Math.floor(options.pointsPerTick),
          Math.floor(options.pointsPerSeries)
        )
      ),
    };
    this.random = createRandom(options.seed ?? 1);
    this.tick = this.tick.bind(this);
    this.handleFrame = this.handleFrame.bind(this);

    // Back fill as if the stream had already been running, so the buffer
    // starts full and the oldest points sit at the cursor
    const { pointsPerSeries, pointsPerTick } = this.options;
    const { point, random } = this;
    series.forEach(({ id, sample }) => {
      const data = createSeriesData(pointsPerSeries);
      for (let i = 0; i < pointsPerSeries; i += 1) {
        sample((i - pointsPerSeries) / pointsPerTick, random, point);
        data.x[i] = point.x;
        data.y[i] = point.y;
      }
      data.length = pointsPerSeries;
      this.buffers.set(id, data);
    });
  }

  getPointCount(): number {
    return this.options.pointsPerSeries * this.series.length;
  }

  getPointsPerTick(): number {
    return this.options.pointsPerTick * this.series.length;
  }

  async getShape(): Promise<PlotShape> {
    const { bounds, title, xAxisLabel, yAxisLabel } = this.options;
    return {
      series: this.series.map(({ id, name, style }) => ({
        id,
        name,
        type: 'scatter',
        style,
        bounds,
      })),
      bounds,
      title,
      xAxisLabel,
      yAxisLabel,
    };
  }

  async requestSeriesData(
    request: SeriesDataRequest
  ): Promise<SeriesDataResult> {
    const data = this.buffers.get(request.seriesId);
    if (data == null) {
      throw new Error(`Unknown series ${request.seriesId}`);
    }
    // Renderers copy what they are given, so the live buffer can be handed over
    return { data, complete: true };
  }

  /** Replaces the oldest points. Exposed so tests can drive it without timers. */
  tick(): void {
    const { pointsPerSeries, pointsPerTick } = this.options;
    const { point, random } = this;
    const deltas: SeriesDelta[] = [];

    for (let s = 0; s < this.series.length; s += 1) {
      const { id, sample } = this.series[s];
      const buffer = this.buffers.get(id) as SeriesData;
      let generated = 0;
      let offset = this.cursor;
      // A tick that runs past the end of the buffer wraps into a second delta
      while (generated < pointsPerTick) {
        const count = Math.min(
          pointsPerTick - generated,
          pointsPerSeries - offset
        );
        const chunk = createSeriesData(count);
        for (let i = 0; i < count; i += 1) {
          sample(
            this.tickCount + (generated + i) / pointsPerTick,
            random,
            point
          );
          chunk.x[i] = point.x;
          chunk.y[i] = point.y;
        }
        chunk.length = count;
        buffer.x.set(chunk.x, offset);
        buffer.y.set(chunk.y, offset);
        deltas.push({ type: 'update', seriesId: id, offset, data: chunk });
        generated += count;
        offset = (offset + count) % pointsPerSeries;
      }
    }

    this.cursor = (this.cursor + pointsPerTick) % pointsPerSeries;
    this.tickCount += 1;
    this.fireDataChanged(deltas);
  }

  private handleFrame(): void {
    this.tick();
    this.frame = requestAnimationFrame(this.handleFrame);
  }

  start(): void {
    if (this.isRunning()) {
      return;
    }
    const { intervalMs } = this.options;
    if (intervalMs == null) {
      this.frame = requestAnimationFrame(this.handleFrame);
    } else {
      this.interval = setInterval(this.tick, intervalMs);
    }
  }

  stop(): void {
    if (this.frame != null) {
      cancelAnimationFrame(this.frame);
      this.frame = undefined;
    }
    if (this.interval != null) {
      clearInterval(this.interval);
      this.interval = undefined;
    }
  }

  isRunning(): boolean {
    return this.frame != null || this.interval != null;
  }

  close(): void {
    this.stop();
    super.close();
  }
}

export default RollingScatterSource;
