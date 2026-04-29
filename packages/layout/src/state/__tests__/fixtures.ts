import type {
  ColumnNode,
  LayoutNode,
  PanelNode,
  RowNode,
  StackNode,
} from '../../types';

export function panel(id: string, extras: Partial<PanelNode> = {}): PanelNode {
  return {
    type: 'panel',
    id,
    component: 'demo',
    ...extras,
  };
}

export function stack(
  id: string,
  children: PanelNode[],
  extras: Partial<StackNode> = {}
): StackNode {
  return {
    type: 'stack',
    id,
    children,
    activeId: children[0]?.id,
    ...extras,
  };
}

export function row(
  id: string,
  children: LayoutNode[],
  extras: Partial<RowNode> = {}
): RowNode {
  return {
    type: 'row',
    id,
    children,
    ...extras,
  };
}

export function column(
  id: string,
  children: LayoutNode[],
  extras: Partial<ColumnNode> = {}
): ColumnNode {
  return {
    type: 'column',
    id,
    children,
    ...extras,
  };
}
