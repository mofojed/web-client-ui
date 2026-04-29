import { memo, useCallback } from 'react';
import type { PanelNode } from '../types';
import { useLayoutContext } from './LayoutContext';

export interface PanelProps {
  panel: PanelNode;
  isActive: boolean;
}

function PanelInner({ panel, isActive }: PanelProps): JSX.Element | null {
  const { components, editMode, dispatch } = useLayoutContext();
  const definition = components[panel.component];

  const setState = useCallback(
    (state: unknown) => {
      dispatch({ kind: 'updatePanelState', panelId: panel.id, state });
    },
    [dispatch, panel.id]
  );

  if (definition == null) {
    return (
      <div
        className={`dh-layout-panel-content${isActive ? '' : ' is-hidden'}`}
        data-panel-id={panel.id}
      >
        <em>Unknown panel component: {panel.component}</em>
      </div>
    );
  }

  const Content = definition.component;
  return (
    <div
      className={`dh-layout-panel-content${isActive ? '' : ' is-hidden'}`}
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
