import {
  seriesDataFromArrays,
  type PlotShape,
  type SeriesData,
} from '../../model/PlotTypes';
import { defaultPlotTheme } from '../../theme/PlotTheme';
import { CanvasRenderer, canvasRendererFactory } from './CanvasRenderer';

const SHAPE: PlotShape = {
  series: [{ id: 'a', name: 'A', type: 'line' }],
};

async function makeRenderer(data: SeriesData): Promise<CanvasRenderer> {
  const renderer = new CanvasRenderer();
  await renderer.initialize(document.createElement('canvas'), defaultPlotTheme);
  renderer.resize(100, 100, 1);
  renderer.setShape(SHAPE);
  renderer.setSeriesData('a', data);
  return renderer;
}

it('reports support in a browser environment', async () => {
  expect(await canvasRendererFactory.isSupported()).toBe(true);
});

it('does not mutate the data the source handed it', async () => {
  // Sources are allowed to return their own arrays, so a delta applied by the
  // renderer must not append into them
  const sourceData = seriesDataFromArrays([0, 1, 2], [0, 1, 0]);
  const renderer = await makeRenderer(sourceData);

  renderer.applyDeltas([
    { type: 'append', seriesId: 'a', data: seriesDataFromArrays([3], [1]) },
  ]);

  expect(sourceData.length).toBe(3);
});

it('drops data for series removed from the shape', async () => {
  const renderer = await makeRenderer(seriesDataFromArrays([0, 1], [0, 1]));
  renderer.setShape({ series: [] });
  renderer.setViewport({ xMin: 0, xMax: 1, yMin: 0, yMax: 1 });

  expect(() => renderer.render()).not.toThrow();
});

it('renders scatter and line series without a viewport span', async () => {
  const renderer = await makeRenderer(seriesDataFromArrays([0, 1], [0, 1]));
  renderer.setShape({
    series: [
      { id: 'a', name: 'A', type: 'line' },
      { id: 'b', name: 'B', type: 'scatter' },
    ],
  });
  renderer.setSeriesData('b', seriesDataFromArrays([0, 1], [1, 0]));
  renderer.setViewport({ xMin: 0, xMax: 0, yMin: 0, yMax: 0 });

  expect(() => renderer.render()).not.toThrow();
});

it('skips non finite points', async () => {
  const renderer = await makeRenderer(
    seriesDataFromArrays([0, NaN, 2], [0, 1, 0])
  );
  renderer.setViewport({ xMin: 0, xMax: 2, yMin: 0, yMax: 1 });

  expect(() => renderer.render()).not.toThrow();
});
