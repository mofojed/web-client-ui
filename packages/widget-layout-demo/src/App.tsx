import { useCallback, useEffect, useMemo, useState } from 'react';
import { nanoid } from 'nanoid';
import { useConnection } from '@deephaven/app-utils';
import { Sidebar, type SidebarItem } from '@deephaven/components';
import { vsListUnordered, vsDebugAlt } from '@deephaven/icons';
import {
  Dashboard,
  compact,
  createLayoutState,
  usePersistedLayoutState,
} from '@deephaven/layout';
import type { dh } from '@deephaven/jsapi-types';
import { WidgetList } from './WidgetList';
import { DebugTools } from './DebugTools';
import COMPONENTS from './panels';

const SIDEBAR_ITEMS: SidebarItem[] = [
  { key: 'widgets', icon: vsListUnordered, title: 'Widgets' },
  { key: 'debug', icon: vsDebugAlt, title: 'Debug tools' },
];

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
  const [selectedTool, setSelectedTool] = useState<string | null>('widgets');

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

  const renderSidebarContent = useCallback(
    (key: string) => {
      switch (key) {
        case 'widgets':
          return <WidgetList widgets={widgets} onSelect={handleAddWidget} />;
        case 'debug':
          return (
            <DebugTools
              editMode={editMode}
              onToggleEditMode={() => setEditMode(v => !v)}
              transformsCount={transformsCount}
              onCompact={() => setState(compact(state))}
              onReset={reset}
            />
          );
        default:
          return null;
      }
    },
    [
      widgets,
      handleAddWidget,
      editMode,
      transformsCount,
      setState,
      state,
      reset,
    ]
  );

  return (
    <div className="demo-shell">
      <Sidebar
        items={SIDEBAR_ITEMS}
        selectedKey={selectedTool}
        onSelect={setSelectedTool}
        renderContent={renderSidebarContent}
      />
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
