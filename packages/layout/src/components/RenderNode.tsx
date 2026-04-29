import type { LayoutNode } from '../types';
import Column from './Column';
import Row from './Row';
import Stack from './Stack';

export interface RenderNodeProps {
  node: LayoutNode;
}

export default function RenderNode({
  node,
}: RenderNodeProps): JSX.Element | null {
  switch (node.type) {
    case 'row':
      return <Row node={node} />;
    case 'column':
      return <Column node={node} />;
    case 'stack':
      return <Stack node={node} />;
    case 'panel':
      // canonical form has panels only inside stacks; if we see one here it
      // means consumers handed us a non-canonical tree — wrap and render via
      // a synthetic stack to be defensive.
      return (
        <Stack
          node={{
            type: 'stack',
            id: `stack-${node.id}`,
            children: [node],
            activeId: node.id,
          }}
        />
      );
    default: {
      const exhaustive: never = node;
      return exhaustive;
    }
  }
}
