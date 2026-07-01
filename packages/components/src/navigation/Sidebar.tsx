import { useCallback, useRef } from 'react';
import classNames from 'classnames';
import { type IconDefinition } from '@deephaven/icons';
import Button from '../Button';
import './Sidebar.scss';

export interface SidebarItem {
  /** Unique key identifying the item. */
  key: string;

  /** Icon shown in the rail for this item. */
  icon: IconDefinition | JSX.Element;

  /**
   * Human readable title. Used as the button tooltip and accessible label.
   */
  title: string;
}

export interface SidebarProps {
  /** Items to display in the icon rail, top to bottom. */
  items: SidebarItem[];

  /**
   * Key of the currently selected item, or `null` when the content panel is
   * collapsed.
   */
  selectedKey: string | null;

  /**
   * Called when the selection changes. Selecting the currently selected item
   * toggles the panel closed and reports `null`.
   *
   * @param key The newly selected key, or `null` when collapsed
   */
  onSelect: (key: string | null) => void;

  /**
   * Render the content panel for the selected item. Only called while an item
   * is selected (i.e. the panel is expanded).
   *
   * @param selectedKey The key of the selected item
   */
  renderContent: (selectedKey: string) => React.ReactNode;

  className?: string;

  'data-testid'?: string;
}

/**
 * A VSCode-style sidebar with an icon rail and a collapsible content panel.
 *
 * Icons are stacked vertically in the rail. Selecting an item expands the
 * panel and renders its content; selecting the active item again collapses
 * the panel.
 */
export function Sidebar({
  items,
  selectedKey,
  onSelect,
  renderContent,
  className,
  'data-testid': dataTestId,
}: SidebarProps): JSX.Element {
  const railRef = useRef<HTMLDivElement>(null);

  const handleSelect = useCallback(
    (key: string) => {
      onSelect(key === selectedKey ? null : key);
    },
    [onSelect, selectedKey]
  );

  const handleKeyDown = useCallback(
    (event: React.KeyboardEvent<HTMLButtonElement>) => {
      if (event.key !== 'ArrowDown' && event.key !== 'ArrowUp') {
        return;
      }
      const buttons =
        railRef.current?.querySelectorAll<HTMLButtonElement>('[role="tab"]');
      if (buttons == null || buttons.length === 0) {
        return;
      }
      const currentIndex = Array.prototype.indexOf.call(
        buttons,
        document.activeElement
      );
      const delta = event.key === 'ArrowDown' ? 1 : -1;
      const nextIndex =
        (currentIndex + delta + buttons.length) % buttons.length;
      buttons[nextIndex].focus();
      event.preventDefault();
    },
    []
  );

  return (
    <div
      className={classNames('dh-sidebar', className)}
      data-testid={dataTestId}
    >
      <div
        className="dh-sidebar-rail"
        role="tablist"
        aria-orientation="vertical"
        ref={railRef}
      >
        {items.map(item => {
          const isSelected = item.key === selectedKey;
          return (
            <Button
              key={item.key}
              kind="ghost"
              className={classNames('dh-sidebar-rail-item', {
                'is-active': isSelected,
              })}
              icon={item.icon}
              tooltip={item.title}
              active={isSelected}
              role="tab"
              aria-selected={isSelected}
              tabIndex={isSelected ? 0 : -1}
              onClick={() => handleSelect(item.key)}
              onKeyDown={handleKeyDown}
            />
          );
        })}
      </div>
      {selectedKey != null && (
        <div className="dh-sidebar-panel" role="tabpanel">
          {renderContent(selectedKey)}
        </div>
      )}
    </div>
  );
}

export default Sidebar;
