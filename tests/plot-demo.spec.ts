import { expect, test, type Page } from '@playwright/test';

/**
 * The plot demo runs on its own server and needs no Deephaven backend, so these
 * tests use an absolute URL instead of the shared code-studio `baseURL`.
 */
const PLOT_DEMO_URL =
  process.env.PLOT_DEMO_URL ?? 'http://localhost:4020/plot/';

const PLOT = '.plot-demo-plot';
const DATA_CANVAS = `${PLOT} canvas[data-dh-plot-layer=data]`;

async function expectReady(page: Page): Promise<void> {
  await expect(page.locator(PLOT)).toHaveAttribute(
    'data-dh-plot-status',
    'ready'
  );
}

/**
 * Fraction of the data canvas that has been drawn to.
 *
 * Both renderers clear the data layer to transparent, so any non-transparent
 * pixel is series data. `drawImage` reads back a WebGPU canvas as well as a 2D
 * one, which keeps this check renderer agnostic.
 */
async function getDrawnFraction(page: Page): Promise<number> {
  return page.evaluate(selector => {
    const canvas = document.querySelector(selector) as HTMLCanvasElement;
    const scratch = document.createElement('canvas');
    scratch.width = canvas.width;
    scratch.height = canvas.height;
    const context = scratch.getContext('2d');
    if (context == null) {
      return 0;
    }
    context.drawImage(canvas, 0, 0);
    const { data } = context.getImageData(0, 0, scratch.width, scratch.height);
    let drawn = 0;
    for (let i = 3; i < data.length; i += 4) {
      if (data[i] > 0) {
        drawn += 1;
      }
    }
    return drawn / (data.length / 4);
  }, DATA_CANVAS);
}

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

const EXAMPLES = ['scatter', 'line', 'mixed', 'downsample', 'streaming'];

EXAMPLES.forEach(example => {
  test(`draws the ${example} example`, async ({ page }) => {
    await page.getByTestId('renderer-select').selectOption('canvas');
    await page.getByTestId(`example-${example}`).click();
    await expectReady(page);

    await expect(page.getByTestId('plot-error')).toHaveCount(0);
    expect(await getDrawnFraction(page)).toBeGreaterThan(0.001);
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
  expect(await getDrawnFraction(page)).toBeGreaterThan(0.001);
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

test('renders with WebGPU when the browser supports it', async ({ page }) => {
  const hasWebGpu = await page.evaluate(async () => {
    if (navigator.gpu == null) {
      return false;
    }
    return (await navigator.gpu.requestAdapter()) != null;
  });
  test.skip(!hasWebGpu, 'WebGPU is not available in this browser');

  await page.getByTestId('renderer-select').selectOption('webgpu');
  await expect(page.getByTestId('active-renderer')).toHaveText('webgpu');
  await expectReady(page);

  await expect(page.getByTestId('plot-error')).toHaveCount(0);
  expect(await getDrawnFraction(page)).toBeGreaterThan(0.001);
});
