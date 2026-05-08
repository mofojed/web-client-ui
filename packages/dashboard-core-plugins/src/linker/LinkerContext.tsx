import { createContext, useContext } from 'react';
import { type dh } from '@deephaven/jsapi-types';
import { type RowDataMap } from '@deephaven/jsapi-utils';
import { type LinkTargetProps } from './LinkerEvent';

export type LinkerContextValue = {
  /**
   * Get the names of columns the source identified by `dhId` is currently
   * linked from. Used to drive `alwaysFetchColumns` on a grid.
   */
  getLinkSourceColumns: (dhId: string | null) => readonly string[];

  /**
   * Whether a column-selection (linker) session is currently active.
   */
  isSelectingColumn: boolean;

  /**
   * Validate whether the given column on the given source can be selected as
   * a link point in the current linker session.
   */
  validateColumnSelection: (dhId: string | null, column: dh.Column) => boolean;

  /**
   * Notify the linker that the given column was selected as a link point.
   */
  onColumnSelected: (dhId: string | null, column: dh.Column) => void;

  /**
   * Notify the linker that data was selected at the given source. The data
   * map is propagated to any link targets.
   */
  onDataSelected: (dhId: string | null, dataMap: RowDataMap) => void;

  /**
   * Register or unregister a link target. Pass `null` as `target` to
   * deregister.
   */
  registerLinkTarget: (
    dhId: string | null,
    panelId: string | null,
    target: LinkTargetProps | null
  ) => void;
};

export const defaultLinkerContextValue: LinkerContextValue = Object.freeze({
  getLinkSourceColumns: () => [],
  isSelectingColumn: false,
  validateColumnSelection: () => false,
  onColumnSelected: () => undefined,
  onDataSelected: () => undefined,
  registerLinkTarget: () => undefined,
});

export const LinkerContext = createContext<LinkerContextValue>(
  defaultLinkerContextValue
);

export function useLinker(): LinkerContextValue {
  return useContext(LinkerContext);
}

export default LinkerContext;
