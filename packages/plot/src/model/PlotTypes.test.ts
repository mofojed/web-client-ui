import {
  appendSeriesData,
  boundsEqual,
  createSeriesData,
  ensureSeriesCapacity,
  getSeriesBounds,
  padBounds,
  seriesDataFromArrays,
  unionBounds,
} from './PlotTypes';

describe('seriesDataFromArrays', () => {
  it('copies both arrays and uses the shorter length', () => {
    const data = seriesDataFromArrays([1, 2, 3], [4, 5]);
    expect(data.length).toBe(2);
    expect(Array.from(data.x.subarray(0, 2))).toEqual([1, 2]);
    expect(Array.from(data.y.subarray(0, 2))).toEqual([4, 5]);
  });
});

describe('ensureSeriesCapacity', () => {
  it('grows by doubling and preserves existing values', () => {
    const data = seriesDataFromArrays([1, 2], [3, 4]);
    ensureSeriesCapacity(data, 5);
    expect(data.x.length).toBeGreaterThanOrEqual(5);
    expect(data.x[0]).toBe(1);
    expect(data.y[1]).toBe(4);
    expect(data.length).toBe(2);
  });

  it('does nothing when capacity is already sufficient', () => {
    const data = createSeriesData(10);
    const { x } = data;
    ensureSeriesCapacity(data, 4);
    expect(data.x).toBe(x);
  });
});

describe('appendSeriesData', () => {
  it('appends and grows as needed', () => {
    const target = seriesDataFromArrays([1], [10]);
    appendSeriesData(target, seriesDataFromArrays([2, 3], [20, 30]));
    expect(target.length).toBe(3);
    expect(Array.from(target.x.subarray(0, 3))).toEqual([1, 2, 3]);
    expect(Array.from(target.y.subarray(0, 3))).toEqual([10, 20, 30]);
  });
});

describe('getSeriesBounds', () => {
  it('returns undefined for empty data', () => {
    expect(getSeriesBounds(createSeriesData(4))).toBeUndefined();
  });

  it('ignores non finite values', () => {
    const data = seriesDataFromArrays([1, NaN, 3], [5, 100, 7]);
    expect(getSeriesBounds(data)).toEqual({
      xMin: 1,
      xMax: 3,
      yMin: 5,
      yMax: 7,
    });
  });
});

describe('unionBounds', () => {
  it('returns the other side when one is undefined', () => {
    const bounds = { xMin: 0, xMax: 1, yMin: 0, yMax: 1 };
    expect(unionBounds(undefined, bounds)).toBe(bounds);
    expect(unionBounds(bounds, undefined)).toBe(bounds);
  });

  it('expands to contain both', () => {
    expect(
      unionBounds(
        { xMin: 0, xMax: 1, yMin: 0, yMax: 1 },
        { xMin: -1, xMax: 0.5, yMin: 2, yMax: 3 }
      )
    ).toEqual({ xMin: -1, xMax: 1, yMin: 0, yMax: 3 });
  });
});

describe('padBounds', () => {
  it('expands degenerate bounds so a single point is still visible', () => {
    expect(padBounds({ xMin: 5, xMax: 5, yMin: 5, yMax: 5 })).toEqual({
      xMin: 4.5,
      xMax: 5.5,
      yMin: 4.5,
      yMax: 5.5,
    });
  });

  it('applies a proportional margin', () => {
    expect(padBounds({ xMin: 0, xMax: 10, yMin: 0, yMax: 20 }, 0.1)).toEqual({
      xMin: -1,
      xMax: 11,
      yMin: -2,
      yMax: 22,
    });
  });
});

describe('boundsEqual', () => {
  it('treats tiny differences as equal', () => {
    const a = { xMin: 0, xMax: 100, yMin: 0, yMax: 100 };
    const b = { xMin: 1e-12, xMax: 100, yMin: 0, yMax: 100 };
    expect(boundsEqual(a, b)).toBe(true);
  });

  it('detects real differences', () => {
    expect(
      boundsEqual(
        { xMin: 0, xMax: 1, yMin: 0, yMax: 1 },
        { xMin: 0, xMax: 2, yMin: 0, yMax: 1 }
      )
    ).toBe(false);
  });
});
