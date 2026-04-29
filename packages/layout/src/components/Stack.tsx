import type {
  CSSProperties,
  KeyboardEvent,
  MouseEvent,
  ReactNode,
} from 'react';
import { useCallback, useLayoutEffect, useRef, useState } from 'react';
import { useDraggable, useDroppable } from '@dnd-kit/core';
import type { PanelNode, StackNode } from '../types';
import { useLayoutContext } from './LayoutContext';
import Panel from './Panel';
import type { PanelDefinition } from './types';
import { useDragState } from '../dnd/DragContext';
import { panelDraggableId, stackDroppableId } from '../dnd/ids';
import DropIndicator from '../dnd/DropIndicator';

export interface StackProps {
  node: StackNode;
}

function defaultTabLabel(panel: PanelNode): string {
  return panel.title ?? panel.id;
}

export default function Stack({ node }: StackProps): JSX.Element {
  const { editMode, dispatch } = useLayoutContext();
  const { hover, activePanelId } = useDragState();
  const activeId = node.activeId ?? node.children[0]?.id;
  const showHeader = editMode || node.children.length > 1;

  const handleActivate = useCallback(
    (panelId: string) =>
      dispatch({ kind: 'setActive', stackId: node.id, panelId }),
    [dispatch, node.id]
  );
  const handleClose = useCallback(
    (panelId: string) => dispatch({ kind: 'closePanel', panelId }),
    [dispatch]
  );

  const { setNodeRef: setDroppableRef } = useDroppable({
    id: stackDroppableId(node.id),
    disabled: !editMode,
    data: { stackId: node.id },
  });

  // Body-zone indicator only renders when the geometric 5-zone applies — i.e.
  // hover is a stackZone for this stack and either an edge zone or a center
  // drop without a tab-strip insertion index.
  const bodyZone =
    activePanelId != null &&
    hover != null &&
    hover.kind === 'stackZone' &&
    hover.stackId === node.id &&
    hover.insertIndex === undefined
      ? hover.zone
      : null;

  return (
    <div
      ref={setDroppableRef}
      className="dh-layout-stack"
      data-stack-id={node.id}
      style={flexStyle(node.size)}
    >
      {showHeader && (
        <StackTabs
          stack={node}
          activeId={activeId}
          editMode={editMode}
          onActivate={handleActivate}
          onClose={handleClose}
        />
      )}
      <div className="dh-layout-stack-content">
        {node.children.map(panel => (
          <Panel
            key={panel.id}
            panel={panel}
            isActive={panel.id === activeId}
          />
        ))}
        {bodyZone != null && <DropIndicator zone={bodyZone} />}
      </div>
    </div>
  );
}

interface StackTabsProps {
  stack: StackNode;
  activeId: string | undefined;
  editMode: boolean;
  onActivate: (panelId: string) => void;
  onClose: (panelId: string) => void;
}

function StackTabs({
  stack,
  activeId,
  editMode,
  onActivate,
  onClose,
}: StackTabsProps): JSX.Element {
  const { components } = useLayoutContext();
  const { hover } = useDragState();
  const tabsRef = useRef<HTMLDivElement | null>(null);

  const insertIndex =
    hover != null &&
    hover.kind === 'stackZone' &&
    hover.stackId === stack.id &&
    hover.zone === 'center' &&
    hover.insertIndex !== undefined
      ? hover.insertIndex
      : null;

  return (
    <div ref={tabsRef} className="dh-layout-tabs" role="tablist">
      {stack.children.map((panel, i) => (
        <Tab
          key={panel.id}
          panel={panel}
          panelIndex={i}
          isActive={panel.id === activeId}
          editMode={editMode}
          stackId={stack.id}
          definition={components[panel.component]}
          onActivate={onActivate}
          onClose={onClose}
        />
      ))}
      {insertIndex !== null && (
        <TabInsertIndicator tabsRef={tabsRef} index={insertIndex} />
      )}
    </div>
  );
}

interface TabInsertIndicatorProps {
  tabsRef: React.RefObject<HTMLDivElement>;
  index: number;
}

function TabInsertIndicator({
  tabsRef,
  index,
}: TabInsertIndicatorProps): JSX.Element | null {
  const [left, setLeft] = useState<number | null>(null);

  useLayoutEffect(() => {
    const tabsEl = tabsRef.current;
    if (tabsEl == null) {
      setLeft(null);
      return;
    }
    const tabs = Array.from(
      tabsEl.querySelectorAll<HTMLElement>('.dh-layout-tab')
    );
    if (tabs.length === 0) {
      setLeft(0);
      return;
    }
    const tabsRect = tabsEl.getBoundingClientRect();
    let x: number;
    if (index <= 0) {
      x = tabs[0].getBoundingClientRect().left - tabsRect.left;
    } else if (index >= tabs.length) {
      x = tabs[tabs.length - 1].getBoundingClientRect().right - tabsRect.left;
    } else {
      x = tabs[index].getBoundingClientRect().left - tabsRect.left;
    }
    setLeft(x);
  }, [tabsRef, index]);

  if (left == null) return null;
  return (
    <div
      className="dh-layout-tab-insert"
      style={{ left: `${left}px` }}
      data-insert-index={index}
    />
  );
}

interface TabProps {
  panel: PanelNode;
  panelIndex: number;
  isActive: boolean;
  editMode: boolean;
  stackId: string;
  definition: PanelDefinition | undefined;
  onActivate: (panelId: string) => void;
  onClose: (panelId: string) => void;
}

function Tab({
  panel,
  panelIndex,
  isActive,
  editMode,
  stackId,
  definition,
  onActivate,
  onClose,
}: TabProps): JSX.Element {
  const handleActivate = useCallback(
    () => onActivate(panel.id),
    [onActivate, panel.id]
  );
  const handleCloseClick = useCallback(
    (e: MouseEvent) => {
      e.stopPropagation();
      onClose(panel.id);
    },
    [onClose, panel.id]
  );
  const handleCloseKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.stopPropagation();
        onClose(panel.id);
      }
    },
    [onClose, panel.id]
  );

  const { activePanelId } = useDragState();
  const { focusedPanelId } = useLayoutContext();
  const {
    setNodeRef: setDraggableRef,
    listeners,
    attributes,
    isDragging,
  } = useDraggable({
    id: panelDraggableId(panel.id),
    disabled: !editMode,
    data: { panelId: panel.id, stackId, index: panelIndex },
  });

  const tabContent: ReactNode = definition?.renderTab
    ? definition.renderTab({ panel, isActive, editMode })
    : defaultTabLabel(panel);

  const tooltip = definition?.renderTabTooltip?.({
    panel,
    isActive,
    editMode,
  });
  const title = typeof tooltip === 'string' ? tooltip : undefined;
  const isClosable = definition?.isClosable !== false;

  const isBeingDragged = activePanelId === panel.id;
  const isFocused = focusedPanelId === panel.id;
  const classes = ['dh-layout-tab'];
  if (isActive) classes.push('is-active');
  if (isDragging || isBeingDragged) classes.push('is-dragging');
  if (isFocused) classes.push('is-focused');
  const className = classes.join(' ');

  return (
    <button
      ref={setDraggableRef}
      type="button"
      // eslint-disable-next-line react/jsx-props-no-spreading
      {...attributes}
      // eslint-disable-next-line react/jsx-props-no-spreading
      {...listeners}
      role="tab"
      aria-selected={isActive}
      className={className}
      data-panel-id={panel.id}
      onClick={handleActivate}
      title={title}
    >
      <span className="dh-layout-tab-label">{tabContent}</span>
      {isClosable && (
        <span
          role="button"
          tabIndex={-1}
          aria-label={`Close ${defaultTabLabel(panel)}`}
          className="dh-layout-tab-close"
          onClick={handleCloseClick}
          onKeyDown={handleCloseKeyDown}
        >
          ×
        </span>
      )}
    </button>
  );
}

function flexStyle(size: number | undefined): CSSProperties | undefined {
  if (size === undefined) return undefined;
  return { flex: `${size} 1 0` };
}
