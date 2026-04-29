/* eslint-disable react-refresh/only-export-components */
import { createContext, useContext } from 'react';
import type { NodeId } from '../types';
import type { DropZone } from './dropZone';

export interface DragHover {
  stackId: NodeId;
  zone: DropZone;
}

export interface DragContextValue {
  /** Id of the panel currently being dragged, or null when idle. */
  activePanelId: NodeId | null;
  /** Id of the stack the dragged panel was originally in, or null. */
  sourceStackId: NodeId | null;
  /** Current hover state — which stack and which zone. */
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
