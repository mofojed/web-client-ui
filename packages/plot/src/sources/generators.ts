import { createSeriesData, type SeriesData } from '../model/PlotTypes';
import { createRandom } from './createRandom';

/** Generates a noisy sine wave. Deterministic for a given seed. */
export function generateSine(
  count: number,
  {
    seed = 1,
    amplitude = 1,
    frequency = 1,
    phase = 0,
    noise = 0,
    xStart = 0,
    xStep = 1,
  }: {
    seed?: number;
    amplitude?: number;
    frequency?: number;
    phase?: number;
    noise?: number;
    xStart?: number;
    xStep?: number;
  } = {}
): SeriesData {
  const random = createRandom(seed);
  const data = createSeriesData(count);
  for (let i = 0; i < count; i += 1) {
    const x = xStart + i * xStep;
    data.x[i] = x;
    data.y[i] =
      amplitude * Math.sin(frequency * x + phase) +
      (random() - 0.5) * 2 * noise;
  }
  data.length = count;
  return data;
}

/** Generates a 2D gaussian-ish cloud of points. Deterministic for a given seed. */
export function generateCluster(
  count: number,
  {
    seed = 1,
    centerX = 0,
    centerY = 0,
    spreadX = 1,
    spreadY = 1,
  }: {
    seed?: number;
    centerX?: number;
    centerY?: number;
    spreadX?: number;
    spreadY?: number;
  } = {}
): SeriesData {
  const random = createRandom(seed);
  const data = createSeriesData(count);
  for (let i = 0; i < count; i += 1) {
    // Sum of three uniforms approximates a normal distribution well enough for demos
    const nx = random() + random() + random() - 1.5;
    const ny = random() + random() + random() - 1.5;
    data.x[i] = centerX + nx * spreadX;
    data.y[i] = centerY + ny * spreadY;
  }
  data.length = count;
  return data;
}

/**
 * Generates a spiky random walk. Useful for demonstrating that downsampling
 * preserves peaks that a naive stride would drop.
 */
export function generateSpikes(
  count: number,
  { seed = 1, spikeEvery = 5000, spikeScale = 25 } = {}
): SeriesData {
  const random = createRandom(seed);
  const data = createSeriesData(count);
  let value = 0;
  for (let i = 0; i < count; i += 1) {
    value += random() - 0.5;
    data.x[i] = i;
    data.y[i] = i % spikeEvery === 0 && i > 0 ? value + spikeScale : value;
  }
  data.length = count;
  return data;
}
