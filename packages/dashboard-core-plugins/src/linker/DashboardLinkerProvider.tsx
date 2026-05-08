import { useCallback, useMemo, type ReactNode } from 'react';
import {
  useAppSelector,
  useDashboardId,
  useLayoutManager,
} from '@deephaven/dashboard';
import { type RootState } from '@deephaven/redux';
import { type dh } from '@deephaven/jsapi-types';
import { type RowDataMap } from '@deephaven/jsapi-utils';
import {
  getColumnSelectionValidatorForDashboard,
  getLinksForDashboard,
} from '../redux';
import {
  emitLinkPointSelected,
  emitLinkSourceDataSelected,
  emitRegisterLinkTarget,
  type LinkTargetProps,
} from './LinkerEvent';
import { LinkerContext, type LinkerContextValue } from './LinkerContext';

export type DashboardLinkerProviderProps = {
  children?: ReactNode;
};

/**
 * Provides a `LinkerContext` populated from the surrounding dashboard's redux
 * state and event hub. Must be rendered inside a `Dashboard`.
 */
export function DashboardLinkerProvider({
  children,
}: DashboardLinkerProviderProps): JSX.Element {
  const { eventHub } = useLayoutManager();
  const dashboardId = useDashboardId();

  const getLinks = useCallback(
    (s: RootState) => getLinksForDashboard(s, dashboardId),
    [dashboardId]
  );
  const links = useAppSelector(getLinks);

  const getColumnSelectionValidator = useCallback(
    (s: RootState) => getColumnSelectionValidatorForDashboard(s, dashboardId),
    [dashboardId]
  );
  const columnSelectionValidator = useAppSelector(getColumnSelectionValidator);

  const value = useMemo<LinkerContextValue>(() => {
    return {
      getLinkSourceColumns: (dhId: string | null) => {
        if (dhId == null) {
          return [];
        }
        const columnSet = new Set<string>();
        links.forEach(link => {
          if (link.start.panelId === dhId) {
            columnSet.add(link.start.columnName);
          }
        });
        return [...columnSet];
      },
      isSelectingColumn: columnSelectionValidator != null,
      validateColumnSelection: (dhId: string | null, column: dh.Column) => {
        if (columnSelectionValidator == null || dhId == null) {
          return false;
        }
        return columnSelectionValidator(dhId, column, { type: 'tableLink' });
      },
      onColumnSelected: (dhId: string | null, column: dh.Column) => {
        if (dhId == null) {
          return;
        }
        emitLinkPointSelected(eventHub, dhId, column, { type: 'tableLink' });
      },
      onDataSelected: (dhId: string | null, dataMap: RowDataMap) => {
        if (dhId == null) {
          return;
        }
        emitLinkSourceDataSelected(eventHub, dhId, dataMap);
      },
      registerLinkTarget: (
        dhId: string | null,
        _panelId: string | null,
        target: LinkTargetProps | null
      ) => {
        if (dhId == null) {
          return;
        }
        emitRegisterLinkTarget(eventHub, dhId, target);
      },
    };
  }, [eventHub, links, columnSelectionValidator]);

  return (
    <LinkerContext.Provider value={value}>{children}</LinkerContext.Provider>
  );
}

export default DashboardLinkerProvider;
