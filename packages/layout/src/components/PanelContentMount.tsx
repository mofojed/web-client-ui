import { useCallback } from 'react';
import { createPortal } from 'react-dom';
import type { PanelNode } from '../types';
import { useLayoutContext } from './LayoutContext';

export interface PanelContentMountProps {
  panel: PanelNode;
  isActive: boolean;
  /**
   * The persistent DOM node that holds the panel's content. Stable across
   * rearrangements (the same element is moved, never recreated), which is
   * what keeps the portaled React subtree from unmounting when its slot
   * moves between stacks/rows/columns.
   */
  host: HTMLDivElement;
}

/**
 * Renders a panel's content into its persistent host via a portal. Mounted
 * once per panel from a stable position in the Dashboard's React tree, so
 * cross-parent moves don't tear the content down and back up.
 */
export default function PanelContentMount({
  panel,
  isActive,
  host,
}: PanelContentMountProps): JSX.Element | null {
  const { components, editMode, dispatch } = useLayoutContext();
  const definition = components[panel.component];

  const setState = useCallback(
    (state: unknown) => {
      dispatch({ kind: 'updatePanelState', panelId: panel.id, state });
    },
    [dispatch, panel.id]
  );

  if (definition == null) return null;

  const Content = definition.component;
  return createPortal(
    <Content
      panel={panel}
      isActive={isActive}
      editMode={editMode}
      setState={setState}
    />,
    host
  );
}
