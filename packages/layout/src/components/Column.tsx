import type { ReactNode } from 'react';
import type { ColumnNode, LayoutNode } from '../types';
import RenderNode from './RenderNode';
import Splitter from './Splitter';

const SPLITTER_TRACK = '4px';

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
      style={{ gridTemplateRows: gridTracks(node.children) }}
    >
      {items}
    </div>
  );
}

function gridTracks(children: LayoutNode[]): string {
  const parts: string[] = [];
  children.forEach((c, i) => {
    if (i > 0) parts.push(SPLITTER_TRACK);
    parts.push(`${c.size ?? 1}fr`);
  });
  return parts.join(' ');
}
