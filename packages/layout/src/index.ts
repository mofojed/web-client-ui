export type {
  BaseNode,
  ColumnNode,
  ContainerKind,
  ContainerNode,
  DehydrateOptions,
  DropTarget,
  HydrateOptions,
  LayoutNode,
  LayoutState,
  NodeId,
  PanelNode,
  PopoutEntry,
  PopoutGeometry,
  RowNode,
  SerializedLayoutState,
  Side,
  StackNode,
  Transform,
} from './types';

export { applyTransform, applyTransforms } from './state/reducer';
export type { ResolvedState } from './state/reducer';
export { compact, resolveLayout } from './state/compact';
export { dehydrate, hydrate } from './state/hydrate';
export { normalize, makeId } from './state/normalize';
export {
  findNode,
  findParent,
  isContainer,
  isPanel,
  isStack,
  iterPanels,
} from './state/treeUtils';

export { default as Dashboard } from './components/Dashboard';
export type { DashboardProps } from './components/Dashboard';
export { default as createLayoutState } from './components/createLayoutState';
export { default as MaximizeBreadcrumb } from './components/MaximizeBreadcrumb';
export type { MaximizeBreadcrumbProps } from './components/MaximizeBreadcrumb';
export {
  MaximizeProvider,
  useMaximizeChain,
} from './components/MaximizeContext';
export type {
  AddPanelFn,
  BreadcrumbSegment,
  MaximizeChain,
  MaximizeProviderProps,
} from './components/MaximizeContext';
export type { DropZone } from './dnd/dropZone';
export type {
  PanelContentProps,
  PanelDefinition,
  PanelRegistry,
  TabRenderProps,
} from './components/types';

export {
  useLayoutState,
  type UseLayoutStateResult,
} from './hooks/useLayoutState';
export {
  usePersistedLayoutState,
  type UsePersistedLayoutStateOptions,
  type UsePersistedLayoutStateResult,
} from './hooks/usePersistedLayoutState';

export { default as PopoutPanelHost } from './popout/PopoutPanelHost';
export type { PopoutPanelHostProps } from './popout/PopoutPanelHost';
export { default as PopoutController } from './popout/PopoutController';
export type { PopoutControllerProps } from './popout/PopoutController';
export { openPopoutWindow } from './popout/openPopoutWindow';
export {
  parsePopoutParams,
  POPOUT_PARAM,
  POPOUT_LAYOUT_KEY_PARAM,
} from './popout/popoutQuery';
export type { PopoutParams } from './popout/popoutQuery';
