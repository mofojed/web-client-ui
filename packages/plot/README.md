# @deephaven/plot

A plotting library built from the ground up around swappable GPU renderers and
data sources that are not tied to Deephaven.

WebGPU is the primary renderer. A Canvas 2D renderer ships as the fallback for
platforms where WebGPU is unavailable. Scatter and line series are supported
today.

## Install

```bash
npm install --save @deephaven/plot
```

## Usage

```tsx
import { Plot, StaticDataSource, seriesDataFromArrays } from '@deephaven/plot';

const source = new StaticDataSource([
  {
    id: 'sine',
    name: 'Sine',
    type: 'line',
    data: seriesDataFromArrays([0, 1, 2, 3], [0, 1, 0, -1]),
  },
]);

function MyPlot() {
  return <Plot source={source} rendererPreference={['webgpu', 'canvas']} />;
}
```

The renderer preference is a fallback chain. The first renderer that is both
registered and supported on the current platform, and that can draw every series
type in the plot, is used. Omit `rendererPreference` to use the registration
order of the registry, which defaults to WebGPU then Canvas.

### Without React

`Plot` is a thin wrapper over `PlotView`, which has no framework dependency:

```ts
import { PlotView } from '@deephaven/plot';

const view = new PlotView(containerElement, source);
await view.initialize();
// ...
view.destroy();
```

### Custom data sources

Implement `PlotDataSource` to plot anything. Only the shape is required up
front; point data is pulled per viewport so a source can push filtering and
downsampling to wherever the data lives.

```ts
import { AbstractPlotDataSource } from '@deephaven/plot';

class MyDataSource extends AbstractPlotDataSource {
  async getShape() {
    return { series: [{ id: 'a', name: 'A', type: 'line' as const }] };
  }

  async requestSeriesData({ viewport, pixelSize }) {
    const data = await fetchPoints(viewport, pixelSize.width);
    return { data, complete: false };
  }
}
```

See [docs/data-sources.md](docs/data-sources.md) for the full contract,
including how to emit incremental updates.

## Documentation

- [Architecture](docs/architecture.md) — how the model, view, and renderers fit
  together
- [Data sources](docs/data-sources.md) — implementing a source and emitting
  deltas
- [Downsampling](docs/downsampling.md) — the request contract and the bundled
  downsamplers

## Demo app

`@deephaven/plot-demo` is a standalone app for iterating on plots without a
Deephaven server:

```bash
npm run start:plot-demo
```
