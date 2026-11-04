import { expect, test, type Page } from '@playwright/test';
import {
  DATA_CANVAS,
  expectDrawn,
  expectReady,
  INK_GRID_CELL,
  PLOT,
} from './plot-demo.utils';

/**
 * The plot demo runs on its own server and needs no Deephaven backend, so these
 * tests use an absolute URL instead of the shared code-studio `baseURL`.
 */
const PLOT_DEMO_URL =
  process.env.PLOT_DEMO_URL ?? 'http://localhost:4020/plot/';

async function hoverPlotCenter(page: Page): Promise<void> {
  const box = await page.locator(DATA_CANVAS).boundingBox();
  expect(box).not.toBeNull();
  await page.mouse.move(
    (box?.x ?? 0) + (box?.width ?? 0) / 2,
    (box?.y ?? 0) + (box?.height ?? 0) / 2
  );
}

test.beforeEach(async ({ page }) => {
  await page.goto(PLOT_DEMO_URL);
  await expectReady(page);
});

test('loads with a renderer resolved and both canvas layers present', async ({
  page,
}) => {
  await expect(page.getByTestId('active-renderer')).not.toHaveText(
    'resolving…'
  );
  await expect(
    page.locator(`${PLOT} canvas[data-dh-plot-layer=axes]`)
  ).toBeVisible();
  await expect(page.locator(DATA_CANVAS)).toBeVisible();
  await expect(page.getByTestId('plot-error')).toHaveCount(0);
});

test('honours a canvas only renderer preference', async ({ page }) => {
  await page.getByTestId('renderer-select').selectOption('canvas');
  await expect(page.getByTestId('active-renderer')).toHaveText('canvas');
  await expect(page.locator(PLOT)).toHaveAttribute(
    'data-dh-plot-renderer',
    'canvas'
  );
});

test('renders 64 plots at once', async ({ page }) => {
  await page.getByTestId('renderer-select').selectOption('canvas');
  await page.getByTestId('example-many').click();

  // Every plot gets its own pair of canvases and all of them must resolve
  await expectReady(page, 64);
  await expect(page.locator(DATA_CANVAS)).toHaveCount(64);
  await expect(page.getByTestId('plot-stats')).toContainText('64 plots');
  await expect(page.getByTestId('plot-stats')).not.toContainText('measuring');
  await expect(page.getByTestId('plot-error')).toHaveCount(0);
  await expectDrawn(page, INK_GRID_CELL);
});

test('ticks all 64 plots at once', async ({ page }) => {
  await page.getByTestId('renderer-select').selectOption('canvas');
  await page.getByTestId('example-many').click();
  await expectReady(page, 64);

  const first = page.locator(DATA_CANVAS).first();
  const last = page.locator(DATA_CANVAS).last();
  const firstBefore = await first.screenshot();
  const lastBefore = await last.screenshot();

  await page.getByTestId('toggle-streaming').click();
  await expect(page.getByTestId('toggle-streaming')).toHaveText('Stop stream');

  // Both ends of the grid must be updating, not just the plot that was mounted first
  await expect
    .poll(async () => (await first.screenshot()).equals(firstBefore))
    .toBe(false);
  await expect
    .poll(async () => (await last.screenshot()).equals(lastBefore))
    .toBe(false);

  await page.getByTestId('toggle-streaming').click();
  await expect(page.getByTestId('plot-error')).toHaveCount(0);
});

const EXAMPLES = ['scatter', 'line', 'mixed', 'downsample', 'streaming'];

EXAMPLES.forEach(example => {
  test(`draws the ${example} example`, async ({ page }) => {
    await page.getByTestId('renderer-select').selectOption('canvas');
    await page.getByTestId(`example-${example}`).click();
    await expectReady(page);

    await expect(page.getByTestId('plot-error')).toHaveCount(0);
    await expectDrawn(page);
  });
});

test('zooming redraws with data for the new viewport', async ({ page }) => {
  await page.getByTestId('renderer-select').selectOption('canvas');
  await page.getByTestId('example-downsample').click();
  await expectReady(page);

  const canvas = page.locator(DATA_CANVAS);
  const before = await canvas.screenshot();

  await hoverPlotCenter(page);
  await page.mouse.wheel(0, -1200);
  await expectReady(page);

  expect((await canvas.screenshot()).equals(before)).toBe(false);
  await expectDrawn(page);
});

test('double click resets the viewport', async ({ page }) => {
  await page.getByTestId('renderer-select').selectOption('canvas');
  await expectReady(page);

  const canvas = page.locator(DATA_CANVAS);
  const home = await canvas.screenshot();

  await hoverPlotCenter(page);
  await page.mouse.wheel(0, -600);
  await expectReady(page);
  expect((await canvas.screenshot()).equals(home)).toBe(false);

  await page.locator(PLOT).dblclick();
  await expectReady(page);
  expect((await canvas.screenshot()).equals(home)).toBe(true);
});

test('streaming appends points over time', async ({ page }) => {
  await page.getByTestId('renderer-select').selectOption('canvas');
  await page.getByTestId('example-streaming').click();
  await expectReady(page);

  const canvas = page.locator(DATA_CANVAS);
  const before = await canvas.screenshot();

  await page.getByTestId('toggle-streaming').click();
  await expect(page.getByTestId('toggle-streaming')).toHaveText('Stop stream');
  await expect
    .poll(async () => (await canvas.screenshot()).equals(before))
    .toBe(false);
  await page.getByTestId('toggle-streaming').click();
});

test('streams six plots on a rotating cube', async ({ page }) => {
  await page.getByTestId('renderer-select').selectOption('canvas');
  await page.getByTestId('example-cube').click();

  await expectReady(page, 6);
  await expect(page.locator('.plot-cube-face')).toHaveCount(6);
  await expect(page.getByTestId('toggle-streaming')).toHaveText('Stop stream');
  await expect(page.getByTestId('plot-error')).toHaveCount(0);

  // Faces are sized from layout, so a face turned edge on is not squashed
  const sizes = await page
    .locator(DATA_CANVAS)
    .evaluateAll(canvases =>
      canvases.map(canvas => (canvas as HTMLCanvasElement).width)
    );
  expect(new Set(sizes).size).toBe(1);
  expect(sizes[0]).toBeGreaterThan(100);

  const cube = page.locator('.plot-cube-body');
  const transform = await cube.evaluate(element => element.style.transform);
  await expect
    .poll(() => cube.evaluate(element => element.style.transform))
    .not.toBe(transform);
});

test('drags the cube to rotate it', async ({ page }) => {
  await page.getByTestId('renderer-select').selectOption('canvas');
  await page.getByTestId('example-cube').click();
  await expectReady(page, 6);
  await page.getByTestId('cube-auto-rotate').uncheck();

  const cube = page.locator('.plot-cube-body');
  const rotation = (): Promise<number> =>
    cube.evaluate(element =>
      Number(/rotateX\((-?[\d.]+)deg\)/.exec(element.style.transform)?.[1])
    );
  const before = await rotation();

  const box = await page.getByTestId('plot-cube').boundingBox();
  const x = (box?.x ?? 0) + (box?.width ?? 0) / 2;
  const y = (box?.y ?? 0) + (box?.height ?? 0) / 2;
  await page.mouse.move(x, y);
  await page.mouse.down();
  await page.mouse.move(x, y + 100, { steps: 5 });
  await page.mouse.up();

  expect(await rotation()).toBeLessThan(before);
});

test('scatter stress draws every point and reports a frame rate', async ({
  page,
}) => {
  await page.getByTestId('renderer-select').selectOption('canvas');
  await page.getByTestId('example-scatter-stress').click();
  await expectReady(page);

  await page.getByTestId('stress-point-count').selectOption('10000');
  await expectReady(page);
  await expect(page.getByTestId('plot-stats')).toContainText('10,000 points');
  await expect(page.getByTestId('plot-fps')).toHaveText(/^\d+ fps$/);
  await expect(page.getByTestId('plot-error')).toHaveCount(0);
  await expectDrawn(page);

  const canvas = page.locator(DATA_CANVAS);
  const before = await canvas.screenshot();
  await expect
    .poll(async () => (await canvas.screenshot()).equals(before))
    .toBe(false);
});

// WebGPU coverage lives in plot-demo-webgpu.spec.ts, which runs in a browser
// launched with WebGPU enabled rather than skipping when it is unavailable.
