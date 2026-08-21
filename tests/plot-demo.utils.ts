import { expect, type Page } from '@playwright/test';

export const PLOT = '.plot-demo-plot';
export const DATA_CANVAS = `${PLOT} canvas[data-dh-plot-layer=data]`;

/** Waits until exactly `count` plots have finished their outstanding data requests. */
export async function expectReady(page: Page, count = 1): Promise<void> {
  await expect(
    page.locator(`${PLOT}[data-dh-plot-status="ready"]`)
  ).toHaveCount(count);
}

/**
 * Fraction of the plot that is not background, as a proxy for "something was
 * drawn".
 *
 * The pixels come from a Playwright element screenshot rather than from reading
 * the canvas in the page. Chromium returns a blank image for `toDataURL` and
 * `drawImage` on a WebGPU canvas once several are live, whereas the compositor
 * path this uses is accurate for both renderers.
 *
 * Note the screenshot also picks up the axes layer underneath, so an empty plot
 * still scores a few percent from its gridlines. Thresholds allow for that.
 */
export async function getInkFraction(page: Page): Promise<number> {
  const screenshot = await page.locator(DATA_CANVAS).first().screenshot();
  return page.evaluate(async encoded => {
    const image = new Image();
    await new Promise((resolve, reject) => {
      image.onload = resolve;
      image.onerror = reject;
      image.src = `data:image/png;base64,${encoded}`;
    });

    const scratch = document.createElement('canvas');
    scratch.width = image.width;
    scratch.height = image.height;
    const context = scratch.getContext('2d', { willReadFrequently: true });
    if (context == null) {
      return 0;
    }
    context.drawImage(image, 0, 0);
    const { data } = context.getImageData(0, 0, scratch.width, scratch.height);

    // Everything that is not the most common color counts as drawn
    const counts = new Map<number, number>();
    for (let i = 0; i < data.length; i += 4) {
      const key = data[i] * 65536 + data[i + 1] * 256 + data[i + 2];
      counts.set(key, (counts.get(key) ?? 0) + 1);
    }
    let background = 0;
    counts.forEach(count => {
      background = Math.max(background, count);
    });
    const total = data.length / 4;
    return (total - background) / total;
  }, screenshot.toString('base64'));
}

/**
 * Ink threshold for a full size plot.
 *
 * Measured: gridlines alone score about 0.014, and the sparsest example (mixed)
 * scores about 0.042, so this sits between the two.
 */
export const INK_FULL_SIZE = 0.025;

/**
 * Ink threshold for one cell of the 8x8 grid.
 *
 * Measured: gridlines alone score about 0.077 at that size, and a drawn cell
 * about 0.29.
 */
export const INK_GRID_CELL = 0.15;

/** Polls until the plot has painted, which happens a frame after it reports ready. */
export async function expectDrawn(
  page: Page,
  minimum = INK_FULL_SIZE
): Promise<void> {
  await expect.poll(() => getInkFraction(page)).toBeGreaterThan(minimum);
}
