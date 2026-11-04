import type { PlotDataSource } from '@deephaven/plot';
import { RollingScatterSource } from './sources/RollingScatterSource';
import { ScrollingDataSource } from './sources/ScrollingDataSource';
import { heartbeat, lissajous, orbitingCluster, randomWalk } from './samplers';

export interface CubeFace {
  title: string;
  createSource: () => PlotDataSource;
}

function signal(x: number): number {
  return 0.8 * Math.sin(x * 0.03) + 0.3 * Math.sin(x * 0.11);
}

/** One streaming plot per side of the cube, ordered front, right, back, left, top, bottom. */
export const CUBE_FACES: CubeFace[] = [
  {
    title: 'Oscilloscope',
    createSource: () =>
      new ScrollingDataSource(
        [
          {
            id: 'sine',
            name: 'Sine',
            type: 'line',
            sample: (x, random) => Math.sin(x * 0.06) + (random() - 0.5) * 0.06,
          },
          {
            id: 'harmonic',
            name: 'Harmonic',
            type: 'line',
            sample: x => 0.6 * Math.sin(x * 0.15 + 1),
          },
          {
            id: 'saw',
            name: 'Sawtooth',
            type: 'line',
            sample: x => 0.9 * (2 * ((x * 0.01) % 1) - 1),
          },
        ],
        {
          seed: 1,
          windowSize: 400,
          pointsPerTick: 4,
          intervalMs: 40,
          yRange: [-1.6, 1.6],
        }
      ),
  },
  {
    title: 'Orbiting clusters',
    createSource: () =>
      new RollingScatterSource(
        [
          {
            id: 'outer',
            name: 'Outer',
            style: { pointSize: 2.5 },
            sample: orbitingCluster({ radius: 6.5, speed: 0.04, spread: 1.6 }),
          },
          {
            id: 'middle',
            name: 'Middle',
            style: { pointSize: 2.5 },
            sample: orbitingCluster({
              radius: 3.5,
              speed: -0.07,
              phase: 2,
              spread: 1.2,
            }),
          },
          {
            id: 'inner',
            name: 'Inner',
            style: { pointSize: 2.5 },
            sample: orbitingCluster({
              radius: 1.2,
              speed: 0.12,
              phase: 4,
              spread: 0.8,
            }),
          },
        ],
        {
          seed: 2,
          pointsPerSeries: 3000,
          pointsPerTick: 150,
          intervalMs: 33,
          bounds: { xMin: -10, xMax: 10, yMin: -10, yMax: 10 },
        }
      ),
  },
  {
    title: 'Random walks',
    createSource: () =>
      new ScrollingDataSource(
        [
          { id: 'w1', name: 'Walk 1', type: 'line', sample: randomWalk(1) },
          { id: 'w2', name: 'Walk 2', type: 'line', sample: randomWalk(1.5) },
          { id: 'w3', name: 'Walk 3', type: 'line', sample: randomWalk(0.8) },
          { id: 'w4', name: 'Walk 4', type: 'line', sample: randomWalk(2) },
        ],
        { seed: 3, windowSize: 600, pointsPerTick: 5, intervalMs: 50 }
      ),
  },
  {
    title: 'Lissajous',
    createSource: () =>
      new RollingScatterSource(
        [
          {
            id: 'three-two',
            name: '3:2',
            style: { pointSize: 2 },
            sample: lissajous({ a: 3, b: 2, speed: 0.15, drift: 0.004 }),
          },
          {
            id: 'five-four',
            name: '5:4',
            style: { pointSize: 2 },
            sample: lissajous({ a: 5, b: 4, speed: 0.12, drift: -0.003 }),
          },
        ],
        {
          seed: 4,
          pointsPerSeries: 2500,
          pointsPerTick: 50,
          intervalMs: 33,
          bounds: { xMin: -1.1, xMax: 1.1, yMin: -1.1, yMax: 1.1 },
        }
      ),
  },
  {
    title: 'Heartbeat',
    createSource: () =>
      new ScrollingDataSource(
        [
          {
            id: 'lead-1',
            name: 'Lead I',
            type: 'line',
            style: { lineWidth: 2 },
            sample: heartbeat(160),
          },
          {
            id: 'lead-2',
            name: 'Lead II',
            type: 'line',
            sample: heartbeat(200, 60),
          },
        ],
        {
          seed: 5,
          windowSize: 500,
          pointsPerTick: 5,
          intervalMs: 40,
          yRange: [-0.5, 1.4],
        }
      ),
  },
  {
    title: 'Signal + samples',
    createSource: () =>
      new ScrollingDataSource(
        [
          { id: 'signal', name: 'Signal', type: 'line', sample: signal },
          {
            id: 'samples',
            name: 'Samples',
            type: 'scatter',
            style: { pointSize: 4 },
            stride: 6,
            sample: (x, random) => signal(x) + (random() - 0.5) * 0.5,
          },
        ],
        {
          seed: 6,
          windowSize: 500,
          pointsPerTick: 4,
          intervalMs: 50,
          yRange: [-1.6, 1.6],
        }
      ),
  },
];
