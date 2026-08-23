import { expect, type Locator } from '@playwright/test';
import type { GridA11yCanvas, GridA11yRect } from '@deephaven/grid';

/**
 * Property on the grid canvas where the accessibility API is attached.
 * Declared here rather than imported so this package does not pull the grid
 * runtime into the test process. The `satisfies` check fails to compile if the
 * grid ever renames the property.
 */
const GRID_A11Y_KEY = '__dhGridA11y' as const satisfies keyof GridA11yCanvas;

const CANVAS_SELECTOR = 'canvas.grid-canvas';

/** A column, either by visible index or by its column header text */
export type ColumnRef = number | string;

/** Click options passed through to Playwright, minus the position we compute */
export type GridClickOptions = Omit<
  NonNullable<Parameters<Locator['click']>[0]>,
  'position'
>;

/** The result of looking up a cell or column header in the grid */
type GridQueryResult = {
  /** Whether the accessibility API was found on the canvas */
  hasApi: boolean;
  /** The resolved visible column index, or null if the column could not be resolved */
  column: number | null;
  /** The bounds of the cell/header, or null if it is not in the viewport */
  rect: GridA11yRect | null;
  /** The text of the cell/header, or null if it is not in the viewport */
  text: string | null;
};

/**
 * Resolve the grid canvas from the provided locator.
 * Accepts either the canvas itself or any element containing it, so callers can
 * pass a panel/wrapper locator such as `.iris-grid`.
 * @param grid Locator for the grid canvas or an element containing it
 * @returns Locator for the grid canvas
 */
export async function resolveGridCanvas(grid: Locator): Promise<Locator> {
  const canvas = grid.locator(CANVAS_SELECTOR);
  return (await canvas.count()) > 0 ? canvas : grid;
}

/**
 * Build the error thrown when a query could not be resolved.
 * @param result The failed query result
 * @param column The requested column
 * @param description Description of what was being looked up
 * @returns The error to throw
 */
function makeQueryError(
  result: GridQueryResult,
  column: ColumnRef,
  description: string
): Error {
  if (!result.hasApi) {
    return new Error(
      'No Deephaven grid found. Ensure the locator resolves to a grid canvas and the grid has rendered.'
    );
  }
  if (result.column == null) {
    return new Error(
      `No column with header "${column}" is currently in the viewport.`
    );
  }
  return new Error(`${description} is not currently in the viewport.`);
}

/**
 * Look up the text and bounds of a cell.
 * @param grid Locator for the grid canvas or an element containing it
 * @param column Column to look up, by visible index or header text
 * @param row Visible row index to look up
 * @returns The query result
 */
async function queryCell(
  grid: Locator,
  column: ColumnRef,
  row: number
): Promise<GridQueryResult> {
  const canvas = await resolveGridCanvas(grid);
  return canvas.evaluate(
    (el, { key, columnRef, rowIndex }) => {
      const api = (el as GridA11yCanvas)[key];
      if (api == null) {
        return { hasApi: false, column: null, rect: null, text: null };
      }
      const columnIndex =
        typeof columnRef === 'number'
          ? columnRef
          : api.getVisibleColumnByHeader(columnRef);
      if (columnIndex == null) {
        return { hasApi: true, column: null, rect: null, text: null };
      }
      return {
        hasApi: true,
        column: columnIndex,
        rect: api.getCellRect(columnIndex, rowIndex),
        text: api.getCellText(columnIndex, rowIndex),
      };
    },
    { key: GRID_A11Y_KEY, columnRef: column, rowIndex: row }
  );
}

/**
 * Look up the text and bounds of a column header.
 * @param grid Locator for the grid canvas or an element containing it
 * @param column Column to look up, by visible index or header text
 * @returns The query result
 */
async function queryColumnHeader(
  grid: Locator,
  column: ColumnRef
): Promise<GridQueryResult> {
  const canvas = await resolveGridCanvas(grid);
  return canvas.evaluate(
    (el, { key, columnRef }) => {
      const api = (el as GridA11yCanvas)[key];
      if (api == null) {
        return { hasApi: false, column: null, rect: null, text: null };
      }
      const columnIndex =
        typeof columnRef === 'number'
          ? columnRef
          : api.getVisibleColumnByHeader(columnRef);
      if (columnIndex == null) {
        return { hasApi: true, column: null, rect: null, text: null };
      }
      return {
        hasApi: true,
        column: columnIndex,
        rect: api.getColumnHeaderRect(columnIndex),
        text: api.getColumnHeaderText(columnIndex),
      };
    },
    { key: GRID_A11Y_KEY, columnRef: column }
  );
}

/**
 * Wait until the grid has rendered and the accessibility API is available.
 * @param grid Locator for the grid canvas or an element containing it
 */
export async function waitForGrid(grid: Locator): Promise<void> {
  const canvas = await resolveGridCanvas(grid);
  await expect
    .poll(() =>
      canvas.evaluate(
        (el, key) => (el as GridA11yCanvas)[key]?.metrics != null,
        GRID_A11Y_KEY
      )
    )
    .toBe(true);
}

/**
 * Get the text rendered in a cell.
 * Returns null when the grid has not rendered or the cell is not in the
 * viewport, so it can be polled while data loads.
 * @param grid Locator for the grid canvas or an element containing it
 * @param column Column of the cell, by visible index or header text
 * @param row Visible row index of the cell
 * @returns The cell text, or null if it is not available
 */
export async function getCellText(
  grid: Locator,
  column: ColumnRef,
  row: number
): Promise<string | null> {
  const { text } = await queryCell(grid, column, row);
  return text;
}

/**
 * Get the bounds of a cell, relative to the top left of the grid canvas.
 * @param grid Locator for the grid canvas or an element containing it
 * @param column Column of the cell, by visible index or header text
 * @param row Visible row index of the cell
 * @returns The bounds of the cell
 */
export async function getCellRect(
  grid: Locator,
  column: ColumnRef,
  row: number
): Promise<GridA11yRect> {
  const result = await queryCell(grid, column, row);
  if (result.rect == null) {
    throw makeQueryError(result, column, `Cell (${column}, ${row})`);
  }
  return result.rect;
}

/**
 * Get the centre of a cell in page coordinates, e.g. for `page.mouse` actions.
 * @param grid Locator for the grid canvas or an element containing it
 * @param column Column of the cell, by visible index or header text
 * @param row Visible row index of the cell
 * @returns The page coordinates of the centre of the cell
 */
export async function getCellLocation(
  grid: Locator,
  column: ColumnRef,
  row: number
): Promise<{ x: number; y: number }> {
  const canvas = await resolveGridCanvas(grid);
  const [rect, box] = await Promise.all([
    getCellRect(canvas, column, row),
    canvas.boundingBox(),
  ]);
  if (box == null) {
    throw new Error('Grid canvas is not visible.');
  }
  return {
    x: box.x + rect.x + rect.width / 2,
    y: box.y + rect.y + rect.height / 2,
  };
}

/**
 * Click the centre of a cell.
 * @param grid Locator for the grid canvas or an element containing it
 * @param column Column of the cell, by visible index or header text
 * @param row Visible row index of the cell
 * @param options Playwright click options, e.g. `{ modifiers: ['Shift'] }`
 */
export async function clickCell(
  grid: Locator,
  column: ColumnRef,
  row: number,
  options?: GridClickOptions
): Promise<void> {
  const canvas = await resolveGridCanvas(grid);
  const rect = await getCellRect(canvas, column, row);
  await canvas.click({
    ...options,
    position: { x: rect.x + rect.width / 2, y: rect.y + rect.height / 2 },
  });
}

/**
 * Get the text of a column header.
 * Returns null when the grid has not rendered or the column is not in the
 * viewport, so it can be polled while data loads.
 * @param grid Locator for the grid canvas or an element containing it
 * @param column Column to look up, by visible index or header text
 * @returns The column header text, or null if it is not available
 */
export async function getColumnHeaderText(
  grid: Locator,
  column: ColumnRef
): Promise<string | null> {
  const { text } = await queryColumnHeader(grid, column);
  return text;
}

/**
 * Click the centre of a column header.
 * @param grid Locator for the grid canvas or an element containing it
 * @param column Column to click, by visible index or header text
 * @param options Playwright click options, e.g. `{ modifiers: ['Shift'] }` to add a sort
 */
export async function clickColumnHeader(
  grid: Locator,
  column: ColumnRef,
  options?: GridClickOptions
): Promise<void> {
  const canvas = await resolveGridCanvas(grid);
  const result = await queryColumnHeader(canvas, column);
  if (result.rect == null) {
    throw makeQueryError(result, column, `Column header "${column}"`);
  }
  const { rect } = result;
  await canvas.click({
    ...options,
    position: { x: rect.x + rect.width / 2, y: rect.y + rect.height / 2 },
  });
}

/**
 * Assert the text rendered in a cell, retrying until it matches or times out.
 * @param grid Locator for the grid canvas or an element containing it
 * @param column Column of the cell, by visible index or header text
 * @param row Visible row index of the cell
 * @param expected The expected cell text
 */
export async function expectCellText(
  grid: Locator,
  column: ColumnRef,
  row: number,
  expected: string
): Promise<void> {
  const canvas = await resolveGridCanvas(grid);
  await expect
    .poll(() => getCellText(canvas, column, row), {
      message: `Expected cell (${column}, ${row}) to be "${expected}"`,
    })
    .toBe(expected);
}
