import type { CSSProperties } from 'react';
import {
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import type { LayoutState, NodeId, PanelNode, Transform } from '../types';
import { resolveLayout } from '../state/compact';
import { findNode, isPanel, isStack } from '../state/treeUtils';
import LayoutContext from './LayoutContext';
import RenderNode from './RenderNode';
import mergeTransform from './mergeTransform';
import findFocusedPanelId from './findFocusedPanelId';
import type { PanelRegistry } from './types';
import DragLayer from '../dnd/DragLayer';
import PopoutController from '../popout/PopoutController';
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
  /**
   * Storage key the parent app persists this dashboard's state under. When
   * set, dragging a tab outside the browser window pops the panel into a
   * chromeless child window that re-loads the same SPA bundle and reads
   * shared state via this key. Pass null/undefined to disable popouts.
   */
  layoutKey?: string | null;
  /**
   * Identifier for this Dashboard's window in the popout topology. `null`
   * means this is the parent (top-level) window. A popout window passes
   * its popoutId so cross-window drag and state-sync logic can route
   * messages correctly. Set automatically by `PopoutPanelHost`.
   */
  windowId?: NodeId | null;
  /** Optional className applied to the root element. */
  className?: string;
  /** Optional inline style for the root element. */
  style?: CSSProperties;
}

export default function Dashboard({
  layout,
  components,
  onChange,
  editMode = false,
  layoutKey,
  windowId = null,
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
  const resolvedRoot = resolved.root;

  const getStackChildCount = useCallback(
    (stackId: NodeId): number => {
      const found = findNode(resolvedRoot, stackId);
      if (found != null && isStack(found)) return found.children.length;
      return 0;
    },
    [resolvedRoot]
  );

  const getPanel = useCallback(
    (panelId: NodeId): PanelNode | null => {
      const found = findNode(resolvedRoot, panelId);
      return found != null && isPanel(found) ? found : null;
    },
    [resolvedRoot]
  );

  const [focusedPanelId, setFocusedPanelId] = useState<NodeId | null>(null);
  useEffect(() => {
    const el = dashboardRef.current;
    if (el == null) return undefined;

    const recompute = (): void => {
      const focused = document.activeElement;
      if (!(focused instanceof Element) || !el.contains(focused)) {
        setFocusedPanelId(null);
        return;
      }
      setFocusedPanelId(findFocusedPanelId(focused, el));
    };

    const handleFocusIn = (e: FocusEvent): void => {
      const { target } = e;
      if (target instanceof Element) {
        setFocusedPanelId(findFocusedPanelId(target, el));
      }
    };
    const handleFocusOut = (e: FocusEvent): void => {
      const next = e.relatedTarget;
      if (!(next instanceof Element) || !el.contains(next)) {
        setFocusedPanelId(null);
      }
    };

    recompute();
    el.addEventListener('focusin', handleFocusIn);
    el.addEventListener('focusout', handleFocusOut);
    return () => {
      el.removeEventListener('focusin', handleFocusIn);
      el.removeEventListener('focusout', handleFocusOut);
    };
  }, []);

  const contextValue = useMemo(
    () => ({
      state: layout,
      dispatch,
      components,
      editMode,
      draggingPanelId: null,
      focusedPanelId,
    }),
    [layout, dispatch, components, editMode, focusedPanelId]
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
        <PopoutController
          layoutKey={layoutKey}
          state={layout}
          popouts={resolved.popouts}
          dispatch={dispatch}
          windowId={windowId}
        >
          <DragLayer
            enabled={editMode}
            dispatch={dispatch}
            getStackChildCount={getStackChildCount}
            getPanel={getPanel}
            dashboardRef={dashboardRef}
          >
            <RenderNode node={resolvedRoot} />
          </DragLayer>
        </PopoutController>
      </LayoutContext.Provider>
    </div>
  );
}
