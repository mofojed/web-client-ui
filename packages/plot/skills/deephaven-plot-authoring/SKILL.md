---
name: deephaven-plot-authoring
description: Work on the @deephaven/plot package - add or modify renderers (WebGPU/WGSL, Canvas 2D), series types, data sources, or downsamplers, and test plots with the plot-demo app. Use when adding a plot type, writing a WGSL shader, implementing a PlotDataSource, debugging a blank or corrupted plot render, or wiring plot e2e tests. Not for the legacy plotly.js based @deephaven/chart package.
---

# Authoring in @deephaven/plot

`@deephaven/plot` is a ground-up plotting library. WebGPU is the primary
renderer; Canvas 2D is the universal fallback. Read
`packages/plot/docs/architecture.md` first — it explains the layering that the
rules below depend on.

## Ground rules

1. **Renderers never touch data sources, and sources never touch renderers.**
   `PlotView` is the only thing that talks to both. If you find yourself
   importing a source into a renderer, the design has gone wrong.
2. **Renderers own their copy of series data.** Sources are allowed to return
   their internal arrays (`minMaxDownsampler` returns its input unchanged when
   the data already fits). Applying a delta in place to that array corrupts the
   source and produces lines fanning out from the origin. Always
   `copySeriesData` in `setSeriesData`.
3. **Renderers draw data only.** Axes, gridlines, labels, and the legend belong
   to `AxisPainter`, and the data canvas is already sized and positioned to the
   plot area. Do not reimplement margins or chrome in a renderer.
4. **Never draw synchronously.** Call `invalidate()`; a single
   `requestAnimationFrame` coalesces the frame.
5. **The WebGPU device is shared by every plot on the page.** Get it from
   `getSharedWebGpu()`, never call `requestDevice` in a renderer, and never
   destroy it in `destroy()` — that would kill every other plot. Sharing is what
   lets a page hold dozens of plots, which is a main reason WebGPU is preferred
   over WebGL here.

## Iterating

The demo app is the fastest loop and needs no Deephaven server:

```bash
npm run start:plot-demo   # http://localhost:4020/plot/
```

Add a case to `packages/plot-demo/src/examples.ts` for whatever you are
building. Keep generators seeded — the e2e tests compare renders directly and
unseeded data makes them flaky.

## Adding a renderer

Implement `PlotRenderer` plus a `PlotRendererFactory`, then register it:

```ts
defaultRendererRegistry.register(mySvgRendererFactory);
```

- `capabilities.seriesTypes` gates selection. A renderer that cannot draw a
  series type in the plot is skipped rather than failing.
- `isSupported()` is async and cached. Returning false is the normal way to
  decline; throwing is also treated as unsupported.
- Set `capabilities.incrementalUpdates` honestly. It is documentation, not
  behaviour — `applyDeltas` may always redraw everything.

Add the renderer name to the demo's `RENDERER_PREFERENCES` so it can be forced
from the UI, which is how fallback gets tested.

## Adding a series type

1. Add it to the `PlotSeriesType` union in `model/PlotTypes.ts`.
2. Implement it in **both** renderers, or the plot silently falls back whenever
   that type is present.
3. Declare it in each renderer's `capabilities.seriesTypes`.
4. Consider whether existing downsamplers are still valid. `minMaxDownsampler`
   assumes points are sorted ascending by `x` and that dropping interior points
   is acceptable — true for lines, not for every type.

## Writing WGSL

Shaders live in `renderers/webgpu/shaders.ts`. The uniform struct is 48 bytes:

| Offset | Field        | Type        |
| ------ | ------------ | ----------- |
| 0      | `viewport`   | `vec4<f32>` |
| 16     | `color`      | `vec4<f32>` |
| 32     | `resolution` | `vec2<f32>` |
| 40     | `size`       | `f32`       |
| 44     | `_padding`   | `f32`       |

Changing it means changing `UNIFORM_FLOAT_COUNT` and `writeUniforms` together.

- Positions are **relative to a per series origin**, and the viewport passed in
  the uniform is shifted by the same origin. Absolute `f32` is not precise
  enough for epoch millisecond timestamps.
- Fragment shaders output **premultiplied** alpha (`color.rgb * alpha, alpha`)
  because the canvas is configured with `alphaMode: 'premultiplied'`.
- Clear to transparent. The axes canvas sits underneath and must show through.

### Debugging a blank WebGPU plot

Validation errors are asynchronous. `WebGpuRenderer` already logs them through
an `uncapturederror` listener, so check the console first.

If there are no errors, bisect rather than guess:

1. Return a constant color from the fragment shader. Geometry appears → the
   vertex stage is fine and the problem is in the fragment stage.
2. Output a uniform or interpolated value into a color channel and read the
   pixels back. This is how you tell "the uniform is wrong" from "the maths is
   wrong".

To run WebGPU in a headless browser, launch Chromium with
`--enable-unsafe-webgpu --use-angle=swiftshader --enable-gpu`. Stock headless
has no adapter.

## Writing a data source

Extend `AbstractPlotDataSource`. The critical field is `complete` on the
`requestSeriesData` result: `true` means "nothing was dropped", which is what
allows deltas to be applied incrementally. Reporting `true` for reduced data
misaligns append offsets and corrupts the plot. When unsure, return `false`.

See `packages/plot/docs/data-sources.md` for the full contract.

## Testing

- **Unit** (`npx jest --config jest.config.unit.cjs --selectProjects @deephaven/plot`)
  — jsdom has no WebGPU, so cover the WebGPU renderer's logic through the
  registry and delta helpers rather than by instantiating it. Use a mock
  `PlotRenderer` for `PlotView` tests, and stub
  `HTMLElement.prototype.getBoundingClientRect` since jsdom reports zero size.
- **E2E** (`tests/plot-demo.spec.ts`) — wait on
  `[data-dh-plot-status=ready]` rather than a timeout, then poll for pixels;
  ready means the data loaded, and the paint lands a frame later. Assert that
  something was drawn with `expectDrawn` from `tests/plot-demo.utils.ts`, which
  measures a Playwright element screenshot. Do **not** read a WebGPU canvas with
  `toDataURL`, `drawImage`, or `createImageBitmap`: Chromium returns a blank
  image once several WebGPU canvases are live.
- **WebGPU e2e** (`tests/plot-demo-webgpu.spec.ts`) — runs only in the
  `chromium-webgpu` project, which forces WebGPU on over SwiftShader so the
  tests fail rather than skip. Put anything renderer specific there.
