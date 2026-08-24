import React, { useRef } from 'react';
import { fireEvent, render } from '@testing-library/react';
import Grid from './Grid';
import GridTheme, { type GridTheme as GridThemeType } from './GridTheme';
import MockGridModel from './MockGridModel';
import {
  GRID_A11Y_KEY,
  type GridA11yApi,
  type GridA11yCanvas,
} from './GridA11y';
import { GridRange } from './GridRange';
import type GridModel from './GridModel';

const defaultTheme = { ...GridTheme, autoSizeColumns: false } as GridThemeType;

const VIEW_SIZE = 1000;

jest
  .spyOn(Element.prototype, 'getBoundingClientRect')
  .mockReturnValue(new DOMRect(0, 0, VIEW_SIZE, VIEW_SIZE));

jest.spyOn(Element.prototype, 'clientWidth', 'get').mockReturnValue(VIEW_SIZE);

jest.spyOn(Element.prototype, 'clientHeight', 'get').mockReturnValue(VIEW_SIZE);

function makeGridComponent(model: GridModel = new MockGridModel()): Grid {
  let ref: React.RefObject<Grid>;
  function GridWithRef() {
    ref = useRef<Grid>(null);
    return <Grid model={model} theme={defaultTheme} ref={ref} />;
  }
  render(<GridWithRef />);
  return ref!.current!;
}

function getA11yApi(grid: Grid) {
  const api = (grid.canvas as GridA11yCanvas)[GRID_A11Y_KEY];
  if (api == null) {
    throw new Error('Accessibility API not attached to canvas');
  }
  return api;
}

function clickCell(
  grid: Grid,
  api: GridA11yApi,
  column: number,
  row: number,
  eventInit?: MouseEventInit
) {
  const rect = api.getCellRect(column, row);
  if (rect == null) {
    throw new Error(`Expected a rect for cell ${column},${row}`);
  }

  const clientX = rect.x + rect.width / 2;
  const clientY = rect.y + rect.height / 2;
  fireEvent.mouseDown(grid.canvas!, { ...eventInit, clientX, clientY });
  fireEvent.mouseUp(grid.canvas!, { ...eventInit, clientX, clientY });
}

it('attaches the a11y api to the canvas', () => {
  const model = new MockGridModel();
  const grid = makeGridComponent(model);
  const api = getA11yApi(grid);

  expect(api.model).toBe(model);
  expect(api.renderer).toBe(grid.renderer);
  expect(api.metrics).toBe(grid.metrics);
});

it('gets the text for a cell in the viewport', () => {
  const api = getA11yApi(makeGridComponent());

  expect(api.getCellText(2, 3)).toBe('2,3');
});

it('returns null for a cell outside of the viewport', () => {
  const api = getA11yApi(makeGridComponent());

  expect(api.getCellText(0, 100000)).toBeNull();
  expect(api.getCellRect(0, 100000)).toBeNull();
});

it('gets the rect for a cell in the viewport', () => {
  const api = getA11yApi(makeGridComponent());
  const { rowHeaderWidth, columnHeaderHeight, columnWidth, rowHeight } =
    defaultTheme;

  expect(api.getCellRect(2, 3)).toEqual({
    x: rowHeaderWidth + columnWidth * 2,
    y: columnHeaderHeight + rowHeight * 3,
    width: columnWidth,
    height: rowHeight,
  });
});

it('gets the text and rect for a column header', () => {
  const api = getA11yApi(makeGridComponent());
  const { rowHeaderWidth, columnHeaderHeight, columnWidth } = defaultTheme;

  expect(api.getColumnHeaderText(2)).toBe('2');
  expect(api.getColumnHeaderRect(2)).toEqual({
    x: rowHeaderWidth + columnWidth * 2,
    y: 0,
    width: columnWidth,
    height: columnHeaderHeight,
  });
});

it('finds a visible column by header text', () => {
  const api = getA11yApi(makeGridComponent());

  expect(api.getVisibleColumnByHeader('2')).toBe(2);
  expect(api.getVisibleColumnByHeader('not a column')).toBeNull();
});

it('reports a cell rect that selects the expected cell when clicked', () => {
  const grid = makeGridComponent();
  const api = getA11yApi(grid);

  clickCell(grid, api, 2, 3);

  const [range] = grid.state.selectedRanges;
  expect(range.startColumn).toBe(2);
  expect(range.startRow).toBe(3);
});

it('reports no selection until something is selected', () => {
  const api = getA11yApi(makeGridComponent());

  expect(api.getSelectedRanges()).toEqual([]);
  expect(api.getCursor()).toBeNull();
});

it('reports the selected ranges and cursor', () => {
  const grid = makeGridComponent();
  const api = getA11yApi(grid);

  clickCell(grid, api, 2, 3);

  expect(api.getSelectedRanges()).toEqual([GridRange.makeCell(2, 3)]);
  expect(api.getCursor()).toEqual({ column: 2, row: 3 });

  clickCell(grid, api, 4, 6, { shiftKey: true });

  expect(api.getSelectedRanges()).toEqual([new GridRange(2, 3, 4, 6)]);
  expect(api.getCursor()).toEqual({ column: 2, row: 3 });
});

it('describes the grid size, viewport, cursor, and selection', () => {
  const grid = makeGridComponent(new MockGridModel({ rowCount: 20 }));
  const api = getA11yApi(grid);

  expect(api.getSummary()).toBe('Grid with 20 rows and 100 columns.');
  expect(api.getDescription()).toContain('Grid with 20 rows and 100 columns.');
  expect(api.getDescription()).toContain('Showing rows 1 to');

  clickCell(grid, api, 2, 3);

  expect(api.getSummary()).toContain('Cursor on row 4, column 2, 2,3.');
  expect(api.getSummary()).toContain('1 cell selected.');
  expect(api.getDescription()).toContain('Cursor on row 4, column 2, 2,3.');
});

it('leaves the viewport out of the summary rendered on every frame', () => {
  const api = getA11yApi(makeGridComponent());

  expect(api.getSummary()).not.toContain('Showing rows');
});

it('describes the grid contents from the canvas fallback content', () => {
  const grid = makeGridComponent();
  const api = getA11yApi(grid);
  const describeButton = grid.canvas?.querySelector('button');
  if (describeButton == null) {
    throw new Error('Expected a button in the canvas fallback content');
  }

  expect(grid.canvas?.textContent).toContain(api.getSummary());
  expect(grid.canvas?.textContent).not.toContain('Showing rows');

  fireEvent.click(describeButton);

  expect(grid.canvas?.textContent).toContain(api.getDescription());
});

it('does not select a cell when the fallback content button is clicked', () => {
  const grid = makeGridComponent();
  const describeButton = grid.canvas?.querySelector('button');
  if (describeButton == null) {
    throw new Error('Expected a button in the canvas fallback content');
  }

  fireEvent.click(describeButton);

  expect(grid.state.selectedRanges).toEqual([]);
});
