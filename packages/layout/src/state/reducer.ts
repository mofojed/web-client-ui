import type {
  ContainerNode,
  DropTarget,
  LayoutNode,
  NodeId,
  PanelNode,
  StackNode,
  Transform,
} from '../types';
import {
  findNode,
  findParent,
  isContainer,
  isPanel,
  isStack,
  removeNode,
  replaceNode,
} from './treeUtils';
import { normalize } from './normalize';

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

export function applyTransform(
  root: LayoutNode,
  transform: Transform
): LayoutNode {
  let next: LayoutNode;
  switch (transform.kind) {
    case 'movePanel':
      next = movePanel(root, transform.panelId, transform.target);
      break;
    case 'addPanel':
      next = insertAtTarget(root, transform.panel, transform.target);
      break;
    case 'closePanel':
      next = closePanel(root, transform.panelId);
      break;
    case 'reorderTab':
      next = reorderTab(
        root,
        transform.stackId,
        transform.panelId,
        transform.index
      );
      break;
    case 'setActive':
      next = setActive(root, transform.stackId, transform.panelId);
      break;
    case 'setSizes':
      next = setSizes(root, transform.containerId, transform.sizes);
      break;
    case 'updatePanelState':
      next = updatePanelState(root, transform.panelId, transform.state);
      break;
    default: {
      const exhaustive: never = transform;
      return exhaustive;
    }
  }
  return normalize(next);
}

export function applyTransforms(
  initial: LayoutNode,
  transforms: Transform[]
): LayoutNode {
  return transforms.reduce(applyTransform, normalize(initial));
}
