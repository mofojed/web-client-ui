import { memo, useCallback } from 'react';
import type { PanelNode } from '../types';
import { useLayoutContext } from './LayoutContext';

export interface PanelProps {
  panel: PanelNode;
  isActive: boolean;
}

function panelContentClass(isActive: boolean, isFocused: boolean): string {
  const parts = ['dh-layout-panel-content'];
  if (!isActive) parts.push('is-hidden');
  if (isFocused) parts.push('is-focused');
  return parts.join(' ');
}

function PanelInner({ panel, isActive }: PanelProps): JSX.Element {
  const { components, getPanelHost, focusedPanelId, maximizedId } =
    useLayoutContext();
  const definition = components[panel.component];
  const isFocused = focusedPanelId === panel.id;
  const isMaximized = maximizedId === panel.id;

  const attachHost = useCallback(
    (el: HTMLDivElement | null) => {
      if (el == null) return;
      // While maximized, the panel's host lives in the dashboard's maximize
      // overlay; don't pull it back into this slot.
      if (isMaximized) return;
      const host = getPanelHost(panel.id);
      // Idempotent: appendChild on an already-attached node is a move.
      // Using parentNode check avoids a redundant DOM write when the host
      // is already in the right slot.
      if (host.parentNode !== el) {
        el.appendChild(host);
      }
    },
    [getPanelHost, panel.id, isMaximized]
  );

  if (definition == null) {
    return (
      <div
        className={panelContentClass(isActive, isFocused)}
        data-panel-id={panel.id}
      >
        <em>Unknown panel component: {panel.component}</em>
      </div>
    );
  }

  // Slot only — actual content is portaled in by PanelContentMount, which
  // lives at a stable position in the Dashboard's React tree. The persistent
  // host element appended here is what carries the panel's mounted content
  // across stack/row/column rearrangements without remounting.
  return (
    <div
      ref={attachHost}
      className={panelContentClass(isActive, isFocused)}
      data-panel-id={panel.id}
    />
  );
}

const Panel = memo(PanelInner);
Panel.displayName = 'LayoutPanel';
export default Panel;
