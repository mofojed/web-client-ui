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
 *
 * `rootSibling` resolves the current root at apply time rather than capturing
 * a node id at hover time. This is important for outer-edge drops, where the
 * root id can change between dispatch and apply: removing the panel about to
 * be moved may collapse a single-child container, which renames the root.
 */
export type DropTarget =
  | { type: 'stack'; stackId: NodeId; index: number }
  | { type: 'sibling'; nodeId: NodeId; side: Side }
  | { type: 'container'; containerId: NodeId; index: number }
  | { type: 'rootSibling'; side: Side };

/** Position/size of a popped-out child window, in screen coordinates. */
export interface PopoutGeometry {
  screenX: number;
  screenY: number;
  width: number;
  height: number;
  /**
   * Window Management API screen label, when available. Best-effort hint used
   * to re-place a window on the same monitor it was last seen on.
   */
  screenLabel?: string;
}

/**
 * A popped-out window — the layout it hosts (initially a single-panel
 * stack; can grow if the user drags additional panels in cross-window)
 * plus the geometry of the child window itself.
 */
export interface PopoutEntry {
  layout: LayoutNode;
  geometry: PopoutGeometry;
}

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
  | { kind: 'updatePanelState'; panelId: NodeId; state: unknown }
  | { kind: 'popoutPanel'; panelId: NodeId; geometry: PopoutGeometry }
  | { kind: 'closePopoutPanel'; panelId: NodeId }
  | { kind: 'updatePopoutGeometry'; panelId: NodeId; geometry: PopoutGeometry }
  /**
   * Apply `inner` to a specific popout's layout sub-tree. Used both
   * locally (popout's own Dashboard dispatches a movePanel that becomes
   * `popoutScope({ popoutId, inner: movePanel(...) })`) and across windows
   * (popout broadcasts to parent, parent applies the scoped transform).
   *
   * If the inner transform reduces the popout to zero panels, the popout
   * entry is dropped automatically.
   */
  | { kind: 'popoutScope'; popoutId: NodeId; inner: Transform };

export interface LayoutState {
  initial: LayoutNode;
  transforms: Transform[];
  /**
   * Panels that have been torn out into their own browser windows. Keyed by
   * panel id. Optional so older serialized states (without popouts) hydrate
   * cleanly.
   */
  popouts?: Record<NodeId, PopoutEntry>;
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
