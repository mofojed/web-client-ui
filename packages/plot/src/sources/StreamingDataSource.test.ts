import type { SeriesDataRequest } from '../model/PlotDataSource';
import type { SeriesDelta } from '../model/PlotTypes';
import { StreamingDataSource } from './StreamingDataSource';

function makeRequest(seriesId: string): SeriesDataRequest {
  return {
    seriesId,
    viewport: { xMin: 0, xMax: 1000, yMin: -100, yMax: 100 },
    pixelSize: { width: 800, height: 400 },
    style: {},
  };
}

function makeSource(seed = 42): StreamingDataSource {
  return new StreamingDataSource(
    [
      { id: 'a', name: 'A', type: 'line', start: 0, volatility: 1 },
      { id: 'b', name: 'B', type: 'line', start: 10, volatility: 2 },
    ],
    { seed, initialPoints: 10, pointsPerTick: 3 }
  );
}

it('generates the initial points up front', async () => {
  const source = makeSource();
  const shape = await source.getShape();
  expect(shape.series.map(series => series.id)).toEqual(['a', 'b']);

  const result = await source.requestSeriesData(makeRequest('a'));
  expect(result.data.length).toBe(10);
  expect(result.complete).toBe(true);
  source.close();
});

it('emits append deltas on tick', async () => {
  const source = makeSource();
  const deltas: SeriesDelta[] = [];
  source.addEventListener('datachanged', event => deltas.push(...event.deltas));

  source.tick();

  expect(deltas).toHaveLength(2);
  expect(deltas[0]).toMatchObject({ type: 'append', seriesId: 'a' });
  expect(deltas[0].type === 'append' && deltas[0].data.length).toBe(3);

  const result = await source.requestSeriesData(makeRequest('a'));
  expect(result.data.length).toBe(13);
  source.close();
});

it('produces identical data for the same seed', async () => {
  const first = makeSource(7);
  const second = makeSource(7);
  first.tick();
  second.tick();

  const firstData = await first.requestSeriesData(makeRequest('a'));
  const secondData = await second.requestSeriesData(makeRequest('a'));
  expect(
    Array.from(firstData.data.y.subarray(0, firstData.data.length))
  ).toEqual(Array.from(secondData.data.y.subarray(0, secondData.data.length)));
  first.close();
  second.close();
});

it('produces different data for different seeds', async () => {
  const first = await makeSource(1).requestSeriesData(makeRequest('a'));
  const second = await makeSource(2).requestSeriesData(makeRequest('a'));
  expect(first.data.y[5]).not.toBe(second.data.y[5]);
});

it('starts and stops the timer', () => {
  jest.useFakeTimers();
  const source = new StreamingDataSource(
    [{ id: 'a', name: 'A', type: 'line' }],
    { seed: 1, initialPoints: 1, pointsPerTick: 1, intervalMs: 10 }
  );
  const listener = jest.fn();
  source.addEventListener('datachanged', listener);

  expect(source.isRunning()).toBe(false);
  source.start();
  expect(source.isRunning()).toBe(true);
  jest.advanceTimersByTime(35);
  expect(listener).toHaveBeenCalledTimes(3);

  source.stop();
  jest.advanceTimersByTime(100);
  expect(listener).toHaveBeenCalledTimes(3);
  jest.useRealTimers();
});

it('reports incomplete results once downsampling kicks in', async () => {
  const source = new StreamingDataSource(
    [{ id: 'a', name: 'A', type: 'line' }],
    { seed: 1, initialPoints: 20000 }
  );
  const result = await source.requestSeriesData({
    seriesId: 'a',
    viewport: { xMin: 0, xMax: 20000, yMin: -1000, yMax: 1000 },
    pixelSize: { width: 100, height: 100 },
    style: {},
  });
  expect(result.complete).toBe(false);
  expect(result.data.length).toBeLessThan(20000);
  source.close();
});
