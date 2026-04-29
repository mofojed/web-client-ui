export type NodeId = string;

export type Side = 'top' | 'right' | 'bottom' | 'left';

export type ContainerKind = 'row' | 'column' | 'stack';

export interface BaseNode {
  id: NodeId;
  /** Fractional weight (0..1) of this node within its parent container. Siblings should sum to ~1. */
  size?: number;
  /** Minimum size in pixels. Enforced by splitter drag handlers. */
  minSize?: number;
}

export interface RowNode extends BaseNode {
  type: 'row';
  children: LayoutNode[];
}

export interface ColumnNode extends BaseNode {
  type: 'column';
  children: LayoutNode[];
}

export interface StackNode extends BaseNode {
  type: 'stack';
  children: PanelNode[];
  /** Active tab. Defaults to first child if missing. */
  activeId?: NodeId;
}

export interface PanelNode extends BaseNode {
  type: 'panel';
  /** Key into the consumer-supplied panel registry. */
  component: string;
  /** Opaque, JSON-serializable per-panel state. */
  state?: unknown;
  /** Default title; consumers may override via `renderTab`. */
  title?: string;
}

export type ContainerNode = RowNode | ColumnNode | StackNode;
export type LayoutNode = ContainerNode | PanelNode;

/**
 * Where a panel is being moved or added to.
 */
export type DropTarget =
  | { type: 'stack'; stackId: NodeId; index: number }
  | { type: 'sibling'; nodeId: NodeId; side: Side }
  | { type: 'container'; containerId: NodeId; index: number };

export type Transform =
  | { kind: 'movePanel'; panelId: NodeId; target: DropTarget }
  | { kind: 'addPanel'; panel: PanelNode; target: DropTarget }
  | { kind: 'closePanel'; panelId: NodeId }
  | { kind: 'reorderTab'; stackId: NodeId; panelId: NodeId; index: number }
  | { kind: 'setActive'; stackId: NodeId; panelId: NodeId }
  | {
      kind: 'setSizes';
      containerId: NodeId;
      sizes: Record<NodeId, number>;
    }
  | { kind: 'updatePanelState'; panelId: NodeId; state: unknown };

export interface LayoutState {
  initial: LayoutNode;
  transforms: Transform[];
}

export interface DehydrateOptions {
  /** Per-panel hook to transform `panel.state` before serializing. */
  dehydratePanelState?: (component: string, state: unknown) => unknown;
}

export interface HydrateOptions {
  /** Per-panel hook to transform `panel.state` after deserializing. */
  hydratePanelState?: (component: string, state: unknown) => unknown;
}

export type SerializedLayoutState = LayoutState;
