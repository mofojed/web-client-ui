import {
  seriesDataFromArrays,
  type SeriesData,
  type SeriesDelta,
} from '../model/PlotTypes';
import type {
  PlotRenderer,
  PlotRendererFactory,
} from '../renderers/PlotRenderer';
import { RendererRegistry } from '../renderers/RendererRegistry';
import { StaticDataSource } from '../sources/StaticDataSource';
import { generateSine } from '../sources/generators';
import { PlotView } from './PlotView';

/** Exposes the protected delta notification so tests can drive updates. */
class TestDataSource extends StaticDataSource {
  push(deltas: SeriesDelta[]): void {
    this.fireDataChanged(deltas);
  }
}

function makeRenderer(): PlotRenderer {
  return {
    name: 'mock',
    capabilities: {
      seriesTypes: ['scatter', 'line'],
      incrementalUpdates: true,
    },
    initialize: jest.fn(async () => undefined),
    setShape: jest.fn(),
    setSeriesData: jest.fn(),
    applyDeltas: jest.fn(),
    setViewport: jest.fn(),
    setTheme: jest.fn(),
    resize: jest.fn(),
    render: jest.fn(),
    destroy: jest.fn(),
  };
}

function makeRegistry(renderer: PlotRenderer): RendererRegistry {
  const factory: PlotRendererFactory = {
    name: 'mock',
    capabilities: renderer.capabilities,
    isSupported: async () => true,
    create: () => renderer,
  };
  const registry = new RendererRegistry();
  registry.register(factory);
  return registry;
}

function makeSource(data?: SeriesData): TestDataSource {
  return new TestDataSource([
    {
      id: 'a',
      name: 'A',
      type: 'line',
      data: data ?? seriesDataFromArrays([0, 1, 2], [0, 1, 0]),
    },
  ]);
}

function waitForIdle(view: PlotView): Promise<void> {
  return new Promise(resolve => {
    view.addEventListener('idle', () => resolve());
  });
}

let container: HTMLDivElement;
let boundingRectSpy: jest.SpyInstance;

beforeEach(() => {
  container = document.createElement('div');
  document.body.appendChild(container);
  boundingRectSpy = jest
    .spyOn(HTMLElement.prototype, 'getBoundingClientRect')
    .mockReturnValue(new DOMRect(0, 0, 800, 600));
});

afterEach(() => {
  boundingRectSpy.mockRestore();
  container.remove();
});

it('resolves a renderer and marks it on the container', async () => {
  const renderer = makeRenderer();
  const view = new PlotView(container, makeSource(), {
    registry: makeRegistry(renderer),
  });
  const idle = waitForIdle(view);
  await view.initialize();
  await idle;

  expect(view.getRendererName()).toBe('mock');
  expect(container.getAttribute('data-dh-plot-renderer')).toBe('mock');
  expect(container.getAttribute('data-dh-plot-status')).toBe('ready');
  view.destroy();
});

it('fails when no registered renderer supports the series types', async () => {
  const registry = new RendererRegistry();
  registry.register({
    name: 'scatter-only',
    capabilities: { seriesTypes: ['scatter'], incrementalUpdates: false },
    isSupported: async () => true,
    create: () => makeRenderer(),
  });

  const view = new PlotView(container, makeSource(), { registry });
  await expect(view.initialize()).rejects.toThrow(
    'No registered renderer supports series types: line'
  );
  view.destroy();
});

it('sizes the data canvas to the plot area inside the axis margins', async () => {
  const renderer = makeRenderer();
  const view = new PlotView(container, makeSource(), {
    registry: makeRegistry(renderer),
  });
  const idle = waitForIdle(view);
  await view.initialize();
  await idle;

  const area = view.getPlotArea();
  expect(area).toEqual({ left: 56, top: 16, width: 728, height: 552 });
  expect(renderer.resize).toHaveBeenCalledWith(728, 552, 1);
  view.destroy();
});

it('requests data for the initial viewport and hands it to the renderer', async () => {
  const renderer = makeRenderer();
  const source = makeSource();
  const requestSpy = jest.spyOn(source, 'requestSeriesData');
  const view = new PlotView(container, source, {
    registry: makeRegistry(renderer),
  });
  const idle = waitForIdle(view);
  await view.initialize();
  await idle;

  expect(requestSpy).toHaveBeenCalledWith(
    expect.objectContaining({
      seriesId: 'a',
      pixelSize: { width: 728, height: 552 },
      viewport: view.getViewport(),
    })
  );
  expect(renderer.setSeriesData).toHaveBeenCalledWith(
    'a',
    expect.objectContaining({ length: 3 })
  );
  view.destroy();
});

it('starts at the padded bounds of the data and resets back to them', async () => {
  const renderer = makeRenderer();
  const view = new PlotView(container, makeSource(), {
    registry: makeRegistry(renderer),
  });
  const idle = waitForIdle(view);
  await view.initialize();
  await idle;

  const home = view.getViewport();
  expect(home.xMin).toBeLessThan(0);
  expect(home.xMax).toBeGreaterThan(2);

  view.setViewport({ xMin: 0, xMax: 1, yMin: 0, yMax: 1 });
  expect(view.getViewport()).toEqual({ xMin: 0, xMax: 1, yMin: 0, yMax: 1 });

  view.resetViewport();
  expect(view.getViewport()).toEqual(home);
  view.destroy();
});

it('applies deltas directly when the renderer holds complete data', async () => {
  const renderer = makeRenderer();
  const source = makeSource();
  const view = new PlotView(container, source, {
    registry: makeRegistry(renderer),
  });
  const idle = waitForIdle(view);
  await view.initialize();
  await idle;

  const delta: SeriesDelta = {
    type: 'append',
    seriesId: 'a',
    data: seriesDataFromArrays([3], [1]),
  };
  source.push([delta]);

  expect(renderer.applyDeltas).toHaveBeenCalledWith([delta]);
  view.destroy();
});

it('refetches instead of applying deltas when the data was downsampled', async () => {
  const renderer = makeRenderer();
  const source = makeSource(generateSine(200_000, { frequency: 0.001 }));
  const view = new PlotView(container, source, {
    registry: makeRegistry(renderer),
  });
  const idle = waitForIdle(view);
  await view.initialize();
  await idle;

  const requestSpy = jest.spyOn(source, 'requestSeriesData');
  source.push([
    {
      type: 'append',
      seriesId: 'a',
      data: seriesDataFromArrays([1], [1]),
    },
  ]);

  expect(renderer.applyDeltas).not.toHaveBeenCalled();
  expect(requestSpy).toHaveBeenCalled();
  view.destroy();
});

it('stops listening and destroys the renderer on destroy', async () => {
  const renderer = makeRenderer();
  const view = new PlotView(container, makeSource(), {
    registry: makeRegistry(renderer),
  });
  const idle = waitForIdle(view);
  await view.initialize();
  await idle;

  view.destroy();

  expect(renderer.destroy).toHaveBeenCalled();
  expect(container.querySelector('canvas')).toBeNull();
});
