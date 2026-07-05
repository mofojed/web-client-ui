import type {
  ContainerNode,
  DropTarget,
  LayoutNode,
  NodeId,
  PanelNode,
  PopoutEntry,
  PopoutGeometry,
  StackNode,
  Transform,
} from '../types';
import {
  findNode,
  findParent,
  isContainer,
  isPanel,
  isStack,
  iterPanels,
  removeNode,
  replaceNode,
} from './treeUtils';
import {
  normalize,
  wrapPanelInStack as wrapPanelInStackForLayout,
} from './normalize';

/**
 * The fully resolved state produced by folding transforms over the initial
 * baseline. `root` is the layout tree; `popouts` is the set of panels that
 * have been torn out into their own browser windows.
 */
export interface ResolvedState {
  root: LayoutNode;
  popouts: Record<NodeId, PopoutEntry>;
  /** The panel currently maximized to fill the dashboard, or null. */
  maximizedId: NodeId | null;
}

function clamp(n: number, lo: number, hi: number): number {
  if (n < lo) return lo;
  if (n > hi) return hi;
  return n;
}

function wrapPanelInStack(panel: PanelNode): StackNode {
  return {
    type: 'stack',
    id: `stack-${panel.id}`,
    children: [panel],
    activeId: panel.id,
    size: panel.size,
  };
}

function closePanel(root: LayoutNode, panelId: NodeId): LayoutNode {
  return removeNode(root, panelId) ?? root;
}

function reorderTab(
  root: LayoutNode,
  stackId: NodeId,
  panelId: NodeId,
  index: number
): LayoutNode {
  return replaceNode(root, stackId, n => {
    if (!isStack(n)) return n;
    const panel = n.children.find(c => c.id === panelId);
    if (!panel) return n;
    const without = n.children.filter(c => c.id !== panelId);
    const i = clamp(index, 0, without.length);
    return {
      ...n,
      children: [...without.slice(0, i), panel, ...without.slice(i)],
    };
  });
}

function setActive(
  root: LayoutNode,
  stackId: NodeId,
  panelId: NodeId
): LayoutNode {
  return replaceNode(root, stackId, n => {
    if (!isStack(n) || !n.children.some(c => c.id === panelId)) return n;
    return { ...n, activeId: panelId };
  });
}

function setSizes(
  root: LayoutNode,
  containerId: NodeId,
  sizes: Record<NodeId, number>
): LayoutNode {
  return replaceNode(root, containerId, n => {
    if (!isContainer(n) || n.type === 'stack') return n;
    return {
      ...n,
      children: n.children.map(c =>
        sizes[c.id] !== undefined ? { ...c, size: sizes[c.id] } : c
      ),
    };
  });
}

function updatePanelState(
  root: LayoutNode,
  panelId: NodeId,
  state: unknown
): LayoutNode {
  return replaceNode(root, panelId, n => {
    if (!isPanel(n)) return n;
    return { ...n, state };
  });
}

function insertAtTarget(
  root: LayoutNode,
  panel: PanelNode,
  target: DropTarget
): LayoutNode {
  switch (target.type) {
    case 'stack':
      return replaceNode(root, target.stackId, n => {
        if (!isStack(n)) return n;
        const i = clamp(target.index, 0, n.children.length);
        return {
          ...n,
          children: [...n.children.slice(0, i), panel, ...n.children.slice(i)],
          activeId: panel.id,
        };
      });
    case 'container':
      return replaceNode(root, target.containerId, n => {
        if (!isContainer(n) || n.type === 'stack') return n;
        const newStack = wrapPanelInStack({ ...panel, size: undefined });
        const i = clamp(target.index, 0, n.children.length);
        return {
          ...n,
          children: [
            ...n.children.slice(0, i),
            newStack,
            ...n.children.slice(i),
          ],
        };
      });
    case 'sibling':
      return splitWithPanel(root, target.nodeId, target.side, panel);
    case 'rootSibling':
      return splitWithPanel(root, root.id, target.side, panel);
    default: {
      const exhaustive: never = target;
      return exhaustive;
    }
  }
}

function splitWithPanel(
  root: LayoutNode,
  targetId: NodeId,
  side: 'top' | 'right' | 'bottom' | 'left',
  panel: PanelNode
): LayoutNode {
  const target = findNode(root, targetId);
  if (!target) return root;

  const axis: 'row' | 'column' =
    side === 'top' || side === 'bottom' ? 'column' : 'row';
  const placeAfter = side === 'right' || side === 'bottom';
  const newStack = wrapPanelInStack({ ...panel, size: undefined });

  const wrapperId = `${axis}-of-${panel.id}`;

  // root-level split: wrap the entire tree
  if (root.id === targetId) {
    const wrapper: ContainerNode = {
      type: axis,
      id: wrapperId,
      children: placeAfter ? [root, newStack] : [newStack, root],
    };
    return wrapper;
  }

  const parentInfo = findParent(root, targetId);
  if (!parentInfo) return root;
  const { parent, index } = parentInfo;

  if (parent.type === axis) {
    // insert as a new sibling adjacent to target
    return replaceNode(root, parent.id, n => {
      if (!isContainer(n)) return n;
      const insertIndex = placeAfter ? index + 1 : index;
      const next = {
        ...n,
        children: [
          ...n.children.slice(0, insertIndex),
          newStack,
          ...n.children.slice(insertIndex),
        ],
      };
      return next as LayoutNode;
    });
  }

  // perpendicular split: wrap the target in a new container of the right axis
  return replaceNode(root, targetId, n => {
    const inheritedSize = n.size;
    const inner: LayoutNode = { ...n, size: undefined } as LayoutNode;
    const wrapper: ContainerNode = {
      type: axis,
      id: wrapperId,
      children: placeAfter ? [inner, newStack] : [newStack, inner],
      size: inheritedSize,
    };
    return wrapper;
  });
}

function movePanel(
  root: LayoutNode,
  panelId: NodeId,
  target: DropTarget
): LayoutNode {
  const node = findNode(root, panelId);
  if (!node || !isPanel(node)) return root;

  // no-op: dropping a panel adjacent to itself
  if (target.type === 'sibling' && target.nodeId === panelId) return root;

  const removed = removeNode(root, panelId);
  if (removed == null) return root;

  // verify target still exists after removal (could have been collapsed away)
  switch (target.type) {
    case 'stack':
      if (!findNode(removed, target.stackId)) return root;
      break;
    case 'container':
      if (!findNode(removed, target.containerId)) return root;
      break;
    case 'sibling':
      if (!findNode(removed, target.nodeId)) return root;
      break;
    default:
      break;
  }

  return insertAtTarget(removed, node, target);
}

function popoutPanel(
  state: ResolvedState,
  panelId: NodeId,
  geometry: PopoutGeometry
): ResolvedState {
  const node = findNode(state.root, panelId);
  if (node == null || !isPanel(node)) return state;
  const removed = removeNode(state.root, panelId) ?? state.root;
  return {
    root: removed,
    popouts: {
      ...state.popouts,
      [panelId]: {
        layout: wrapPanelInStackForLayout(node),
        geometry,
      },
    },
    // A popped-out panel leaves this dashboard's tree, so it can no longer
    // be the maximized panel.
    maximizedId: state.maximizedId === panelId ? null : state.maximizedId,
  };
}

function closePopoutPanel(
  state: ResolvedState,
  panelId: NodeId
): ResolvedState {
  if (state.popouts[panelId] == null) return state;
  const next = { ...state.popouts };
  delete next[panelId];
  return { root: state.root, popouts: next, maximizedId: state.maximizedId };
}

function updatePopoutGeometry(
  state: ResolvedState,
  panelId: NodeId,
  geometry: PopoutGeometry
): ResolvedState {
  const existing = state.popouts[panelId];
  if (existing == null) return state;
  return {
    root: state.root,
    popouts: { ...state.popouts, [panelId]: { ...existing, geometry } },
    maximizedId: state.maximizedId,
  };
}

function updatePanelStateInPopouts(
  popouts: Record<NodeId, PopoutEntry>,
  panelId: NodeId,
  panelState: unknown
): Record<NodeId, PopoutEntry> {
  let changed: Record<NodeId, PopoutEntry> | null = null;
  Object.entries(popouts).forEach(([id, entry]) => {
    const found = findNode(entry.layout, panelId);
    if (found == null || !isPanel(found)) return;
    const newLayout = replaceNode(entry.layout, panelId, n =>
      isPanel(n) ? { ...n, state: panelState } : n
    );
    if (newLayout === entry.layout) return;
    changed = changed ?? { ...popouts };
    changed[id] = { ...entry, layout: newLayout };
  });
  return changed ?? popouts;
}

function applyToPopout(
  state: ResolvedState,
  popoutId: NodeId,
  inner: Transform
): ResolvedState {
  const entry = state.popouts[popoutId];
  if (entry == null) return state;

  // Closing the last panel of a popout drops the whole popout entry. We
  // detect this *before* running the inner reducer because closePanel's
  // own fallback (removeNode returning null → keep root) would otherwise
  // make this case a no-op.
  if (inner.kind === 'closePanel') {
    const panels = [...iterPanels(entry.layout)];
    if (panels.length <= 1 && panels.some(p => p.id === inner.panelId)) {
      const next = { ...state.popouts };
      delete next[popoutId];
      return {
        root: state.root,
        popouts: next,
        maximizedId: state.maximizedId,
      };
    }
  }

  const subResult = applyTransformInternal(
    { root: entry.layout, popouts: {}, maximizedId: null },
    inner
  );
  // If the inner transform somehow drained all panels, drop the popout.
  const remainingPanels = [...iterPanels(subResult.root)];
  if (remainingPanels.length === 0) {
    const next = { ...state.popouts };
    delete next[popoutId];
    return { root: state.root, popouts: next, maximizedId: state.maximizedId };
  }
  return {
    root: state.root,
    popouts: {
      ...state.popouts,
      [popoutId]: { ...entry, layout: subResult.root },
    },
    maximizedId: state.maximizedId,
  };
}

function isResolvedState(x: unknown): x is ResolvedState {
  return x !== null && typeof x === 'object' && 'root' in x && 'popouts' in x;
}

function applyTransformInternal(
  state: ResolvedState,
  transform: Transform
): ResolvedState {
  let nextRoot = state.root;
  let nextPopouts = state.popouts;
  let nextMaximized = state.maximizedId;
  switch (transform.kind) {
    case 'movePanel':
      nextRoot = movePanel(state.root, transform.panelId, transform.target);
      break;
    case 'addPanel':
      nextRoot = insertAtTarget(state.root, transform.panel, transform.target);
      break;
    case 'closePanel':
      nextRoot = closePanel(state.root, transform.panelId);
      if (state.popouts[transform.panelId] != null) {
        nextPopouts = { ...state.popouts };
        delete nextPopouts[transform.panelId];
      }
      // A closed panel can no longer be the maximized one.
      if (state.maximizedId === transform.panelId) {
        nextMaximized = null;
      }
      break;
    case 'setMaximized':
      // Only maximize a panel that actually exists in this tree; clearing
      // (null) always applies.
      nextMaximized =
        transform.panelId != null &&
        findNode(state.root, transform.panelId) == null
          ? state.maximizedId
          : transform.panelId;
      break;
    case 'reorderTab':
      nextRoot = reorderTab(
        state.root,
        transform.stackId,
        transform.panelId,
        transform.index
      );
      break;
    case 'setActive':
      nextRoot = setActive(state.root, transform.stackId, transform.panelId);
      break;
    case 'setSizes':
      nextRoot = setSizes(state.root, transform.containerId, transform.sizes);
      break;
    case 'updatePanelState':
      nextRoot = updatePanelState(
        state.root,
        transform.panelId,
        transform.state
      );
      nextPopouts = updatePanelStateInPopouts(
        state.popouts,
        transform.panelId,
        transform.state
      );
      break;
    case 'popoutPanel': {
      const popped = popoutPanel(state, transform.panelId, transform.geometry);
      return {
        root: normalize(popped.root),
        popouts: popped.popouts,
        maximizedId: popped.maximizedId,
      };
    }
    case 'closePopoutPanel':
      return closePopoutPanel(state, transform.panelId);
    case 'updatePopoutGeometry':
      return updatePopoutGeometry(state, transform.panelId, transform.geometry);
    case 'popoutScope':
      return applyToPopout(state, transform.popoutId, transform.inner);
    default: {
      const exhaustive: never = transform;
      return exhaustive;
    }
  }
  return {
    root: normalize(nextRoot),
    popouts: nextPopouts,
    maximizedId: nextMaximized,
  };
}

/**
 * Apply a single transform to either a tree (legacy form) or a resolved state.
 * The two overloads keep the original tree-only API stable for callers that
 * don't care about popouts, while letting popout-aware code thread the full
 * `{ root, popouts }` shape through.
 */
export function applyTransform(
  root: LayoutNode,
  transform: Transform
): LayoutNode;
export function applyTransform(
  state: ResolvedState,
  transform: Transform
): ResolvedState;
export function applyTransform(
  arg: LayoutNode | ResolvedState,
  transform: Transform
): LayoutNode | ResolvedState {
  if (isResolvedState(arg)) {
    return applyTransformInternal(arg, transform);
  }
  const result = applyTransformInternal(
    { root: arg, popouts: {}, maximizedId: null },
    transform
  );
  return result.root;
}

export function applyTransforms(
  initial: LayoutNode,
  transforms: Transform[]
): LayoutNode;
export function applyTransforms(
  initial: LayoutNode,
  transforms: Transform[],
  initialPopouts: Record<NodeId, PopoutEntry>,
  initialMaximizedId?: NodeId | null
): ResolvedState;
export function applyTransforms(
  initial: LayoutNode,
  transforms: Transform[],
  initialPopouts?: Record<NodeId, PopoutEntry>,
  initialMaximizedId?: NodeId | null
): LayoutNode | ResolvedState {
  const seed: ResolvedState = {
    root: normalize(initial),
    popouts: initialPopouts ?? {},
    maximizedId: initialMaximizedId ?? null,
  };
  const resolved = transforms.reduce(applyTransformInternal, seed);
  return initialPopouts === undefined ? resolved.root : resolved;
}
