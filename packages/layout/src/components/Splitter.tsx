import type { PointerEvent as ReactPointerEvent } from 'react';
import { useCallback, useRef } from 'react';
import type { ContainerNode, NodeId } from '../types';
import { useLayoutContext } from './LayoutContext';
import { computeSplitterSizes, type SplitterDragState } from './splitterMath';

const DEFAULT_MIN_SIZE = 40;

export interface SplitterProps {
  parent: ContainerNode;
  prevId: NodeId;
  nextId: NodeId;
  axis: 'row' | 'column';
}

function readChildSizes(
  parentEl: HTMLElement,
  axis: 'row' | 'column'
): {
  parentSize: number;
  fractions: Record<NodeId, number>;
  pixels: Record<NodeId, number>;
} {
  const parentRect = parentEl.getBoundingClientRect();
  const parentSize = axis === 'row' ? parentRect.width : parentRect.height;
  const fractions: Record<NodeId, number> = {};
  const pixels: Record<NodeId, number> = {};

  Array.from(parentEl.children).forEach(child => {
    const el = child as HTMLElement;
    if (el.dataset.layoutSplitter !== undefined) return;
    const id = el.dataset.rowId ?? el.dataset.columnId ?? el.dataset.stackId;
    if (id == null) return;
    const rect = el.getBoundingClientRect();
    const size = axis === 'row' ? rect.width : rect.height;
    pixels[id] = size;
    fractions[id] = parentSize > 0 ? size / parentSize : 0;
  });

  return { parentSize, fractions, pixels };
}

export default function Splitter({
  parent,
  prevId,
  nextId,
  axis,
}: SplitterProps): JSX.Element {
  const { dispatch } = useLayoutContext();
  const dragRef = useRef<SplitterDragState | null>(null);

  const handlePointerDown = useCallback(
    (e: ReactPointerEvent<HTMLDivElement>) => {
      const target = e.currentTarget;
      const parentEl = target.parentElement;
      if (parentEl == null) return;
      const { parentSize, fractions, pixels } = readChildSizes(parentEl, axis);
      const prevNode = parent.children.find(c => c.id === prevId);
      const nextNode = parent.children.find(c => c.id === nextId);
      dragRef.current = {
        startCoord: axis === 'row' ? e.clientX : e.clientY,
        parentSize,
        prevPixel: pixels[prevId] ?? 0,
        nextPixel: pixels[nextId] ?? 0,
        initialFractions: fractions,
        prevId,
        nextId,
        prevMinSize: prevNode?.minSize ?? DEFAULT_MIN_SIZE,
        nextMinSize: nextNode?.minSize ?? DEFAULT_MIN_SIZE,
      };
      if (typeof target.setPointerCapture === 'function') {
        target.setPointerCapture(e.pointerId);
      }
      e.preventDefault();
    },
    [axis, parent.children, prevId, nextId]
  );

  const handlePointerMove = useCallback(
    (e: ReactPointerEvent<HTMLDivElement>) => {
      const drag = dragRef.current;
      if (drag == null) return;
      const coord = axis === 'row' ? e.clientX : e.clientY;
      const { fractions } = computeSplitterSizes(drag, coord);
      dispatch({
        kind: 'setSizes',
        containerId: parent.id,
        sizes: fractions,
      });
    },
    [axis, dispatch, parent.id]
  );

  const handlePointerUp = useCallback(
    (e: ReactPointerEvent<HTMLDivElement>) => {
      dragRef.current = null;
      const target = e.currentTarget;
      if (typeof target.releasePointerCapture === 'function') {
        try {
          target.releasePointerCapture(e.pointerId);
        } catch {
          /* ignore */
        }
      }
    },
    []
  );

  return (
    <div
      className={`dh-layout-splitter dh-layout-splitter-${axis}`}
      data-layout-splitter=""
      role="separator"
      aria-orientation={axis === 'row' ? 'vertical' : 'horizontal'}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerCancel={handlePointerUp}
    />
  );
}
