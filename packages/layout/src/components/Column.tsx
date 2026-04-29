import type { CSSProperties, ReactNode } from 'react';
import type { ColumnNode } from '../types';
import RenderNode from './RenderNode';
import Splitter from './Splitter';

export interface ColumnProps {
  node: ColumnNode;
}

export default function Column({ node }: ColumnProps): JSX.Element {
  const items: ReactNode[] = [];
  node.children.forEach((child, i) => {
    if (i > 0) {
      const prev = node.children[i - 1];
      items.push(
        <Splitter
          key={`splitter-${prev.id}-${child.id}`}
          parent={node}
          prevId={prev.id}
          nextId={child.id}
          axis="column"
        />
      );
    }
    items.push(<RenderNode key={child.id} node={child} />);
  });

  return (
    <div
      className="dh-layout-column"
      data-column-id={node.id}
      style={flexStyle(node.size)}
    >
      {items}
    </div>
  );
}

function flexStyle(size: number | undefined): CSSProperties | undefined {
  if (size === undefined) return undefined;
  return { flex: `${size} 1 0` };
}
