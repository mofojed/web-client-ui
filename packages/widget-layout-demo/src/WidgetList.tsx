import { useMemo, useState } from 'react';
import type { dh } from '@deephaven/jsapi-types';

export interface WidgetListProps {
  widgets: dh.ide.VariableDefinition[];
  onSelect: (widget: dh.ide.VariableDefinition) => void;
}

/**
 * Sidebar panel content that lists the widgets available on the server with a
 * search field to filter them. Clicking a widget opens it.
 */
export function WidgetList({
  widgets,
  onSelect,
}: WidgetListProps): JSX.Element {
  const [search, setSearch] = useState('');

  const filtered = useMemo(() => {
    const lower = search.toLowerCase();
    return widgets
      .filter(w => (w.name ?? '').toLowerCase().includes(lower))
      .sort((a, b) => (a.name ?? '').localeCompare(b.name ?? ''));
  }, [widgets, search]);

  return (
    <div className="widget-list">
      <div className="widget-list-header">Widgets</div>
      <input
        type="text"
        className="widget-list-search"
        placeholder="Search widgets…"
        aria-label="Search widgets"
        value={search}
        onChange={e => setSearch(e.target.value)}
      />
      {filtered.length === 0 ? (
        <div className="widget-list-empty">
          {widgets.length === 0
            ? 'No widgets on the server yet.'
            : 'No matches.'}
        </div>
      ) : (
        <ul className="widget-list-items">
          {filtered.map(w => (
            <li key={`${w.type}-${w.name}`}>
              <button
                type="button"
                className="widget-list-item"
                onClick={() => onSelect(w)}
              >
                <span className="widget-list-name">{w.name}</span>
                <span className="widget-list-type">{w.type}</span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

export default WidgetList;
