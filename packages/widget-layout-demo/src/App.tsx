import { useCallback, useEffect, useMemo, useState } from 'react';
import { nanoid } from 'nanoid';
import { useConnection } from '@deephaven/app-utils';
import {
  Dashboard,
  compact,
  createLayoutState,
  usePersistedLayoutState,
} from '@deephaven/layout';
import type { dh } from '@deephaven/jsapi-types';
import { WidgetMenu } from './WidgetMenu';
import COMPONENTS from './panels';

const STORAGE_KEY = 'deephaven.widget-layout-demo.state';

const INITIAL_LAYOUT = {
  type: 'stack' as const,
  id: 'root',
  children: [],
};

function App(): JSX.Element {
  const connection = useConnection();
  const [widgets, setWidgets] = useState<dh.ide.VariableDefinition[]>([]);

  useEffect(
    function subscribeToWidgetList() {
      if (connection.subscribeToFieldUpdates == null) {
        return undefined;
      }
      return connection.subscribeToFieldUpdates(
        ({ created, updated, removed }) => {
          setWidgets(prev => {
            const drop = new Set(
              [...updated, ...removed].map(w => w.name ?? '')
            );
            const next = prev.filter(w => !drop.has(w.name ?? ''));
            [...created, ...updated].forEach(w => {
              if (w.name != null && w.name !== '') {
                next.push(w);
              }
            });
            return next;
          });
        }
      );
    },
    [connection]
  );

  const initial = useMemo(() => createLayoutState(INITIAL_LAYOUT), []);
  const { state, dispatch, setState, reset } = usePersistedLayoutState(
    initial,
    { key: STORAGE_KEY }
  );
  const [editMode, setEditMode] = useState(true);

  const handleAddWidget = useCallback(
    (widget: dh.ide.VariableDefinition) => {
      if (widget.name == null || widget.name === '') return;
      dispatch({
        kind: 'addPanel',
        panel: {
          type: 'panel',
          id: `${widget.type}-${widget.name}-${nanoid(6)}`,
          component: 'widget',
          title: widget.name,
          state: { type: widget.type, name: widget.name },
        },
        target: { type: 'rootSibling', side: 'right' },
      });
    },
    [dispatch]
  );

  const transformsCount = state.transforms.length;

  return (
    <div className="demo-shell">
      <div className="demo-toolbar">
        <strong>@deephaven/layout — widgets</strong>
        <WidgetMenu widgets={widgets} onSelect={handleAddWidget} />
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
          compact ({transformsCount})
        </button>
        <button type="button" onClick={reset}>
          reset
        </button>
      </div>
      <div className="demo-layout">
        <Dashboard
          layout={state}
          components={COMPONENTS}
          onChange={next => setState(next)}
          editMode={editMode}
          layoutKey={STORAGE_KEY}
        />
      </div>
    </div>
  );
}

export default App;
