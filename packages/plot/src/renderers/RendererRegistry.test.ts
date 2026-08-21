import type { PlotSeriesType } from '../model/PlotTypes';
import type { PlotRenderer, PlotRendererFactory } from './PlotRenderer';
import { RendererRegistry } from './RendererRegistry';

function makeFactory(
  name: string,
  {
    supported = true,
    seriesTypes = ['scatter', 'line'] as PlotSeriesType[],
  }: { supported?: boolean; seriesTypes?: PlotSeriesType[] } = {}
): PlotRendererFactory {
  return {
    name,
    capabilities: { seriesTypes, incrementalUpdates: false },
    isSupported: jest.fn(async () => supported),
    create: jest.fn(() => ({ name }) as unknown as PlotRenderer),
  };
}

let registry: RendererRegistry;

beforeEach(() => {
  registry = new RendererRegistry();
});

it('resolves the first supported renderer in preference order', async () => {
  registry.register(makeFactory('webgpu'));
  registry.register(makeFactory('canvas'));

  const factory = await registry.resolve({ preference: ['canvas', 'webgpu'] });
  expect(factory?.name).toBe('canvas');
});

it('falls back to the next preference when a renderer is unsupported', async () => {
  registry.register(makeFactory('webgpu', { supported: false }));
  registry.register(makeFactory('canvas'));

  const factory = await registry.resolve({ preference: ['webgpu', 'canvas'] });
  expect(factory?.name).toBe('canvas');
});

it('skips renderers that cannot draw the required series types', async () => {
  registry.register(makeFactory('lines-only', { seriesTypes: ['line'] }));
  registry.register(makeFactory('canvas'));

  const factory = await registry.resolve({
    preference: ['lines-only', 'canvas'],
    seriesTypes: ['scatter'],
  });
  expect(factory?.name).toBe('canvas');
});

it('uses registration order when no preference is given', async () => {
  registry.register(makeFactory('webgpu'));
  registry.register(makeFactory('canvas'));

  const factory = await registry.resolve();
  expect(factory?.name).toBe('webgpu');
});

it('returns undefined when nothing matches', async () => {
  registry.register(makeFactory('webgpu', { supported: false }));

  expect(await registry.resolve({ preference: ['webgpu'] })).toBeUndefined();
  expect(await registry.resolve({ preference: ['missing'] })).toBeUndefined();
});

it('treats a support check that throws as unsupported', async () => {
  const factory = makeFactory('broken');
  factory.isSupported = jest.fn(async () => {
    throw new Error('no adapter');
  });
  registry.register(factory);
  registry.register(makeFactory('canvas'));

  const resolved = await registry.resolve({
    preference: ['broken', 'canvas'],
  });
  expect(resolved?.name).toBe('canvas');
});

it('only probes support once per renderer', async () => {
  const factory = makeFactory('webgpu');
  registry.register(factory);

  await registry.resolve({ preference: ['webgpu'] });
  await registry.resolve({ preference: ['webgpu'] });

  expect(factory.isSupported).toHaveBeenCalledTimes(1);
});

it('re-probes after a renderer is registered again', async () => {
  const first = makeFactory('webgpu', { supported: false });
  registry.register(first);
  expect(await registry.isSupported('webgpu')).toBe(false);

  const second = makeFactory('webgpu', { supported: true });
  registry.register(second);
  expect(await registry.isSupported('webgpu')).toBe(true);
});

it('lists and removes renderers', () => {
  registry.register(makeFactory('webgpu'));
  registry.register(makeFactory('canvas'));
  expect(registry.getNames()).toEqual(['webgpu', 'canvas']);

  registry.unregister('webgpu');
  expect(registry.getNames()).toEqual(['canvas']);
  expect(registry.get('webgpu')).toBeUndefined();
});
