import {
  applyDeltaToSeriesData,
  copySeriesData,
  type SeriesDelta,
} from '@deephaven/plot';
import { RollingScatterSource } from './RollingScatterSource';
import { isStreamable } from './StreamableSource';

const BOUNDS = { xMin: -1, xMax: 1, yMin: -1, yMax: 1 };

/** Writes the sample time as x so tests can see which points were replaced. */
function makeSource(pointsPerSeries = 10, pointsPerTick = 4) {
  return new RollingScatterSource(
    [
      {
        id: 'a',
        name: 'A',
        sample: (time, _random, out) => {
          // eslint-disable-next-line no-param-reassign
          out.x = time;
          // eslint-disable-next-line no-param-reassign
          out.y = 1;
        },
      },
      {
        id: 'b',
        name: 'B',
        sample: (time, random, out) => {
          // eslint-disable-next-line no-param-reassign
          out.x = time;
          // eslint-disable-next-line no-param-reassign
          out.y = random();
        },
      },
    ],
    { pointsPerSeries, pointsPerTick, bounds: BOUNDS, intervalMs: 10 }
  );
}

function request(source: RollingScatterSource, seriesId: string) {
  return source.requestSeriesData({
    seriesId,
    viewport: BOUNDS,
    pixelSize: { width: 10, height: 10 },
    style: {},
  });
}

it('starts with a full buffer that is never downsampled', async () => {
  const source = makeSource(1000, 10);
  const { data, complete } = await request(source, 'a');
  expect(complete).toBe(true);
  expect(data.length).toBe(1000);
  expect(source.getPointCount()).toBe(2000);
  expect(source.getPointsPerTick()).toBe(20);

  const shape = await source.getShape();
  expect(shape.bounds).toEqual(BOUNDS);
  expect(shape.series.map(series => series.type)).toEqual([
    'scatter',
    'scatter',
  ]);
});

it('replaces the oldest points with update deltas, wrapping around the buffer', async () => {
  const source = makeSource(10, 4);
  const received: SeriesDelta[][] = [];
  source.addEventListener('datachanged', ({ deltas }) => received.push(deltas));

  source.tick();
  source.tick();
  source.tick();

  const offsets = received.map(deltas =>
    deltas
      .filter(delta => delta.seriesId === 'a')
      .map(delta => (delta.type === 'update' ? delta.offset : -1))
  );
  // 0-3, 4-7, then 8-9 and a wrap back to 0-1
  expect(offsets).toEqual([[0], [4], [8, 0]]);

  const { data } = await request(source, 'a');
  expect(data.length).toBe(10);
  expect(data.x[0]).toBe(2.5);
  expect(data.x[9]).toBe(2.25);
  // The rest of the buffer still holds the first tick
  expect(data.x[2]).toBe(0.5);
});

it('produces deltas that rebuild the same buffer a renderer would hold', async () => {
  const source = makeSource(10, 3);
  let mirror = copySeriesData((await request(source, 'b')).data);
  source.addEventListener('datachanged', ({ deltas }) => {
    deltas
      .filter(delta => delta.seriesId === 'b')
      .forEach(delta => {
        mirror = applyDeltaToSeriesData(mirror, delta);
      });
  });

  for (let i = 0; i < 7; i += 1) {
    source.tick();
  }

  const { data } = await request(source, 'b');
  expect(Array.from(mirror.x.subarray(0, 10))).toEqual(
    Array.from(data.x.subarray(0, 10))
  );
  expect(Array.from(mirror.y.subarray(0, 10))).toEqual(
    Array.from(data.y.subarray(0, 10))
  );
});

it('caps points per tick at the buffer size', () => {
  const source = makeSource(5, 50);
  expect(source.getPointsPerTick()).toBe(10);
});

it('is streamable and stops ticking when closed', () => {
  jest.useFakeTimers();
  try {
    const source = makeSource();
    expect(isStreamable(source)).toBe(true);
    const onData = jest.fn();
    source.addEventListener('datachanged', onData);

    source.start();
    jest.advanceTimersByTime(25);
    expect(onData).toHaveBeenCalledTimes(2);

    source.close();
    expect(source.isRunning()).toBe(false);
    jest.advanceTimersByTime(100);
    expect(onData).toHaveBeenCalledTimes(2);
  } finally {
    jest.useRealTimers();
  }
});
