import type {
  CSSProperties,
  KeyboardEvent,
  MouseEvent,
  ReactNode,
} from 'react';
import { useCallback } from 'react';
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

  const isHover =
    activePanelId != null && hover != null && hover.stackId === node.id;

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
        {isHover && hover != null && <DropIndicator zone={hover.zone} />}
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
  return (
    <div className="dh-layout-tabs" role="tablist">
      {stack.children.map(panel => (
        <Tab
          key={panel.id}
          panel={panel}
          isActive={panel.id === activeId}
          editMode={editMode}
          stackId={stack.id}
          definition={components[panel.component]}
          onActivate={onActivate}
          onClose={onClose}
        />
      ))}
    </div>
  );
}

interface TabProps {
  panel: PanelNode;
  isActive: boolean;
  editMode: boolean;
  stackId: string;
  definition: PanelDefinition | undefined;
  onActivate: (panelId: string) => void;
  onClose: (panelId: string) => void;
}

function Tab({
  panel,
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
  const {
    setNodeRef: setDraggableRef,
    listeners,
    attributes,
    isDragging,
  } = useDraggable({
    id: panelDraggableId(panel.id),
    disabled: !editMode,
    data: { panelId: panel.id, stackId },
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

  // when this tab is the source of the active drag, dim it so users see the
  // panel "lifted" while previewing the drop
  const isBeingDragged = activePanelId === panel.id;
  const className = `dh-layout-tab${isActive ? ' is-active' : ''}${
    isDragging || isBeingDragged ? ' is-dragging' : ''
  }`;

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
