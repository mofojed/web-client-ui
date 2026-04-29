import type {
  ContainerNode,
  LayoutNode,
  NodeId,
  PanelNode,
  StackNode,
} from '../types';

export function isContainer(node: LayoutNode): node is ContainerNode {
  return node.type === 'row' || node.type === 'column' || node.type === 'stack';
}

export function isStack(node: LayoutNode): node is StackNode {
  return node.type === 'stack';
}

export function isPanel(node: LayoutNode): node is PanelNode {
  return node.type === 'panel';
}

export function findNode(root: LayoutNode, id: NodeId): LayoutNode | undefined {
  if (root.id === id) return root;
  if (!isContainer(root)) return undefined;
  for (let i = 0; i < root.children.length; i += 1) {
    const found = findNode(root.children[i], id);
    if (found) return found;
  }
  return undefined;
}

export interface ParentInfo {
  parent: ContainerNode;
  index: number;
}

/**
 * Returns the parent container of `id` and the index within its `children`.
 * Returns undefined if `id` is the root or not found.
 */
export function findParent(
  root: LayoutNode,
  id: NodeId
): ParentInfo | undefined {
  if (!isContainer(root)) return undefined;
  for (let i = 0; i < root.children.length; i += 1) {
    if (root.children[i].id === id) {
      return { parent: root, index: i };
    }
    const nested = findParent(root.children[i], id);
    if (nested) return nested;
  }
  return undefined;
}

/**
 * Replace the node with `id` using a producer. Returns a new tree.
 * If the node is not found, returns the input root unchanged.
 */
export function replaceNode(
  root: LayoutNode,
  id: NodeId,
  produce: (node: LayoutNode) => LayoutNode
): LayoutNode {
  if (root.id === id) return produce(root);
  if (!isContainer(root)) return root;
  let changed = false;
  const nextChildren = root.children.map(child => {
    const replaced = replaceNode(child, id, produce);
    if (replaced !== child) changed = true;
    return replaced;
  });
  if (!changed) return root;
  if (root.type === 'stack') {
    return { ...root, children: nextChildren.filter(isPanel) };
  }
  return { ...root, children: nextChildren };
}

/**
 * Remove a node by id. Returns the new tree (or the same tree if not found).
 * Collapses empty stacks and single-child rows/columns to keep the tree clean.
 *
 * If the root itself is removed, returns null.
 */
export function removeNode(root: LayoutNode, id: NodeId): LayoutNode | null {
  if (root.id === id) return null;
  if (!isContainer(root)) return root;
  let changed = false;
  const filtered = root.children.reduce<LayoutNode[]>((acc, child) => {
    const next = removeNode(child, id);
    if (next === null) {
      changed = true;
      return acc;
    }
    if (next !== child) changed = true;
    acc.push(next);
    return acc;
  }, []);
  if (!changed) return root;
  return collapseContainer({ ...root, children: filtered as never });
}

/**
 * If a row/column has 0 children, drop it (returns null).
 * If it has 1 child, return that child directly (preserving the parent's size).
 * If a stack has 0 children, drop it (returns null).
 * Otherwise return as-is.
 */
export function collapseContainer(node: ContainerNode): LayoutNode | null {
  if (node.children.length === 0) return null;
  if (node.type === 'stack') {
    if (
      node.activeId !== undefined &&
      !node.children.some(c => c.id === node.activeId)
    ) {
      return { ...node, activeId: node.children[0].id };
    }
    return node;
  }
  if (node.children.length === 1) {
    const only = node.children[0];
    if (node.size !== undefined && only.size === undefined) {
      return { ...only, size: node.size };
    }
    return only;
  }
  return node;
}

/**
 * Insert `child` into `parent.children` at `index`. Out-of-range indices clamp.
 */
export function insertChild<T extends ContainerNode>(
  parent: T,
  child: T extends StackNode ? PanelNode : LayoutNode,
  index: number
): T {
  const i = Math.max(0, Math.min(index, parent.children.length));
  const before = parent.children.slice(0, i);
  const after = parent.children.slice(i);
  return {
    ...parent,
    children: [...before, child, ...after] as never,
  };
}

/**
 * Collect all panels in the tree, depth-first.
 */
export function iterPanels(root: LayoutNode): PanelNode[] {
  if (isPanel(root)) return [root];
  if (!isContainer(root)) return [];
  return root.children.flatMap(iterPanels);
}
