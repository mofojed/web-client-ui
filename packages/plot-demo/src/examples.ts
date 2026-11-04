import {
  identityDownsampler,
  lttbDownsampler,
  StaticDataSource,
  StreamingDataSource,
  generateCluster,
  generateSine,
  generateSpikes,
  type PlotDataSource,
} from '@deephaven/plot';
import { CUBE_FACES } from './cubeFaces';
import { spiralArm } from './samplers';
import { RollingScatterSource } from './sources/RollingScatterSource';

export interface StressOptions {
  /** Total points across every series. */
  pointCount: number;
  /** Fraction of the points replaced on every frame, from 0 to 1. */
  refreshFraction: number;
  pointSize: number;
}

export interface ExampleOptions {
  /** Skip downsampling so the renderer draws every point. */
  fullFidelity: boolean;
  /** Only read by examples with `supportsStressControls`. */
  stress: StressOptions;
}

export type ExampleLayout = 'single' | 'grid' | 'cube';

export interface PlotExample {
  id: string;
  name: string;
  description: string;
  /** How the plots are arranged. Defaults to `grid` for many plots, otherwise `single`. */
  layout?: ExampleLayout;
  /** How many plots to lay out side by side. Defaults to 1. */
  plotCount?: number;
  /** Labels shown with each plot, by index. */
  plotTitles?: string[];
  /** Points per plot, used for the stats readout. */
  pointsPerPlot?: number;
  /** Whether the full fidelity toggle applies to this example. */
  supportsFullFidelity?: boolean;
  /** Whether the point count, refresh rate, and point size controls apply. */
  supportsStressControls?: boolean;
  /** Starts streaming as soon as the example loads. */
  autoStart?: boolean;
  createSource: (index: number, options: ExampleOptions) => PlotDataSource;
}

/** Plots in the "many plots" example. 8x8 grid. */
export const GRID_PLOT_COUNT = 64;

const GRID_POINTS_PER_PLOT = 50_000;

/** Spiral arms in the scatter stress example, one series and color each. */
export const STRESS_SERIES_COUNT = 4;

export const STRESS_POINT_COUNTS = [
  10_000, 100_000, 250_000, 500_000, 1_000_000, 2_000_000, 5_000_000,
  10_000_000,
];

export const STRESS_REFRESH_FRACTIONS = [0.01, 0.1, 0.25, 1];

export const STRESS_POINT_SIZES = [1, 2, 3, 5];

export const DEFAULT_STRESS_OPTIONS: StressOptions = {
  pointCount: 100_000,
  refreshFraction: 0.1,
  pointSize: 2,
};

const GALAXY_RADIUS = 10;

function createStressSource({
  pointCount,
  refreshFraction,
  pointSize,
}: StressOptions): RollingScatterSource {
  const pointsPerSeries = Math.ceil(pointCount / STRESS_SERIES_COUNT);
  const bound = GALAXY_RADIUS * 1.2;
  return new RollingScatterSource(
    Array.from({ length: STRESS_SERIES_COUNT }, (_unused, index) => ({
      id: `arm-${index}`,
      name: `Arm ${index + 1}`,
      style: { pointSize },
      sample: spiralArm({
        angle: (index * 2 * Math.PI) / STRESS_SERIES_COUNT,
        radius: GALAXY_RADIUS,
        speed: 0.004,
      }),
    })),
    {
      seed: 42,
      pointsPerSeries,
      pointsPerTick: Math.ceil(pointsPerSeries * refreshFraction),
      bounds: { xMin: -bound, xMax: bound, yMin: -bound, yMax: bound },
      title: 'Scatter stress',
    }
  );
}

/**
 * Every example is seeded so the demo renders identically on every run, which
 * is what makes the e2e screenshot snapshots stable.
 */
export const examples: PlotExample[] = [
  {
    id: 'scatter',
    name: 'Scatter',
    description: 'Three clusters of 2,000 points each.',
    createSource: () =>
      new StaticDataSource(
        [
          {
            id: 'alpha',
            name: 'Alpha',
            type: 'scatter',
            data: generateCluster(2000, {
              seed: 11,
              centerX: -3,
              centerY: 2,
              spreadX: 1.2,
              spreadY: 1,
            }),
          },
          {
            id: 'beta',
            name: 'Beta',
            type: 'scatter',
            data: generateCluster(2000, {
              seed: 22,
              centerX: 1,
              centerY: -1,
              spreadX: 1,
              spreadY: 1.4,
            }),
          },
          {
            id: 'gamma',
            name: 'Gamma',
            type: 'scatter',
            data: generateCluster(2000, {
              seed: 33,
              centerX: 4,
              centerY: 3,
              spreadX: 1.5,
              spreadY: 0.8,
            }),
          },
        ],
        { title: 'Scatter', xAxisLabel: 'X', yAxisLabel: 'Y' }
      ),
  },
  {
    id: 'line',
    name: 'Line',
    description: 'Three noisy sine waves of 5,000 points each.',
    createSource: () =>
      new StaticDataSource(
        [
          {
            id: 'sine',
            name: 'Sine',
            type: 'line',
            data: generateSine(5000, {
              seed: 1,
              frequency: 0.01,
              noise: 0.05,
            }),
          },
          {
            id: 'cosine',
            name: 'Cosine',
            type: 'line',
            data: generateSine(5000, {
              seed: 2,
              frequency: 0.01,
              phase: Math.PI / 2,
              amplitude: 0.75,
              noise: 0.05,
            }),
          },
          {
            id: 'slow',
            name: 'Slow',
            type: 'line',
            data: generateSine(5000, {
              seed: 3,
              frequency: 0.002,
              amplitude: 1.5,
              noise: 0.02,
            }),
          },
        ],
        { title: 'Line', xAxisLabel: 'Sample', yAxisLabel: 'Value' }
      ),
  },
  {
    id: 'mixed',
    name: 'Mixed',
    description: 'A line series with a scatter series overlaid.',
    createSource: () =>
      new StaticDataSource([
        {
          id: 'trend',
          name: 'Trend',
          type: 'line',
          data: generateSine(2000, { seed: 5, frequency: 0.01, noise: 0.02 }),
        },
        {
          id: 'samples',
          name: 'Samples',
          type: 'scatter',
          style: { pointSize: 7 },
          data: generateSine(120, {
            seed: 6,
            frequency: 0.01,
            xStep: 16,
            noise: 0.15,
          }),
        },
      ]),
  },
  {
    id: 'downsample',
    name: 'Downsample (1M)',
    description:
      'One million points with periodic spikes. Zoom in to see detail resolve.',
    createSource: () =>
      new StaticDataSource(
        [
          {
            id: 'spikes',
            name: 'Spikes',
            type: 'line',
            data: generateSpikes(1_000_000, { seed: 7 }),
          },
        ],
        { title: 'Downsample' }
      ),
  },
  {
    id: 'downsample-lttb',
    name: 'Downsample (LTTB)',
    description:
      'The same million points reduced with LTTB instead of min/max, which clips spikes.',
    createSource: () =>
      new StaticDataSource(
        [
          {
            id: 'spikes',
            name: 'Spikes',
            type: 'line',
            data: generateSpikes(1_000_000, { seed: 7 }),
          },
        ],
        { downsampler: lttbDownsampler }
      ),
  },
  {
    id: 'streaming',
    name: 'Streaming',
    description:
      'Four random walks appending points every 100ms as incremental deltas.',
    createSource: () =>
      new StreamingDataSource(
        [
          { id: 'w1', name: 'Walk 1', type: 'line', start: 0, volatility: 1 },
          { id: 'w2', name: 'Walk 2', type: 'line', start: 5, volatility: 1.5 },
          {
            id: 'w3',
            name: 'Walk 3',
            type: 'line',
            start: -5,
            volatility: 0.8,
          },
          { id: 'w4', name: 'Walk 4', type: 'line', start: 10, volatility: 2 },
        ],
        {
          seed: 99,
          initialPoints: 500,
          pointsPerTick: 5,
          intervalMs: 100,
          title: 'Streaming',
        }
      ),
  },
  {
    id: 'many',
    name: `Many plots (${GRID_PLOT_COUNT})`,
    description:
      `${GRID_PLOT_COUNT} independent plots of ` +
      `${GRID_POINTS_PER_PLOT.toLocaleString()} points each, all ticking at ` +
      'once. WebGL caps a page at roughly 8-16 live contexts and drops the ' +
      'oldest beyond that; every WebGPU plot here shares a single device.',
    plotCount: GRID_PLOT_COUNT,
    pointsPerPlot: GRID_POINTS_PER_PLOT,
    supportsFullFidelity: true,
    createSource: (index, { fullFidelity }) =>
      new StreamingDataSource(
        [
          {
            id: 'series',
            name: `#${index + 1}`,
            type: 'line',
            start: 0,
            volatility: 1 + (index % 4) * 0.5,
          },
        ],
        {
          seed: index + 1,
          initialPoints: GRID_POINTS_PER_PLOT,
          pointsPerTick: 25,
          intervalMs: 250,
          ...(fullFidelity ? { downsampler: identityDownsampler } : {}),
        }
      ),
  },
  {
    id: 'cube',
    name: 'Plot cube',
    description:
      'Six different streaming plots on the faces of a cube. Drag or use the ' +
      'arrow keys to spin it, and explode it to pull the faces apart. Every ' +
      'face keeps streaming while it rotates.',
    layout: 'cube',
    plotCount: CUBE_FACES.length,
    plotTitles: CUBE_FACES.map(face => face.title),
    autoStart: true,
    createSource: index => CUBE_FACES[index].createSource(),
  },
  {
    id: 'scatter-stress',
    name: 'Scatter stress',
    description:
      'A rotating spiral galaxy that is never downsampled, so every point is ' +
      'drawn on every frame. Points are replaced oldest first, once per ' +
      'animation frame, as incremental updates. Raise the point count to find ' +
      "where the renderer's frame rate drops.",
    supportsStressControls: true,
    autoStart: true,
    createSource: (_index, { stress }) => createStressSource(stress),
  },
];

export function getExample(id: string): PlotExample {
  return examples.find(example => example.id === id) ?? examples[0];
}
