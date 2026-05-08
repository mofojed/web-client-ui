import { useCallback, useEffect, useMemo } from 'react';
import clamp from 'lodash.clamp';
import { useDhId, usePanelId } from '@deephaven/dashboard';
import {
  type IrisGridProps,
  type IrisGridModel,
  type IrisGridType,
} from '@deephaven/iris-grid';
import { type ModelIndex } from '@deephaven/grid';
import { type RowDataMap } from '@deephaven/jsapi-utils';
import { type dh } from '@deephaven/jsapi-types';
import { assertNotNull } from '@deephaven/utils';
import { useLinker } from './linker/LinkerContext';

export function useGridLinker(
  model: IrisGridModel | null,
  irisGrid: IrisGridType | null
): Pick<
  IrisGridProps,
  | 'alwaysFetchColumns'
  | 'columnSelectionValidator'
  | 'isSelectingColumn'
  | 'onColumnSelected'
  | 'onDataSelected'
> {
  const dhId = useDhId();
  const panelId = usePanelId();
  const linker = useLinker();

  const {
    getLinkSourceColumns,
    isSelectingColumn,
    validateColumnSelection,
    onColumnSelected: linkerOnColumnSelected,
    onDataSelected: linkerOnDataSelected,
    registerLinkTarget,
  } = linker;

  const alwaysFetchColumns = useMemo(
    () => [...getLinkSourceColumns(dhId)],
    [getLinkSourceColumns, dhId]
  );

  const isColumnSelectionValid = useCallback(
    (column: dh.Column | null) => {
      if (column == null) {
        return false;
      }
      return validateColumnSelection(dhId, column);
    },
    [validateColumnSelection, dhId]
  );

  const onDataSelected = useCallback(
    (_row: ModelIndex, dataMap: RowDataMap) => {
      linkerOnDataSelected(dhId, dataMap);
    },
    [linkerOnDataSelected, dhId]
  );

  const onColumnSelected = useCallback(
    (column: dh.Column) => {
      linkerOnColumnSelected(dhId, column);
    },
    [linkerOnColumnSelected, dhId]
  );

  const getCoordinates = useCallback(
    (columnName: string): [number, number] | null => {
      if (!model || !irisGrid) {
        return null;
      }

      const { gridWrapper } = irisGrid;
      const rect = gridWrapper?.getBoundingClientRect() ?? null;
      if (rect == null || rect.width <= 0 || rect.height <= 0) {
        return null;
      }
      const { metrics } = irisGrid.state;
      assertNotNull(metrics);
      const {
        columnHeaderHeight,
        allColumnXs,
        allColumnWidths,
        right,
        columnHeaderMaxDepth,
      } = metrics;
      const columnIndex = model.getColumnIndexByName(columnName);
      assertNotNull(columnIndex);
      const visibleIndex = irisGrid.getVisibleColumn(columnIndex);
      const columnX = allColumnXs.get(visibleIndex) ?? 0;
      const columnWidth = allColumnWidths.get(visibleIndex) ?? 0;

      const x = clamp(
        visibleIndex > right
          ? rect.right
          : rect.left + columnX + columnWidth * 0.5,
        rect.left,
        rect.right
      );
      const y = rect.top + columnHeaderHeight * columnHeaderMaxDepth;

      return [x, y];
    },
    [model, irisGrid]
  );

  useEffect(
    function registerTarget() {
      if (!irisGrid || panelId == null || dhId == null) {
        return;
      }
      registerLinkTarget(dhId, panelId, {
        getCoordinates,
        setFilterValues: irisGrid.setFilterMap,
        unsetFilterValue: () => {
          // No-op
        },
        panelId,
      });
      return () => {
        registerLinkTarget(dhId, panelId, null);
      };
    },
    [registerLinkTarget, dhId, panelId, getCoordinates, irisGrid]
  );

  return {
    alwaysFetchColumns,
    columnSelectionValidator: isColumnSelectionValid,
    isSelectingColumn,
    onColumnSelected,
    onDataSelected,
  };
}

export default useGridLinker;
