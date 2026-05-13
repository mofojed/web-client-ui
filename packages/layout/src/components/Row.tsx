import type { ReactNode } from 'react';
import type { LayoutNode, RowNode } from '../types';
import RenderNode from './RenderNode';
import Splitter from './Splitter';

const SPLITTER_TRACK = '4px';

export interface RowProps {
  node: RowNode;
}

export default function Row({ node }: RowProps): JSX.Element {
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
          axis="row"
        />
      );
    }
    items.push(<RenderNode key={child.id} node={child} />);
  });

  return (
    <div
      className="dh-layout-row"
      data-row-id={node.id}
      style={{ gridTemplateColumns: gridTracks(node.children) }}
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
