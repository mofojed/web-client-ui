# Downsampling

A plot can only show as much detail as it has pixels. Sending a million points
into a 900 pixel wide plot costs bandwidth, memory, and GPU time to draw
something indistinguishable from a few thousand points.

Downsampling in this package is a property of the **data source**, not the
renderer. The renderer asks for what it needs to draw and the source decides how
to satisfy that. In memory that means running a reducer; against a server it
means pushing the work down as a query.

## The request

```ts
interface SeriesDataRequest {
  seriesId: string;
  viewport: Bounds; // the region of data space being drawn
  pixelSize: PixelSize; // the size of the plot area
  style: SeriesStyle; // affects how much detail is actually visible
  signal?: AbortSignal; // aborted when a newer viewport supersedes this one
}
```

`viewport` and `pixelSize` together define the smallest distinguishable
difference: one pixel column is `(xMax - xMin) / pixelSize.width` in data space.
Anything finer than that cannot be seen.

`style` matters because a 10 pixel wide line hides more detail than a 1 pixel
one, and a scatter series cannot drop points the way a line can without changing
what the plot means.

A new request is made whenever the viewport or the plot size changes, so zooming
in naturally resolves more detail.

## Bundled downsamplers

A `Downsampler` reduces a fully materialized series for one request:

```ts
type Downsampler = (
  input: SeriesData,
  request: SeriesDataRequest
) => SeriesData;
```

### `minMaxDownsampler` (default)

Keeps the first, last, minimum, and maximum point of every pixel column, plus
one point outside each edge so lines still enter and exit the plot.

This is lossless _for the requested resolution_: the rasterized result is pixel
identical to drawing every point, because the extremes that define each column's
vertical extent are all preserved. It is the right default, and it is what a
server side downsample should aim to reproduce.

Output size scales with pixel width rather than input size, at up to four points
per column.

### `lttbDownsampler`

Largest Triangle Three Buckets. Produces a fixed point budget and preserves the
perceived shape of a line, but it can clip narrow spikes. Use it only when a
hard point budget matters more than exactness.

The demo app has both applied to the same million points so the difference is
visible.

### `identityDownsampler`

Returns the input untouched. Useful for small series and tests.

## Writing your own

Anything that satisfies the `Downsampler` signature works:

```ts
const everyTenth: Downsampler = (input, request) => {
  /* ... */
};

new StaticDataSource(series, { downsampler: everyTenth });
```

For a source that does not hold its data in memory, skip `Downsampler` entirely
and implement the reduction inside `requestSeriesData`. That is the intended
path for a server backed source: turn the viewport and pixel width into a query,
cache the result if it helps, and return it.

Whatever the strategy, report `complete: false` from `requestSeriesData` when
points were dropped. See [data-sources.md](data-sources.md#serving-data).
