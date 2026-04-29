/* eslint-disable react-refresh/only-export-components */
import { createContext, useContext } from 'react';
import type { NodeId, Side } from '../types';
import type { DropZone } from './dropZone';

/**
 * Hover indicates *what* the in-progress drop will do. Two flavours:
 *  - `stackZone`: targeting a specific stack at one of the 5-zone hotspots.
 *    For zone='center' on the tab strip, `insertIndex` pinpoints the
 *    insertion position; otherwise the panel appends at the end.
 *  - `outerEdge`: targeting the resolved root for a top-level split. Used
 *    when the pointer is in the dashboard's outer edge band.
 */
export type DragHover =
  | {
      kind: 'stackZone';
      stackId: NodeId;
      zone: DropZone;
      insertIndex?: number;
    }
  | {
      kind: 'outerEdge';
      side: Side;
    };

export interface DragContextValue {
  /** Id of the panel currently being dragged, or null when idle. */
  activePanelId: NodeId | null;
  /** Id of the stack the dragged panel was originally in, or null. */
  sourceStackId: NodeId | null;
  /** Current hover state — what the drop will do if released now. */
  hover: DragHover | null;
}

const DragContext = createContext<DragContextValue>({
  activePanelId: null,
  sourceStackId: null,
  hover: null,
});

export default DragContext;

export function useDragState(): DragContextValue {
  return useContext(DragContext);
}
