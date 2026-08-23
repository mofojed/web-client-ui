import React, { useRef } from 'react';
import { fireEvent, render } from '@testing-library/react';
import Grid from './Grid';
import GridTheme, { type GridTheme as GridThemeType } from './GridTheme';
import MockGridModel from './MockGridModel';
import { GRID_A11Y_KEY, type GridA11yCanvas } from './GridA11y';
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
  const rect = api.getCellRect(2, 3);
  if (rect == null) {
    throw new Error('Expected a rect for cell 2,3');
  }

  const clientX = rect.x + rect.width / 2;
  const clientY = rect.y + rect.height / 2;
  fireEvent.mouseDown(grid.canvas!, { clientX, clientY });
  fireEvent.mouseUp(grid.canvas!, { clientX, clientY });

  const [range] = grid.state.selectedRanges;
  expect(range.startColumn).toBe(2);
  expect(range.startRow).toBe(3);
});
