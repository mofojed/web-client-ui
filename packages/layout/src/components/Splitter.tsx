import type { CSSProperties, PointerEvent as ReactPointerEvent } from 'react';
import { useCallback, useEffect, useRef, useState } from 'react';
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

interface ActiveDrag {
  state: SplitterDragState;
  pointerId: number;
}

export default function Splitter({
  parent,
  prevId,
  nextId,
  axis,
}: SplitterProps): JSX.Element {
  const { dispatch } = useLayoutContext();
  const targetRef = useRef<HTMLDivElement | null>(null);
  const dragRef = useRef<ActiveDrag | null>(null);
  // Pixel offset of the preview line from the splitter's at-rest position.
  // null while no drag is active; the line renders as soon as drag starts.
  const [previewOffset, setPreviewOffset] = useState<number | null>(null);

  const releaseCapture = useCallback((pointerId: number | undefined): void => {
    const target = targetRef.current;
    if (target == null || pointerId == null) return;
    if (typeof target.releasePointerCapture !== 'function') return;
    try {
      target.releasePointerCapture(pointerId);
    } catch {
      /* ignore — pointer may already be released */
    }
  }, []);

  const cancelDrag = useCallback((): void => {
    const drag = dragRef.current;
    dragRef.current = null;
    setPreviewOffset(null);
    if (drag != null) releaseCapture(drag.pointerId);
  }, [releaseCapture]);

  const handlePointerDown = useCallback(
    (e: ReactPointerEvent<HTMLDivElement>) => {
      const target = e.currentTarget;
      const parentEl = target.parentElement;
      if (parentEl == null) return;
      const { parentSize, fractions, pixels } = readChildSizes(parentEl, axis);
      const prevNode = parent.children.find(c => c.id === prevId);
      const nextNode = parent.children.find(c => c.id === nextId);
      dragRef.current = {
        state: {
          startCoord: axis === 'row' ? e.clientX : e.clientY,
          parentSize,
          prevPixel: pixels[prevId] ?? 0,
          nextPixel: pixels[nextId] ?? 0,
          initialFractions: fractions,
          prevId,
          nextId,
          prevMinSize: prevNode?.minSize ?? DEFAULT_MIN_SIZE,
          nextMinSize: nextNode?.minSize ?? DEFAULT_MIN_SIZE,
        },
        pointerId: e.pointerId,
      };
      setPreviewOffset(0);
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
      const { prevPixel } = computeSplitterSizes(drag.state, coord);
      setPreviewOffset(prevPixel - drag.state.prevPixel);
    },
    [axis]
  );

  const handlePointerUp = useCallback(
    (e: ReactPointerEvent<HTMLDivElement>) => {
      const drag = dragRef.current;
      if (drag != null) {
        const coord = axis === 'row' ? e.clientX : e.clientY;
        const { fractions } = computeSplitterSizes(drag.state, coord);
        dispatch({
          kind: 'setSizes',
          containerId: parent.id,
          sizes: fractions,
        });
      }
      cancelDrag();
    },
    [axis, dispatch, parent.id, cancelDrag]
  );

  // Esc cancels the drag without committing. The keydown listener is only
  // armed while a drag is active; otherwise idle splitters wouldn't observe
  // unrelated Esc presses.
  useEffect(() => {
    if (previewOffset == null) return undefined;
    const handler = (e: KeyboardEvent): void => {
      if (e.key === 'Escape') {
        e.preventDefault();
        cancelDrag();
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [previewOffset, cancelDrag]);

  const previewStyle: CSSProperties | undefined =
    previewOffset == null
      ? undefined
      : {
          transform:
            axis === 'row'
              ? `translateX(${previewOffset}px)`
              : `translateY(${previewOffset}px)`,
        };

  return (
    <div
      ref={targetRef}
      className={`dh-layout-splitter dh-layout-splitter-${axis}`}
      data-layout-splitter=""
      role="separator"
      aria-orientation={axis === 'row' ? 'vertical' : 'horizontal'}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerCancel={cancelDrag}
    >
      {previewOffset != null && (
        <div className="dh-layout-splitter-preview" style={previewStyle} />
      )}
    </div>
  );
}
