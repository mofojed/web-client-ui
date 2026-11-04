import type { SeriesDelta } from '@deephaven/plot';
import { ScrollingDataSource } from './ScrollingDataSource';

function makeSource(
  options: Partial<ConstructorParameters<typeof ScrollingDataSource>[1]> = {}
): ScrollingDataSource {
  return new ScrollingDataSource(
    [
      { id: 'line', name: 'Line', type: 'line', sample: x => x * 2 },
      {
        id: 'markers',
        name: 'Markers',
        type: 'scatter',
        stride: 5,
        sample: x => -x,
      },
    ],
    { windowSize: 20, pointsPerTick: 3, ...options }
  );
}

function request(source: ScrollingDataSource, seriesId: string) {
  return source.requestSeriesData({
    seriesId,
    viewport: { xMin: 0, xMax: 1, yMin: 0, yMax: 1 },
    pixelSize: { width: 100, height: 100 },
    style: {},
  });
}

it('starts with a full window of complete data', async () => {
  const source = makeSource();
  const { data, complete } = await request(source, 'line');
  expect(complete).toBe(true);
  expect(data.length).toBe(20);
  expect(data.x[0]).toBe(0);
  expect(data.y[19]).toBe(38);
});

it('only emits every stride samples', async () => {
  const { data } = await request(makeSource(), 'markers');
  expect(Array.from(data.x.subarray(0, data.length))).toEqual([0, 5, 10, 15]);
});

it('slides the window forward and replaces the visible data on each tick', async () => {
  const source = makeSource();
  const shapes: unknown[] = [];
  const deltas: SeriesDelta[][] = [];
  source.addEventListener('shapechanged', ({ shape }) => shapes.push(shape));
  source.addEventListener('datachanged', event => deltas.push(event.deltas));

  source.tick();

  expect(shapes).toHaveLength(1);
  expect(deltas).toHaveLength(1);
  const [lineDelta] = deltas[0];
  expect(lineDelta.type).toBe('replace');
  if (lineDelta.type !== 'replace') {
    throw new Error('Expected a replace delta');
  }
  expect(lineDelta.data.length).toBe(20);
  expect(lineDelta.data.x[0]).toBe(3);
  expect(lineDelta.data.x[19]).toBe(22);

  const shape = await source.getShape();
  expect(shape.bounds).toMatchObject({ xMin: 3, xMax: 22 });
});

it('keeps the window bounded however long it runs', async () => {
  const source = makeSource();
  for (let i = 0; i < 500; i += 1) {
    source.tick();
  }
  const { data } = await request(source, 'line');
  expect(data.length).toBe(20);
  expect(data.x[19]).toBe(20 + 500 * 3 - 1);
  // Every point in the window must still be in order after compaction
  for (let i = 1; i < data.length; i += 1) {
    expect(data.x[i]).toBe(data.x[i - 1] + 1);
  }
});

it('pins the y range when one is given', async () => {
  const shape = await makeSource({ yRange: [-1, 1] }).getShape();
  expect(shape.bounds).toEqual({ xMin: 0, xMax: 19, yMin: -1, yMax: 1 });
});

it('starts and stops ticking on a timer', () => {
  jest.useFakeTimers();
  try {
    const source = makeSource({ intervalMs: 10 });
    const onData = jest.fn();
    source.addEventListener('datachanged', onData);

    source.start();
    expect(source.isRunning()).toBe(true);
    jest.advanceTimersByTime(35);
    expect(onData).toHaveBeenCalledTimes(3);

    source.close();
    expect(source.isRunning()).toBe(false);
    jest.advanceTimersByTime(100);
    expect(onData).toHaveBeenCalledTimes(3);
  } finally {
    jest.useRealTimers();
  }
});
