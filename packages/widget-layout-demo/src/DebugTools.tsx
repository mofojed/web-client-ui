export interface DebugToolsProps {
  editMode: boolean;
  onToggleEditMode: () => void;
  transformsCount: number;
  onCompact: () => void;
  onReset: () => void;
}

/**
 * Sidebar panel content exposing the layout debug controls: toggling edit
 * mode, compacting the layout, and resetting persisted state.
 */
export function DebugTools({
  editMode,
  onToggleEditMode,
  transformsCount,
  onCompact,
  onReset,
}: DebugToolsProps): JSX.Element {
  return (
    <div className="debug-tools">
      <div className="debug-tools-header">Debug tools</div>
      <button
        type="button"
        className={editMode ? 'is-active' : undefined}
        onClick={onToggleEditMode}
      >
        {editMode ? 'edit mode: on' : 'edit mode: off'}
      </button>
      <button
        type="button"
        onClick={onCompact}
        disabled={transformsCount === 0}
      >
        compact ({transformsCount})
      </button>
      <button type="button" onClick={onReset}>
        reset
      </button>
    </div>
  );
}

export default DebugTools;
