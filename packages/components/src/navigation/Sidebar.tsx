import {
  type CSSProperties,
  type PointerEvent as ReactPointerEvent,
  useCallback,
  useEffect,
  useRef,
  useState,
} from 'react';
import classNames from 'classnames';
import { type IconDefinition } from '@deephaven/icons';
import Button from '../Button';
import './Sidebar.scss';

const DEFAULT_PANEL_WIDTH = 280;
const DEFAULT_MIN_PANEL_WIDTH = 150;
const DEFAULT_MAX_PANEL_WIDTH = 600;

function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

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

  /**
   * Initial width of the content panel in pixels. The panel can be resized by
   * dragging its trailing edge. Defaults to 280.
   */
  defaultWidth?: number;

  /** Minimum width the content panel can be resized to. Defaults to 150. */
  minWidth?: number;

  /** Maximum width the content panel can be resized to. Defaults to 600. */
  maxWidth?: number;

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
  defaultWidth = DEFAULT_PANEL_WIDTH,
  minWidth = DEFAULT_MIN_PANEL_WIDTH,
  maxWidth = DEFAULT_MAX_PANEL_WIDTH,
  className,
  'data-testid': dataTestId,
}: SidebarProps): JSX.Element {
  const railRef = useRef<HTMLDivElement>(null);

  // Committed width of the content panel. Only updated when a resize drag is
  // released, so the panel doesn't reflow while dragging.
  const [panelWidth, setPanelWidth] = useState(() =>
    clamp(defaultWidth, minWidth, maxWidth)
  );

  // Active resize drag state, or null when idle.
  const dragRef = useRef<{
    startX: number;
    startWidth: number;
    pointerId: number;
  } | null>(null);
  const resizerRef = useRef<HTMLDivElement>(null);
  // Pixel offset of the preview line from the panel's at-rest edge. null while
  // no resize is in progress; the line renders as soon as a drag starts.
  const [previewOffset, setPreviewOffset] = useState<number | null>(null);

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

  const releaseCapture = useCallback((pointerId: number | undefined): void => {
    const target = resizerRef.current;
    if (target == null || pointerId == null) return;
    if (typeof target.releasePointerCapture !== 'function') return;
    try {
      target.releasePointerCapture(pointerId);
    } catch {
      /* ignore — pointer may already be released */
    }
  }, []);

  const cancelResize = useCallback((): void => {
    const drag = dragRef.current;
    dragRef.current = null;
    setPreviewOffset(null);
    if (drag != null) releaseCapture(drag.pointerId);
  }, [releaseCapture]);

  const handleResizePointerDown = useCallback(
    (e: ReactPointerEvent<HTMLDivElement>) => {
      dragRef.current = {
        startX: e.clientX,
        startWidth: panelWidth,
        pointerId: e.pointerId,
      };
      setPreviewOffset(0);
      const target = e.currentTarget;
      if (typeof target.setPointerCapture === 'function') {
        target.setPointerCapture(e.pointerId);
      }
      e.preventDefault();
    },
    [panelWidth]
  );

  const handleResizePointerMove = useCallback(
    (e: ReactPointerEvent<HTMLDivElement>) => {
      const drag = dragRef.current;
      if (drag == null) return;
      const nextWidth = clamp(
        drag.startWidth + (e.clientX - drag.startX),
        minWidth,
        maxWidth
      );
      setPreviewOffset(nextWidth - drag.startWidth);
    },
    [minWidth, maxWidth]
  );

  const handleResizePointerUp = useCallback(
    (e: ReactPointerEvent<HTMLDivElement>) => {
      const drag = dragRef.current;
      if (drag != null) {
        const nextWidth = clamp(
          drag.startWidth + (e.clientX - drag.startX),
          minWidth,
          maxWidth
        );
        setPanelWidth(nextWidth);
      }
      cancelResize();
    },
    [minWidth, maxWidth, cancelResize]
  );

  // Esc cancels the resize without committing. The keydown listener is only
  // armed while a drag is active so idle sidebars don't observe unrelated Esc
  // presses.
  useEffect(() => {
    if (previewOffset == null) return undefined;
    const handler = (e: KeyboardEvent): void => {
      if (e.key === 'Escape') {
        e.preventDefault();
        cancelResize();
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [previewOffset, cancelResize]);

  const previewStyle: CSSProperties | undefined =
    previewOffset == null
      ? undefined
      : { transform: `translateX(${previewOffset}px)` };

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
        <div
          className="dh-sidebar-panel"
          role="tabpanel"
          style={{ width: panelWidth }}
        >
          <div className="dh-sidebar-panel-content">
            {renderContent(selectedKey)}
          </div>
          <div
            ref={resizerRef}
            className="dh-sidebar-resizer"
            role="separator"
            aria-orientation="vertical"
            onPointerDown={handleResizePointerDown}
            onPointerMove={handleResizePointerMove}
            onPointerUp={handleResizePointerUp}
            onPointerCancel={cancelResize}
          >
            {previewOffset != null && (
              <div
                className="dh-sidebar-resizer-preview"
                style={previewStyle}
              />
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export default Sidebar;
