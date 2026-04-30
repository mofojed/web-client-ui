import { useMemo, useState } from 'react';
import {
  Dashboard,
  compact,
  createLayoutState,
  resolveLayout,
  usePersistedLayoutState,
  type LayoutNode,
} from '@deephaven/layout';
import COMPONENTS from './panels';

const STORAGE_KEY = 'deephaven.layout-demo.state';

const INITIAL_LAYOUT: LayoutNode = {
  type: 'row',
  id: 'root',
  children: [
    {
      type: 'column',
      id: 'left',
      children: [
        {
          type: 'panel',
          id: 'counter-a',
          component: 'counter',
          title: 'Counter A',
        },
        {
          type: 'stack',
          id: 'left-bottom',
          children: [
            {
              type: 'panel',
              id: 'text-1',
              component: 'text',
              title: 'Notes',
            },
            {
              type: 'panel',
              id: 'text-2',
              component: 'text',
              title: 'More notes',
            },
          ],
        },
      ],
    },
    {
      type: 'column',
      id: 'right',
      children: [
        {
          type: 'panel',
          id: 'color-1',
          component: 'color',
          title: 'Color 1',
          state: { color: '#4080ff' },
        },
        {
          type: 'panel',
          id: 'nested-1',
          component: 'nested',
          title: 'Nested layout',
        },
        {
          type: 'panel',
          id: 'color-2',
          component: 'color',
          title: 'Color 2',
          state: { color: '#40c060' },
        },
      ],
    },
  ],
};

export default function App(): JSX.Element {
  const initial = useMemo(() => createLayoutState(INITIAL_LAYOUT), []);
  const { state, dispatch, setState, reset } = usePersistedLayoutState(
    initial,
    { key: STORAGE_KEY }
  );
  const [editMode, setEditMode] = useState(true);
  const [showState, setShowState] = useState(false);

  const transformsCount = state.transforms.length;
  const resolved = useMemo(() => resolveLayout(state), [state]);

  return (
    <div className="demo-shell">
      <div className="demo-toolbar">
        <strong>@deephaven/layout — demo</strong>
        <button
          type="button"
          className={editMode ? 'is-active' : undefined}
          onClick={() => setEditMode(v => !v)}
        >
          {editMode ? 'edit mode: on' : 'edit mode: off'}
        </button>
        <button
          type="button"
          onClick={() => setState(compact(state))}
          disabled={transformsCount === 0}
        >
          compact ({transformsCount} transforms)
        </button>
        <button type="button" onClick={reset}>
          reset
        </button>
        <button
          type="button"
          onClick={() =>
            dispatch({
              kind: 'addPanel',
              panel: {
                type: 'panel',
                id: `counter-${Date.now()}`,
                component: 'counter',
                title: 'New counter',
              },
              target: { type: 'sibling', nodeId: 'root', side: 'right' },
            })
          }
        >
          add panel
        </button>
        <div className="demo-toolbar-spacer" />
        <span className="demo-toolbar-info">
          root: {resolved.type}, {transformsCount} pending
        </span>
        <button type="button" onClick={() => setShowState(v => !v)}>
          {showState ? 'hide state' : 'show state'}
        </button>
      </div>
      <div className="demo-layout">
        <Dashboard
          layout={state}
          components={COMPONENTS}
          onChange={next => setState(next)}
          editMode={editMode}
        />
      </div>
      {showState && (
        <pre className="demo-state-pane">{JSON.stringify(state, null, 2)}</pre>
      )}
    </div>
  );
}
