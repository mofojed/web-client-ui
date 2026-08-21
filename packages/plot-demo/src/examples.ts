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

export interface ExampleOptions {
  /** Skip downsampling so the renderer draws every point. */
  fullFidelity: boolean;
}

export interface PlotExample {
  id: string;
  name: string;
  description: string;
  /** How many plots to lay out side by side. Defaults to 1. */
  plotCount?: number;
  /** Points per plot, used for the stats readout. */
  pointsPerPlot?: number;
  /** Whether the full fidelity toggle applies to this example. */
  supportsFullFidelity?: boolean;
  createSource: (index: number, options: ExampleOptions) => PlotDataSource;
}

/** Plots in the "many plots" example. 8x8 grid. */
export const GRID_PLOT_COUNT = 64;

const GRID_POINTS_PER_PLOT = 50_000;

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
      `${GRID_POINTS_PER_PLOT.toLocaleString()} points each. WebGL caps a page ` +
      'at roughly 8-16 live contexts and drops the oldest beyond that; every ' +
      'WebGPU plot here shares a single device.',
    plotCount: GRID_PLOT_COUNT,
    pointsPerPlot: GRID_POINTS_PER_PLOT,
    supportsFullFidelity: true,
    createSource: (index, { fullFidelity }) =>
      new StaticDataSource(
        [
          {
            id: 'series',
            name: `#${index + 1}`,
            type: 'line',
            data: generateSpikes(GRID_POINTS_PER_PLOT, {
              seed: index + 1,
              spikeEvery: 6000,
            }),
          },
        ],
        fullFidelity ? { downsampler: identityDownsampler } : {}
      ),
  },
];

export function getExample(id: string): PlotExample {
  return examples.find(example => example.id === id) ?? examples[0];
}
