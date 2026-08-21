import type { SeriesDataRequest } from '../model/PlotDataSource';
import { seriesDataFromArrays, type SeriesData } from '../model/PlotTypes';
import {
  identityDownsampler,
  lttbDownsampler,
  minMaxDownsampler,
} from './Downsampler';

function makeRequest(
  width: number,
  xMin: number,
  xMax: number
): SeriesDataRequest {
  return {
    seriesId: 'test',
    viewport: { xMin, xMax, yMin: -1000, yMax: 1000 },
    pixelSize: { width, height: 100 },
    style: {},
  };
}

function makeRamp(count: number): SeriesData {
  const x = new Float64Array(count);
  const y = new Float64Array(count);
  for (let i = 0; i < count; i += 1) {
    x[i] = i;
    y[i] = Math.sin(i / 100);
  }
  return seriesDataFromArrays(x, y);
}

describe('identityDownsampler', () => {
  it('returns the input untouched', () => {
    const data = makeRamp(10);
    expect(identityDownsampler(data, makeRequest(100, 0, 10))).toBe(data);
  });
});

describe('minMaxDownsampler', () => {
  it('returns the input when it already fits the pixel budget', () => {
    const data = makeRamp(100);
    expect(minMaxDownsampler(data, makeRequest(100, 0, 100))).toBe(data);
  });

  it('reduces a large series but keeps it far smaller than the input', () => {
    const data = makeRamp(100_000);
    const result = minMaxDownsampler(data, makeRequest(500, 0, 100_000));
    expect(result.length).toBeLessThan(data.length / 10);
    expect(result.length).toBeGreaterThan(0);
  });

  it('preserves the extremes of every pixel column', () => {
    const count = 10_000;
    const x = new Float64Array(count);
    const y = new Float64Array(count);
    for (let i = 0; i < count; i += 1) {
      x[i] = i;
      y[i] = 0;
    }
    // A single spike that a stride based reducer would drop
    y[5001] = 999;
    const data = seriesDataFromArrays(x, y);

    const result = minMaxDownsampler(data, makeRequest(100, 0, count));
    expect(Array.from(result.y.subarray(0, result.length))).toContain(999);
  });

  it('keeps output sorted ascending by x', () => {
    const data = makeRamp(50_000);
    const result = minMaxDownsampler(data, makeRequest(300, 0, 50_000));
    for (let i = 1; i < result.length; i += 1) {
      expect(result.x[i]).toBeGreaterThanOrEqual(result.x[i - 1]);
    }
  });
});

describe('lttbDownsampler', () => {
  it('returns the input when it is under the threshold', () => {
    const data = makeRamp(50);
    expect(lttbDownsampler(data, makeRequest(100, 0, 50))).toBe(data);
  });

  it('reduces to the pixel budget and keeps the endpoints', () => {
    const data = makeRamp(10_000);
    const result = lttbDownsampler(data, makeRequest(200, 0, 10_000));
    expect(result.length).toBe(200);
    expect(result.x[0]).toBe(data.x[0]);
    expect(result.x[result.length - 1]).toBe(data.x[data.length - 1]);
  });
});
