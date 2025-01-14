import { act, renderHook } from '@testing-library/react-hooks';
import type { Table } from '@deephaven/jsapi-types';
import { generateEmptyKeyedItems } from '@deephaven/jsapi-utils';
import { KeyedItem, TestUtils } from '@deephaven/utils';
import useInitializeViewportData from './useInitializeViewportData';
import useTableSize from './useTableSize';

jest.mock('./useTableSize');

function expectedInitialItems(size: number) {
  return [...generateEmptyKeyedItems(0, size - 1)];
}

const tableA = TestUtils.createMockProxy<Table>({ size: 4 });
const expectedInitialA: KeyedItem<unknown>[] = expectedInitialItems(
  tableA.size
);

const tableB = TestUtils.createMockProxy<Table>({ size: 2 });
const expectedInitialB = expectedInitialItems(tableB.size);

beforeEach(() => {
  TestUtils.asMock(useTableSize).mockImplementation(table => table?.size ?? 0);
});

it.each([null])('should safely handle no table: %s', noTable => {
  const { result } = renderHook(() => useInitializeViewportData(noTable));
  expect(result.current.items).toEqual([]);
});

it('should initialize a ListData object based on Table size', () => {
  const { result } = renderHook(() => useInitializeViewportData(tableA));

  expect(result.current.items).toEqual(expectedInitialA);
});

it('should re-initialize a ListData object if Table reference changes', () => {
  const { result, rerender } = renderHook(
    ({ table }) => useInitializeViewportData(table),
    {
      initialProps: { table: tableA },
    }
  );

  // Update an item
  const updatedItem = { key: '0', item: 'mock.item' };
  act(() => {
    result.current.update(updatedItem.key, updatedItem);
  });

  const expectedAfterUpdate = [updatedItem, ...expectedInitialA.slice(1)];
  expect(result.current.items).toEqual(expectedAfterUpdate);

  // Re-render with a new table instance
  rerender({ table: tableB });

  const expectedAfterRerender = expectedInitialB;
  expect(result.current.items).toEqual(expectedAfterRerender);
});

it.each([
  [3, expectedInitialItems(3)],
  [5, expectedInitialItems(5)],
])(
  'should re-initialize a ListData object if Table size changes: %s, %s',
  (newSize, expectedAfterSizeChange) => {
    const { result, rerender } = renderHook(
      ({ table }) => useInitializeViewportData(table),
      {
        initialProps: { table: tableA },
      }
    );

    expect(result.current.items).toEqual(expectedInitialA);

    // Update an item
    const updatedItem = { key: '0', item: 'mock.item' };
    act(() => {
      result.current.update(updatedItem.key, updatedItem);
    });

    const expectedAfterUpdate = [updatedItem, ...expectedInitialA.slice(1)];
    expect(result.current.items).toEqual(expectedAfterUpdate);

    // Re-render with new size
    TestUtils.asMock(useTableSize).mockImplementation(() => newSize);
    rerender({ table: tableA });

    expect(result.current.items).toEqual(expectedAfterSizeChange);
  }
);
