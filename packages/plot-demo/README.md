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

WebGPU is unavailable in stock headless browsers, so those tests exercise the
Canvas renderer and skip the WebGPU case. To exercise WebGPU locally, launch
Chromium with `--enable-unsafe-webgpu --use-angle=swiftshader`.
