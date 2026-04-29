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

function PanelInner({ panel, isActive }: PanelProps): JSX.Element | null {
  const { components, editMode, dispatch, focusedPanelId } = useLayoutContext();
  const definition = components[panel.component];
  const isFocused = focusedPanelId === panel.id;

  const setState = useCallback(
    (state: unknown) => {
      dispatch({ kind: 'updatePanelState', panelId: panel.id, state });
    },
    [dispatch, panel.id]
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

  const Content = definition.component;
  return (
    <div
      className={panelContentClass(isActive, isFocused)}
      data-panel-id={panel.id}
    >
      <Content
        panel={panel}
        isActive={isActive}
        editMode={editMode}
        setState={setState}
      />
    </div>
  );
}

const Panel = memo(PanelInner);
Panel.displayName = 'LayoutPanel';
export default Panel;
