# Accessibility API

Grid draws its contents to an [HTML canvas](https://developer.mozilla.org/en-US/docs/Web/HTML/Element/canvas) rather than to DOM elements. This is what allows it to display quadrillions of rows at 60fps, but it also means there are no per-cell elements for screen readers, browser automation, or other external tooling to inspect.

To bridge that gap, Grid attaches an accessibility API to its canvas element. The API reads directly from the model and the metrics of the most recent render, so it always describes what is actually on screen.

## Accessing the API

The API is attached to the canvas under the `__dhGridA11y` property, exported as the `GRID_A11Y_KEY` constant. It is always present — there is no flag to enable.

```ts
import { GRID_A11Y_KEY, type GridA11yCanvas } from '@deephaven/grid';

const canvas = document.querySelector('canvas.grid-canvas') as GridA11yCanvas;
const api = canvas[GRID_A11Y_KEY];

// `metrics` is null until the grid has completed its first render
if (api?.metrics != null) {
  console.log(api.getCellText(0, 0));
}
```

## API surface

| Member                           | Description                                                                 |
| -------------------------------- | --------------------------------------------------------------------------- |
| `model`                          | The `GridModel` currently backing the grid                                  |
| `renderer`                       | The `GridRenderer` currently drawing the grid                               |
| `metrics`                        | The `GridMetrics` from the last render, or `null` before the first render   |
| `getCellText(column, row)`       | The text rendered in a cell                                                 |
| `getCellRect(column, row)`       | The bounds of a cell, relative to the top left of the canvas, in CSS pixels |
| `getColumnHeaderText(column)`    | The text of a column header                                                 |
| `getColumnHeaderRect(column)`    | The bounds of a column header                                               |
| `getVisibleColumnByHeader(text)` | The visible index of the column with the given header text                  |

`model` and `renderer` are getters, so they stay correct even if you swap either one at runtime.

## Locating a cell on screen

`getCellRect` and `getColumnHeaderRect` return coordinates relative to the top left of the canvas. Add the canvas position to convert to page coordinates, for example to dispatch a click at the centre of a cell:

```ts
const rect = api.getCellRect(2, 3);
const box = canvas.getBoundingClientRect();

if (rect != null) {
  const x = box.x + rect.x + rect.width / 2;
  const y = box.y + rect.y + rect.height / 2;
}
```

The column header rect covers the bottom level of the header, which is the row that handles sorting. For a grid with column groups, higher level headers are not addressable through this API.

## Testing with Playwright

[@deephaven/playwright-grid](https://www.npmjs.com/package/@deephaven/playwright-grid) wraps this API in helpers for end-to-end tests, so tests can address cells by column name instead of by pixel offset:

```ts
import { test } from '@playwright/test';
import {
  clickCell,
  clickColumnHeader,
  expectCellText,
  waitForGrid,
} from '@deephaven/playwright-grid';

test('sorts by clicking a column header', async ({ page }) => {
  const grid = page.locator('.iris-grid');

  await waitForGrid(grid);
  await expectCellText(grid, 'x', 0, '0');

  // Two clicks toggles the sort to descending
  await clickColumnHeader(grid, 'x');
  await clickColumnHeader(grid, 'x');

  await expectCellText(grid, 'x', 0, '99');
});

test('shift clicks a cell to extend a selection', async ({ page }) => {
  const grid = page.locator('.iris-grid');

  await clickCell(grid, 'x', 0);
  await clickCell(grid, 'x', 5, { modifiers: ['Shift'] });
});
```

Each helper accepts a locator for the grid canvas or for any element containing it, so a panel locator such as `.iris-grid` works. Columns can be given as a header name or a visible index, and click options are passed through to Playwright.
