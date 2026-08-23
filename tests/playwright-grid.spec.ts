import { test, expect } from '@playwright/test';
import {
  clickCell,
  clickColumnHeader,
  expectCellText,
  getCellText,
  getColumnHeaderText,
  resolveGridCanvas,
  waitForGrid,
} from '@deephaven/playwright-grid';
import { gotoPage, openTable, waitForLoadingDone } from './utils';

// simple_table is empty_table(100).update(['x=i', 'y=Math.sin(i)', 'z=Math.cos(i)'])

test.beforeEach(async ({ page }) => {
  await gotoPage(page, '');
  await openTable(page, 'simple_table');
  await waitForLoadingDone(page);
});

test('reads cell text by column name and by index', async ({ page }) => {
  const grid = page.locator('.iris-grid-panel .iris-grid');
  await waitForGrid(grid);

  expect(await getColumnHeaderText(grid, 0)).toBe('x');
  expect(await getCellText(grid, 'x', 0)).toBe('0');
  expect(await getCellText(grid, 0, 5)).toBe('5');
});

test('returns null for a cell outside of the viewport', async ({ page }) => {
  const grid = page.locator('.iris-grid-panel .iris-grid');
  await waitForGrid(grid);

  expect(await getCellText(grid, 'x', 99)).toBeNull();
});

test('throws a helpful error for an unknown column', async ({ page }) => {
  const grid = page.locator('.iris-grid-panel .iris-grid');
  await waitForGrid(grid);

  await expect(clickCell(grid, 'not_a_column', 0)).rejects.toThrow(
    /No column with header "not_a_column"/
  );
});

test('clicks a cell', async ({ page }) => {
  const grid = page.locator('.iris-grid-panel .iris-grid');
  await waitForGrid(grid);

  await clickCell(grid, 'x', 3);

  // Clicking a cell focuses the grid canvas
  const canvas = await resolveGridCanvas(grid);
  expect(await canvas.evaluate(el => el === document.activeElement)).toBe(true);
});

test('sorts by clicking a column header', async ({ page }) => {
  const grid = page.locator('.iris-grid-panel .iris-grid');
  await waitForGrid(grid);
  await expectCellText(grid, 'x', 0, '0');

  // First click sorts ascending, second click sorts descending
  await clickColumnHeader(grid, 'x');
  await clickColumnHeader(grid, 'x');
  await waitForLoadingDone(page);

  await expectCellText(grid, 'x', 0, '99');
});
