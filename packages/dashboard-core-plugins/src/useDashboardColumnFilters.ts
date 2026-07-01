import { useCallback, useContext, useEffect, useMemo } from 'react';
import type { dh } from '@deephaven/jsapi-types';
import { IrisGridUtils, type InputFilter } from '@deephaven/iris-grid';
import {
  DashboardIdContext,
  useAppSelector,
  useDhId,
  useEventHub,
} from '@deephaven/dashboard';
import { type RootState } from '@deephaven/redux';
import { getInputFiltersForDashboard } from './redux';
import {
  type FilterColumnSourceId,
  type FilterChangeEvent,
  emitFilterColumnsChanged,
  emitFilterTableChanged,
} from './FilterEvents';

const EMPTY_INPUT_FILTERS: FilterChangeEvent[] = [];

/**
 * Subscribes to the dashboard column filters (a.k.a. InputFilter) for the current panel or widget, and
 * adds the columns provided to the filter options in the dashboard.
 * @param columns The columns this source has available for filtering.
 *                These are used to populate filter options in the UI (InputFilter, DropdownFilter).
 *                null can be used to indicate the source is not yet ready which is useful
 *                to preserve
 * @param table The table for this source if applicable.
 *              This is used to enable ChartBuilder from IrisGrid.
 * @returns The dashboard column filters (InputFilter[]) that apply to the columns provided.
 */
export function useDashboardColumnFilters(
  columns: readonly { name: string; type: string }[] | null,
  table?: dh.Table
): InputFilter[] {
  const eventHub = useEventHub();
  const dashboardId = useContext(DashboardIdContext);
  const panelId = useDhId() as FilterColumnSourceId | null;

  useEffect(
    function columnsChanged() {
      if (eventHub == null || panelId == null || columns == null) {
        return;
      }
      emitFilterColumnsChanged(eventHub, panelId, columns);
    },
    [eventHub, panelId, columns]
  );

  useEffect(
    function tableChanged() {
      if (eventHub == null || table == null || panelId == null) {
        return;
      }
      emitFilterTableChanged(eventHub, panelId, table);
    },
    [eventHub, panelId, table]
  );

  // Cleanup separately because filtering the table or other operations can get a new columns array,
  // and we are using null to indicate unmount, not change
  useEffect(
    function cleanupOnUnmount() {
      if (eventHub == null || panelId == null) {
        return;
      }
      return () => {
        emitFilterColumnsChanged(eventHub, panelId, null);
        emitFilterTableChanged(eventHub, panelId, null);
      };
    },
    [eventHub, panelId]
  );

  const getInputFilters = useCallback(
    (s: RootState) =>
      dashboardId == null
        ? EMPTY_INPUT_FILTERS
        : getInputFiltersForDashboard(s, dashboardId),
    [dashboardId]
  );

  const reduxInputFilters = useAppSelector(getInputFilters);

  const inputFilters = useMemo(
    () =>
      IrisGridUtils.getInputFiltersForColumns(
        columns ?? [],
        // They may have picked a column, but not actually entered a value yet. In that case, don't need to update.
        reduxInputFilters.filter(
          ({ value, excludePanelIds }) =>
            value != null &&
            (excludePanelIds == null ||
              (panelId != null && !excludePanelIds.includes(panelId)))
        )
      ),
    [columns, panelId, reduxInputFilters]
  );

  return inputFilters;
}

export default useDashboardColumnFilters;
