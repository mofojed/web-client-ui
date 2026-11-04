import { expect, test } from '@playwright/test';
import {
  DATA_CANVAS,
  expectDrawn,
  expectReady,
  INK_GRID_CELL,
  PLOT,
} from './plot-demo.utils';

/**
 * WebGPU specific coverage.
 *
 * This file only runs in the `chromium-webgpu` project, which launches Chromium
 * with WebGPU forced on over SwiftShader. Unlike the renderer agnostic suite,
 * these tests fail rather than skip when WebGPU is unavailable, because their
 * whole purpose is to prove the WebGPU renderer works.
 */
const PLOT_DEMO_URL =
  process.env.PLOT_DEMO_URL ?? 'http://localhost:4020/plot/';

test.beforeEach(async ({ page }) => {
  await page.goto(PLOT_DEMO_URL);
  await expectReady(page);
});

test('the browser exposes a WebGPU adapter', async ({ page }) => {
  const adapter = await page.evaluate(async () => {
    if (navigator.gpu == null) {
      return 'no navigator.gpu';
    }
    const found =
      (await navigator.gpu.requestAdapter()) ??
      (await navigator.gpu.requestAdapter({ forceFallbackAdapter: true }));
    return found == null ? 'no adapter' : 'ok';
  });
  expect(adapter).toBe('ok');
});

test('auto preference picks WebGPU over canvas when it is available', async ({
  page,
}) => {
  await expect(page.getByTestId('active-renderer')).toHaveText('webgpu');
  await expect(page.locator(PLOT)).toHaveAttribute(
    'data-dh-plot-renderer',
    'webgpu'
  );
});

test('does not report WebGPU as unavailable', async ({ page }) => {
  await expect(page.getByTestId('renderer-option-webgpu')).toHaveText(
    'WebGPU only'
  );
});

const WEBGPU_EXAMPLES = ['scatter', 'line', 'mixed', 'downsample', 'streaming'];

WEBGPU_EXAMPLES.forEach(example => {
  test(`draws the ${example} example with WebGPU`, async ({ page }) => {
    await page.getByTestId('renderer-select').selectOption('webgpu');
    await page.getByTestId(`example-${example}`).click();
    await expectReady(page);

    await expect(page.getByTestId('active-renderer')).toHaveText('webgpu');
    await expect(page.getByTestId('plot-error')).toHaveCount(0);
    await expectDrawn(page);
  });
});

test('zooming a WebGPU plot redraws it', async ({ page }) => {
  await page.getByTestId('renderer-select').selectOption('webgpu');
  await page.getByTestId('example-downsample').click();
  await expectReady(page);

  const canvas = page.locator(DATA_CANVAS);
  const before = await canvas.screenshot();

  const box = await canvas.boundingBox();
  await page.mouse.move(
    (box?.x ?? 0) + (box?.width ?? 0) / 2,
    (box?.y ?? 0) + (box?.height ?? 0) / 2
  );
  await page.mouse.wheel(0, -1200);
  await expectReady(page);

  expect((await canvas.screenshot()).equals(before)).toBe(false);
  await expect(page.getByTestId('plot-error')).toHaveCount(0);
});

test('applies streaming deltas on the GPU without errors', async ({ page }) => {
  await page.getByTestId('renderer-select').selectOption('webgpu');
  await page.getByTestId('example-streaming').click();
  await expectReady(page);

  const canvas = page.locator(DATA_CANVAS);
  const before = await canvas.screenshot();

  await page.getByTestId('toggle-streaming').click();
  await expect
    .poll(async () => (await canvas.screenshot()).equals(before))
    .toBe(false);
  await page.getByTestId('toggle-streaming').click();

  await expect(page.getByTestId('active-renderer')).toHaveText('webgpu');
  await expect(page.getByTestId('plot-error')).toHaveCount(0);
});

test('renders 64 WebGPU plots from a single shared device', async ({
  page,
}) => {
  await page.getByTestId('renderer-select').selectOption('webgpu');
  await page.getByTestId('example-many').click();
  await expectReady(page, 64);

  await expect(page.getByTestId('active-renderer')).toHaveText('webgpu');
  await expect(page.locator(DATA_CANVAS)).toHaveCount(64);
  await expect(page.getByTestId('plot-error')).toHaveCount(0);
  await expectDrawn(page, INK_GRID_CELL);
});

test('streams every face of the cube with WebGPU', async ({ page }) => {
  await page.getByTestId('renderer-select').selectOption('webgpu');
  await page.getByTestId('example-cube').click();
  await expectReady(page, 6);

  await expect(page.getByTestId('active-renderer')).toHaveText('webgpu');
  await expect(page.locator(DATA_CANVAS)).toHaveCount(6);
  await expect(page.getByTestId('toggle-streaming')).toHaveText('Stop stream');
  await expect(page.getByTestId('plot-error')).toHaveCount(0);
});

test('applies scatter stress updates on the GPU', async ({ page }) => {
  await page.getByTestId('renderer-select').selectOption('webgpu');
  await page.getByTestId('example-scatter-stress').click();
  await page.getByTestId('stress-point-count').selectOption('10000');
  await expectReady(page);

  const canvas = page.locator(DATA_CANVAS);
  await expectDrawn(page);
  const before = await canvas.screenshot();
  await expect
    .poll(async () => (await canvas.screenshot()).equals(before))
    .toBe(false);

  await expect(page.getByTestId('active-renderer')).toHaveText('webgpu');
  await expect(page.getByTestId('plot-fps')).toHaveText(/^\d+ fps$/);
  await expect(page.getByTestId('plot-error')).toHaveCount(0);
});
