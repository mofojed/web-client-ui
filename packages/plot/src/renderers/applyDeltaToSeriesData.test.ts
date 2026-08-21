import { seriesDataFromArrays } from '../model/PlotTypes';
import { applyDeltaToSeriesData } from './applyDeltaToSeriesData';

it('appends to existing data', () => {
  const existing = seriesDataFromArrays([1, 2], [10, 20]);
  const result = applyDeltaToSeriesData(existing, {
    type: 'append',
    seriesId: 'a',
    data: seriesDataFromArrays([3], [30]),
  });
  expect(result.length).toBe(3);
  expect(Array.from(result.y.subarray(0, 3))).toEqual([10, 20, 30]);
});

it('appends when there is no existing data', () => {
  const result = applyDeltaToSeriesData(undefined, {
    type: 'append',
    seriesId: 'a',
    data: seriesDataFromArrays([1], [10]),
  });
  expect(result.length).toBe(1);
});

it('updates in place at an offset', () => {
  const existing = seriesDataFromArrays([1, 2, 3], [10, 20, 30]);
  const result = applyDeltaToSeriesData(existing, {
    type: 'update',
    seriesId: 'a',
    offset: 1,
    data: seriesDataFromArrays([2, 3], [99, 98]),
  });
  expect(result.length).toBe(3);
  expect(Array.from(result.y.subarray(0, 3))).toEqual([10, 99, 98]);
});

it('grows when an update extends past the current length', () => {
  const existing = seriesDataFromArrays([1], [10]);
  const result = applyDeltaToSeriesData(existing, {
    type: 'update',
    seriesId: 'a',
    offset: 2,
    data: seriesDataFromArrays([3], [30]),
  });
  expect(result.length).toBe(3);
  expect(result.y[2]).toBe(30);
});

it('replaces all data', () => {
  const replacement = seriesDataFromArrays([5], [50]);
  const result = applyDeltaToSeriesData(
    seriesDataFromArrays([1, 2], [10, 20]),
    { type: 'replace', seriesId: 'a', data: replacement }
  );
  expect(result).toBe(replacement);
});

it('clears all data', () => {
  const result = applyDeltaToSeriesData(seriesDataFromArrays([1], [10]), {
    type: 'clear',
    seriesId: 'a',
  });
  expect(result.length).toBe(0);
});
