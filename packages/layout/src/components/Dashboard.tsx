import type { CSSProperties, ReactNode } from 'react';
import { useCallback, useContext, useMemo, useRef } from 'react';
import type { LayoutNode, LayoutState, NodeId, Transform } from '../types';
import { resolveLayout } from '../state/compact';
import { findNode, isStack } from '../state/treeUtils';
import LayoutContext from './LayoutContext';
import RenderNode from './RenderNode';
import mergeTransform from './mergeTransform';
import type { PanelDefinition, PanelRegistry } from './types';
import DragLayer from '../dnd/DragLayer';
import './Layout.scss';

export interface DashboardProps {
  /**
   * The current layout state. The `transforms` array contains user edits;
   * `initial` is the baseline layout. Use `compact()` to fold transforms
   * into the baseline before persisting.
   */
  layout: LayoutState;
  /** Map of panel-component-name → component definition. */
  components: PanelRegistry;
  /**
   * Called whenever the user causes a layout change. Receives the new
   * effective state and the single transform that produced it.
   */
  onChange?: (state: LayoutState, transform: Transform) => void;
  /**
   * When true, all stacks render their tab strip (even single-panel ones)
   * and tabs become draggable. When false, single-panel stacks render no
   * header and the layout is read-only.
   */
  editMode?: boolean;
  /** Optional className applied to the root element. */
  className?: string;
  /** Optional inline style for the root element. */
  style?: CSSProperties;
}

function defaultTabLabel(p: { id: string; title?: string }): string {
  return p.title ?? p.id;
}

function renderGhost(
  resolvedRoot: LayoutNode,
  components: PanelRegistry,
  panelId: NodeId,
  editMode: boolean
): ReactNode {
  const panel = findNode(resolvedRoot, panelId);
  if (panel == null || panel.type !== 'panel') return null;
  const definition: PanelDefinition | undefined = components[panel.component];
  const label = definition?.renderTab
    ? definition.renderTab({ panel, isActive: true, editMode })
    : defaultTabLabel(panel);
  return (
    <div className="dh-layout-drag-ghost">
      <span className="dh-layout-tab-label">{label}</span>
    </div>
  );
}

export default function Dashboard({
  layout,
  components,
  onChange,
  editMode = false,
  className,
  style,
}: DashboardProps): JSX.Element {
  const dashboardRef = useRef<HTMLDivElement | null>(null);
  const layoutRef = useRef(layout);
  layoutRef.current = layout;

  const onChangeRef = useRef(onChange);
  onChangeRef.current = onChange;

  const dispatch = useCallback((transform: Transform) => {
    const { initial, transforms } = layoutRef.current;
    const nextState: LayoutState = {
      initial,
      transforms: mergeTransform(transforms, transform),
    };
    onChangeRef.current?.(nextState, transform);
  }, []);

  const resolved = useMemo(() => resolveLayout(layout), [layout]);

  const getStackChildCount = useCallback(
    (stackId: NodeId): number => {
      const found = findNode(resolved, stackId);
      if (found != null && isStack(found)) return found.children.length;
      return 0;
    },
    [resolved]
  );

  const renderGhostFn = useCallback(
    (panelId: NodeId): ReactNode =>
      renderGhost(resolved, components, panelId, editMode),
    [resolved, components, editMode]
  );

  const contextValue = useMemo(
    () => ({
      state: layout,
      dispatch,
      components,
      editMode,
      draggingPanelId: null,
    }),
    [layout, dispatch, components, editMode]
  );

  // a Dashboard rendered inside another Dashboard's panel inherits the outer
  // LayoutContext; use that to draw a visual border around the nested one
  const isNested = useContext(LayoutContext) != null;

  const classes = ['dh-layout'];
  if (isNested) classes.push('is-nested');
  if (className != null && className !== '') classes.push(className);
  const rootClass = classes.join(' ');

  return (
    <div ref={dashboardRef} className={rootClass} style={style}>
      <LayoutContext.Provider value={contextValue}>
        <DragLayer
          enabled={editMode}
          dispatch={dispatch}
          getStackChildCount={getStackChildCount}
          renderGhost={renderGhostFn}
          dashboardRef={dashboardRef}
        >
          <RenderNode node={resolved} />
        </DragLayer>
      </LayoutContext.Provider>
    </div>
  );
}
