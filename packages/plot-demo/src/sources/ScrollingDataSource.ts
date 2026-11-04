import {
  AbstractPlotDataSource,
  createRandom,
  createSeriesData,
  ensureSeriesCapacity,
  type Bounds,
  type PlotSeriesType,
  type PlotShape,
  type SeriesData,
  type SeriesDataRequest,
  type SeriesDataResult,
  type SeriesDelta,
  type SeriesStyle,
} from '@deephaven/plot';
import type { StreamableSource } from './StreamableSource';

export interface ScrollingSeriesDefinition {
  id: string;
  name: string;
  type: PlotSeriesType;
  style?: SeriesStyle;
  /** Returns the value at sample `x`. Called once per emitted sample, in order. */
  sample: (x: number, random: () => number) => number;
  /** Only emits every `stride`th sample, e.g. sparse markers over a line. Defaults to 1. */
  stride?: number;
}

export interface ScrollingDataSourceOptions {
  /** Width of the visible window, in samples. */
  windowSize: number;
  /** Samples generated per tick. Defaults to 1. */
  pointsPerTick?: number;
  /** Milliseconds between ticks when running. Defaults to 50. */
  intervalMs?: number;
  /** Pins the y axis rather than fitting it to the window. */
  yRange?: [number, number];
  /** Fixed seed keeps demo and e2e output reproducible. */
  seed?: number;
  title?: string;
  xAxisLabel?: string;
  yAxisLabel?: string;
}

interface WindowState {
  data: SeriesData;
  /** Index of the oldest sample still inside the window. */
  start: number;
}

function copyWindow({ data, start }: WindowState): SeriesData {
  const length = data.length - start;
  const copy = createSeriesData(length);
  copy.x.set(data.x.subarray(start, data.length));
  copy.y.set(data.y.subarray(start, data.length));
  copy.length = length;
  return copy;
}

/**
 * Streams a fixed width window of generated samples, like an oscilloscope.
 *
 * Every tick slides the window forward, so samples fall off the left edge as
 * new ones arrive on the right. Old points are dropped, which append deltas
 * cannot express, so each tick sends the visible window as a `replace` delta.
 * Windows are small enough that this is cheap and nothing is downsampled.
 */
export class ScrollingDataSource
  extends AbstractPlotDataSource
  implements StreamableSource
{
  private series: ScrollingSeriesDefinition[];

  private options: ScrollingDataSourceOptions;

  private random: () => number;

  private windows = new Map<string, WindowState>();

  private nextX = 0;

  private timer: ReturnType<typeof setInterval> | undefined;

  constructor(
    series: ScrollingSeriesDefinition[],
    options: ScrollingDataSourceOptions
  ) {
    super();
    this.series = series;
    this.options = options;
    this.random = createRandom(options.seed ?? 1);
    series.forEach(({ id }) => {
      this.windows.set(id, {
        data: createSeriesData(options.windowSize * 2),
        start: 0,
      });
    });
    this.generate(options.windowSize);
  }

  private generate(count: number): void {
    for (let i = 0; i < count; i += 1) {
      const x = this.nextX + i;
      for (let s = 0; s < this.series.length; s += 1) {
        const { id, sample, stride = 1 } = this.series[s];
        if (x % stride === 0) {
          const { data } = this.windows.get(id) as WindowState;
          ensureSeriesCapacity(data, data.length + 1);
          data.x[data.length] = x;
          data.y[data.length] = sample(x, this.random);
          data.length += 1;
        }
      }
    }
    this.nextX += count;

    const windowStart = this.nextX - this.options.windowSize;
    this.windows.forEach(state => {
      const { data } = state;
      while (state.start < data.length && data.x[state.start] < windowStart) {
        // eslint-disable-next-line no-param-reassign
        state.start += 1;
      }
      // Shift the live window back to the front once enough has scrolled off,
      // so the arrays stay bounded instead of growing forever
      if (state.start >= this.options.windowSize) {
        data.x.copyWithin(0, state.start, data.length);
        data.y.copyWithin(0, state.start, data.length);
        data.length -= state.start;
        // eslint-disable-next-line no-param-reassign
        state.start = 0;
      }
    });
  }

  private getBounds(): Bounds {
    const xMax = this.nextX - 1;
    const xMin = this.nextX - this.options.windowSize;
    const { yRange } = this.options;
    if (yRange != null) {
      return { xMin, xMax, yMin: yRange[0], yMax: yRange[1] };
    }
    let yMin = Infinity;
    let yMax = -Infinity;
    this.windows.forEach(({ data, start }) => {
      for (let i = start; i < data.length; i += 1) {
        yMin = Math.min(yMin, data.y[i]);
        yMax = Math.max(yMax, data.y[i]);
      }
    });
    return Number.isFinite(yMin)
      ? { xMin, xMax, yMin, yMax }
      : { xMin, xMax, yMin: 0, yMax: 1 };
  }

  private buildShape(): PlotShape {
    return {
      series: this.series.map(({ id, name, type, style }) => ({
        id,
        name,
        type,
        style,
      })),
      bounds: this.getBounds(),
      title: this.options.title,
      xAxisLabel: this.options.xAxisLabel,
      yAxisLabel: this.options.yAxisLabel,
    };
  }

  async getShape(): Promise<PlotShape> {
    return this.buildShape();
  }

  async requestSeriesData(
    request: SeriesDataRequest
  ): Promise<SeriesDataResult> {
    const state = this.windows.get(request.seriesId);
    if (state == null) {
      throw new Error(`Unknown series ${request.seriesId}`);
    }
    return { data: copyWindow(state), complete: true };
  }

  /** Advances the stream by one tick. Exposed so tests can drive it without timers. */
  tick(): void {
    this.generate(this.options.pointsPerTick ?? 1);
    const deltas: SeriesDelta[] = this.series.map(({ id }) => ({
      type: 'replace',
      seriesId: id,
      data: copyWindow(this.windows.get(id) as WindowState),
    }));
    this.fireShapeChanged(this.buildShape());
    this.fireDataChanged(deltas);
  }

  start(): void {
    if (this.timer == null) {
      this.timer = setInterval(
        () => this.tick(),
        this.options.intervalMs ?? 50
      );
    }
  }

  stop(): void {
    if (this.timer != null) {
      clearInterval(this.timer);
      this.timer = undefined;
    }
  }

  isRunning(): boolean {
    return this.timer != null;
  }

  close(): void {
    this.stop();
    super.close();
  }
}

export default ScrollingDataSource;
