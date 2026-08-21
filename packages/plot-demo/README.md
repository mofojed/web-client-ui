# @deephaven/plot-demo

A standalone app for developing and testing `@deephaven/plot`. It runs entirely
on generated data, so **no Deephaven server is required**.

## Usage

```bash
npm run start:plot-demo
```

Then open <http://localhost:4020/plot/>.

Pick an example from the sidebar and a renderer from the dropdown. The header
shows which renderer actually resolved, which is how you confirm a fallback
happened. Scroll to zoom, drag to pan, and double click to reset.

## Examples

| Example           | What it covers                                          |
| ----------------- | ------------------------------------------------------- |
| Scatter           | Three 2,000 point clusters                              |
| Line              | Three 5,000 point noisy sine waves                      |
| Mixed             | A line series with a scatter series overlaid            |
| Downsample (1M)   | One million points reduced with the min/max downsampler |
| Downsample (LTTB) | The same points with LTTB, which clips spikes           |
| Streaming         | Four random walks appended as incremental deltas        |
| Many plots (64)   | 64 plots of 50,000 points each, 3.2M points on one page |

Every example is seeded, so the output is identical on every run. That is what
lets the e2e tests compare renders directly.

## Comparing renderers

**Many plots** is the example to reach for. WebGL caps a document at roughly
8-16 live contexts and drops the oldest beyond that, so a grid like this is not
something it can render; every WebGPU plot here shares a single device. The
header reports how long all 64 plots took to load their data and submit a first
frame.

**Start stream** ticks all 64 plots at once, appending to every one of them four
times a second. Plots follow their data until you zoom or pan, so they stay in
frame as they grow.

Tick **Draw every point** to skip downsampling and push all 3.2M points through
the renderer. In that mode every series is complete, so ticks apply as
incremental deltas and the viewport can follow without refetching anything. It
is a deliberate stress test: on a software rasterizer such as SwiftShader it
will crawl.

A WebGPU frame is submitted rather than completed by the time it is counted, so
read the reported time as the CPU cost of getting 64 plots on screen rather than
as a GPU benchmark.

## Tests

E2E tests live in [tests/plot-demo.spec.ts](../../tests/plot-demo.spec.ts) and
expect this app to be running on port 4020:

```bash
npm run start:plot-demo
npx playwright test tests/plot-demo.spec.ts
```

Those tests are renderer agnostic and run against the canvas renderer, because
stock headless browsers have no WebGPU adapter. WebGPU has its own suite in
[tests/plot-demo-webgpu.spec.ts](../../tests/plot-demo-webgpu.spec.ts), which
only runs in the `chromium-webgpu` Playwright project. That project launches
Chromium with WebGPU forced on over SwiftShader, so the tests fail rather than
skip if WebGPU stops working:

```bash
npx playwright test --project=chromium-webgpu
```

## WebGPU says it is unavailable

If the renderer dropdown shows **WebGPU only (unavailable here)**, the browser
returned no GPU adapter. That is a browser or driver limitation, not a plot
problem, and the plot falls back to canvas. Common causes:

- Firefox ships WebGPU on Windows only; elsewhere it needs
  `dom.webgpu.enabled` in `about:config`.
- Chrome on Linux often blocklists the GPU. `chrome://gpu` says why, and
  `--enable-unsafe-webgpu --use-angle=swiftshader` forces a software adapter.
- Embedded browsers such as the VS Code Simple Browser generally have no
  adapter at all.

Check it directly with `await navigator.gpu.requestAdapter()` in the console; a
`null` result means no adapter is available.
