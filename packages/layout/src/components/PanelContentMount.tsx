import { useCallback, useMemo } from 'react';
import { createPortal } from 'react-dom';
import type { PanelNode } from '../types';
import { useLayoutContext } from './LayoutContext';
import { PanelBranchContext, type PanelBranch } from './MaximizeContext';

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
  const { components, editMode, dispatch, maximizedId, branchActive, depth } =
    useLayoutContext();
  const definition = components[panel.component];

  const setState = useCallback(
    (state: unknown) => {
      dispatch({ kind: 'updatePanelState', panelId: panel.id, state });
    },
    [dispatch, panel.id]
  );

  // A dashboard rendered inside this panel's content is on the active
  // maximized branch only when this panel is the maximized one of an
  // already-active dashboard.
  const childBranch = useMemo<PanelBranch>(
    () => ({
      activeBranch: branchActive && panel.id === maximizedId,
      depth: depth + 1,
    }),
    [branchActive, panel.id, maximizedId, depth]
  );

  if (definition == null) return null;

  const Content = definition.component;
  return createPortal(
    <PanelBranchContext.Provider value={childBranch}>
      <Content
        panel={panel}
        isActive={isActive}
        editMode={editMode}
        setState={setState}
      />
    </PanelBranchContext.Provider>,
    host
  );
}
