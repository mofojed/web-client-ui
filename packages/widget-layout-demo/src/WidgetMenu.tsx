import { useEffect, useMemo, useRef, useState } from 'react';
import type { dh } from '@deephaven/jsapi-types';

export interface WidgetMenuProps {
  widgets: dh.ide.VariableDefinition[];
  onSelect: (widget: dh.ide.VariableDefinition) => void;
}

export function WidgetMenu({
  widgets,
  onSelect,
}: WidgetMenuProps): JSX.Element {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');
  const containerRef = useRef<HTMLDivElement | null>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    if (!open) return undefined;
    inputRef.current?.focus();

    function handleDocumentClick(e: MouseEvent): void {
      if (
        containerRef.current != null &&
        !containerRef.current.contains(e.target as Node)
      ) {
        setOpen(false);
      }
    }
    document.addEventListener('mousedown', handleDocumentClick);
    return () => document.removeEventListener('mousedown', handleDocumentClick);
  }, [open]);

  const filtered = useMemo(() => {
    const lower = search.toLowerCase();
    return widgets
      .filter(w => (w.name ?? '').toLowerCase().includes(lower))
      .sort((a, b) => (a.name ?? '').localeCompare(b.name ?? ''));
  }, [widgets, search]);

  return (
    <div className="widget-menu" ref={containerRef}>
      <button
        type="button"
        className={open ? 'is-active' : undefined}
        onClick={() => setOpen(v => !v)}
      >
        Widgets ({widgets.length})
      </button>
      {open && (
        <div className="widget-menu-popover">
          <input
            ref={inputRef}
            type="text"
            className="widget-menu-search"
            placeholder="Search widgets…"
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
          {filtered.length === 0 ? (
            <div className="widget-menu-empty">
              {widgets.length === 0
                ? 'No widgets on the server yet.'
                : 'No matches.'}
            </div>
          ) : (
            <ul className="widget-menu-list">
              {filtered.map(w => (
                <li key={`${w.type}-${w.name}`}>
                  <button
                    type="button"
                    className="widget-menu-item"
                    onClick={() => {
                      onSelect(w);
                      setOpen(false);
                      setSearch('');
                    }}
                  >
                    <span className="widget-menu-name">{w.name}</span>
                    <span className="widget-menu-type">{w.type}</span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}

export default WidgetMenu;
