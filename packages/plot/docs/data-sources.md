# Data sources

A `PlotDataSource` is the only thing a plot needs. It has no Deephaven specific
concepts, so anything that can describe series and produce points can back a
plot.

## The contract

```ts
interface PlotDataSource {
  getShape: () => Promise<PlotShape>;
  requestSeriesData: (request: SeriesDataRequest) => Promise<SeriesDataResult>;
  addEventListener: ...;
  removeEventListener: ...;
  close?: () => void;
}
```

### Shape first

`getShape` is the only thing required up front. It returns the series list and,
if cheaply available, the overall bounds:

```ts
{
  series: [{ id: 'a', name: 'Ask', type: 'line' }],
  bounds: { xMin: 0, xMax: 1000, yMin: -5, yMax: 5 },
}
```

No point data is needed here. The bounds are used to pick the initial viewport;
omit them and the plot starts on a unit viewport until data arrives.

This split matters for large or remote data. A source can describe a billion row
table instantly, then serve only what the current viewport can actually resolve.

### Serving data

`requestSeriesData` receives the viewport, the plot area size in pixels, and the
series style, and returns the points to draw. See
[downsampling.md](downsampling.md) for how to use those parameters.

`complete` tells the plot whether the result contains every point the source
holds for that series:

| `complete` | Meaning                | Effect                                 |
| ---------- | ---------------------- | -------------------------------------- |
| `true`     | Nothing was dropped    | Deltas are applied incrementally       |
| `false`    | The result was reduced | Deltas trigger a fresh request instead |

Getting this wrong is the one way to corrupt a plot: reporting `complete: true`
for reduced data makes append offsets point at the wrong place. When in doubt,
report `false`.

For `line` series the result must be sorted ascending by `x`.

Requests carry an `AbortSignal` that fires when a newer viewport supersedes
them. Honour it for anything expensive.

### Notifying of changes

Extend `AbstractPlotDataSource` to get the event plumbing:

```ts
class MyDataSource extends AbstractPlotDataSource {
  onServerUpdate(points: SeriesData) {
    this.fireDataChanged([{ type: 'append', seriesId: 'a', data: points }]);
  }

  onSeriesAdded() {
    this.fireShapeChanged(this.buildShape());
  }
}
```

Deltas are expressed against the source's own data, and describe a change the
source has **already applied**:

| Delta     | Meaning                             |
| --------- | ----------------------------------- |
| `append`  | Points added to the end             |
| `update`  | Points changed starting at `offset` |
| `replace` | All data replaced                   |
| `clear`   | All data dropped                    |

Prefer `append` and `update` over `replace`. They are what lets the WebGPU
renderer write just the changed bytes into an existing GPU buffer instead of
re-uploading a series.

Do not mutate a `SeriesData` after handing it to a delta; renderers copy what
they need, but the plot may still be reading it.

## Bundled sources

- **`StaticDataSource`** — arrays already in memory, downsampled per request.
- **`StreamingDataSource`** — a seeded random walk that appends over time and
  emits `append` deltas. `tick()` drives it manually so tests do not need
  timers.

Both are seeded, which is what keeps the demo app and its e2e tests
deterministic.

## Adapting Deephaven

There is no Deephaven adapter yet. When one is written, the natural mapping is:

- `getShape` from the figure's chart and series descriptors,
- `requestSeriesData` to a table operation that reduces to the requested pixel
  width, returning `complete: false`,
- the figure's update events to `append` and `update` deltas.
