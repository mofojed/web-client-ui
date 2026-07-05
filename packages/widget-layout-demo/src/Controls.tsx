import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { vsAdd } from '@deephaven/icons';

export interface ControlsProps {
  /** Add a new empty nested dashboard to the currently maximized dashboard. */
  onNewDashboard: () => void;
}

/**
 * Sidebar panel content for layout controls. "New Dashboard" adds an empty
 * nested dashboard to whichever dashboard is currently maximized (or the top
 * level when nothing is maximized). Maximize into it (double-click its tab) to
 * fill the layout, then add widgets or further dashboards inside it.
 */
export function Controls({ onNewDashboard }: ControlsProps): JSX.Element {
  return (
    <div className="controls-tools">
      <div className="controls-tools-header">Controls</div>
      <button type="button" onClick={onNewDashboard}>
        <FontAwesomeIcon icon={vsAdd} />
        New Dashboard
      </button>
      <p className="controls-tools-hint">
        Double-click a panel tab to maximize it. If the panel is a nested
        dashboard, maximize a tab inside it too — the breadcrumb across the top
        tracks the path.
      </p>
    </div>
  );
}

export default Controls;
