# @deephaven/playwright-grid

Playwright helpers for testing the Deephaven grid.

The grid renders to a canvas, so its contents are not in the DOM. This package
reads the accessibility API that `@deephaven/grid` attaches to the canvas
element, which lets tests look up cells by column header name and click them by
their real on-screen position.

## Usage

```ts
import { test } from '@playwright/test';
import {
  clickCell,
  clickColumnHeader,
  expectCellText,
  waitForGrid,
} from '@deephaven/playwright-grid';

test('sorts by timestamp', async ({ page }) => {
  const grid = page.locator('.iris-grid');

  await waitForGrid(grid);
  await expectCellText(grid, 'Timestamp', 0, '2021-01-01T00:00:00.000 UTC');

  // Columns can be referenced by header text or by visible index
  await clickCell(grid, 'Timestamp', 5, { modifiers: ['Shift'] });
  await clickColumnHeader(grid, 'Timestamp');
});
```

Every helper accepts a locator for the grid canvas or any element containing it.

Columns and rows are addressed by _visible_ index, i.e. what is currently on
screen. Anything outside of the viewport is not addressable, so scroll it into
view first.
