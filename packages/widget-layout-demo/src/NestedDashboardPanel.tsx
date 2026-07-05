import { useMemo } from 'react';
import {
  Dashboard,
  createLayoutState,
  resolveLayout,
  usePersistedLayoutState,
  type PanelContentProps,
} from '@deephaven/layout';
import COMPONENTS from './panels';

const EMPTY_LAYOUT = {
  type: 'stack' as const,
  id: 'root',
  children: [],
};

/**
 * A panel whose content is itself a nested `@deephaven/layout` Dashboard.
 *
 * Nested dashboards use the same panel registry as the top level, so they can
 * hold widgets *and* further nested dashboards — which is what lets the
 * maximize/zoom breadcrumb recurse (Home > Dashboard 1 > Child Dashboard A).
 *
 * Each nested dashboard persists its own layout under a key derived from the
 * host panel id, independent of the outer dashboard's state.
 */
export function NestedDashboardPanel({
  panel,
  editMode,
}: PanelContentProps): JSX.Element {
  const initial = useMemo(() => createLayoutState(EMPTY_LAYOUT), []);
  const { state, setState } = usePersistedLayoutState(initial, {
    key: `deephaven.widget-layout-demo.nested.${panel.id}`,
  });

  const showHint = useMemo(() => {
    const { root } = resolveLayout(state);
    return root != null && root.type === 'stack' && root.children.length === 0;
  }, [state]);

  return (
    <div className="nested-dashboard">
      {showHint && (
        <div className="nested-dashboard-hint">
          <p>Empty dashboard.</p>
          <p>
            Double-click this dashboard&apos;s tab to maximize it, then add
            widgets or another dashboard from the sidebar.
          </p>
        </div>
      )}
      <Dashboard
        layout={state}
        components={COMPONENTS}
        onChange={next => setState(next)}
        editMode={editMode}
        layoutKey={null}
      />
    </div>
  );
}

export default NestedDashboardPanel;
