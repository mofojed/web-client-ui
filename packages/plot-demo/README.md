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

Every example is seeded, so the output is identical on every run. That is what
lets the e2e tests compare renders directly.

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
