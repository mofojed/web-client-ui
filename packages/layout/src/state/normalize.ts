import { nanoid } from 'nanoid';
import type { LayoutNode, PanelNode, StackNode } from '../types';
import { isContainer, isPanel } from './treeUtils';

/**
 * Internal canonical form for the layout tree:
 *   - panels appear only as direct children of stacks (a loose panel root or
 *     panel child of a row/column is auto-wrapped)
 *   - stacks have at least one panel
 *   - rows/columns have at least one child
 *   - a row never directly contains an unsized row (flatten)
 *   - a column never directly contains an unsized column (flatten)
 *   - a row/column with a single child is collapsed to that child
 *   - a stack's `activeId` always references one of its panels
 *
 * `normalize()` is idempotent. Called by `hydrate()` and after every transform
 * so the rest of the reducer logic can assume canonical input.
 */
export function normalize(root: LayoutNode): LayoutNode {
  const walked = walk(root);
  if (walked == null) return root;
  if (isPanel(walked)) return wrapPanelInStack(walked);
  return walked;
}

function walk(node: LayoutNode): LayoutNode | null {
  if (isPanel(node)) return node;
  if (!isContainer(node)) return node;

  const recursed = node.children.reduce<LayoutNode[]>((acc, child) => {
    const next = walk(child);
    if (next != null) acc.push(next);
    return acc;
  }, []);

  if (node.type === 'stack') {
    const panels = recursed.filter(isPanel) as PanelNode[];
    if (panels.length === 0) return null;
    const activeId =
      node.activeId !== undefined && panels.some(p => p.id === node.activeId)
        ? node.activeId
        : panels[0].id;
    return { ...node, children: panels, activeId };
  }

  // row/column: wrap loose panel children in stacks, then flatten same-axis
  // unsized children up into us
  const flattened = recursed.flatMap<LayoutNode>(child => {
    if (isPanel(child)) return [wrapPanelInStack(child)];
    if (
      isContainer(child) &&
      child.type === node.type &&
      child.size === undefined
    ) {
      return child.children;
    }
    return [child];
  });

  if (flattened.length === 0) return null;
  if (flattened.length === 1) {
    const only = flattened[0];
    if (node.size !== undefined && only.size === undefined) {
      return { ...only, size: node.size };
    }
    return only;
  }
  return { ...node, children: flattened as never };
}

export function wrapPanelInStack(panel: PanelNode): StackNode {
  return {
    type: 'stack',
    id: `stack-${panel.id}`,
    children: [panel],
    activeId: panel.id,
    size: panel.size,
  };
}

/**
 * Generate a fresh id. Useful when transforms create new container nodes.
 */
export function makeId(prefix = 'n'): string {
  return `${prefix}-${nanoid(8)}`;
}
