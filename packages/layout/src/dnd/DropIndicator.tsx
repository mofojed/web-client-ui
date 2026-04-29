import type { CSSProperties } from 'react';
import { dropIndicatorRect, type DropZone } from './dropZone';

export interface DropIndicatorProps {
  zone: DropZone;
}

export default function DropIndicator({
  zone,
}: DropIndicatorProps): JSX.Element {
  const rect = dropIndicatorRect(zone);
  const style: CSSProperties = {
    position: 'absolute',
    top: rect.top,
    left: rect.left,
    right: rect.right,
    bottom: rect.bottom,
    pointerEvents: 'none',
  };
  return (
    <div
      className={`dh-layout-drop-indicator dh-layout-drop-indicator-${zone}`}
      style={style}
      data-drop-zone={zone}
    />
  );
}
