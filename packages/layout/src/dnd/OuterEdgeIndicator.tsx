import type { Side } from '../types';

export interface OuterEdgeIndicatorProps {
  side: Side;
}

export default function OuterEdgeIndicator({
  side,
}: OuterEdgeIndicatorProps): JSX.Element {
  return (
    <div
      className={`dh-layout-outer-edge dh-layout-outer-edge-${side}`}
      data-outer-edge={side}
    />
  );
}
