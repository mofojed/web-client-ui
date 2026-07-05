import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { nanoid } from 'nanoid';
import { useConnection } from '@deephaven/app-utils';
import { Sidebar, type SidebarItem } from '@deephaven/components';
import {
  vsExtensions,
  vsDebugAlt,
  vsSettingsGear,
  vsMultipleWindows,
} from '@deephaven/icons';
import {
  Dashboard,
  MaximizeBreadcrumb,
  MaximizeProvider,
  compact,
  createLayoutState,
  useMaximizeChain,
  usePersistedLayoutState,
} from '@deephaven/layout';
import type { dh } from '@deephaven/jsapi-types';
import { WidgetList } from './WidgetList';
import { DebugTools } from './DebugTools';
import { Settings } from './Settings';
import { Controls } from './Controls';
import COMPONENTS from './panels';

const SIDEBAR_ITEMS: SidebarItem[] = [
  { key: 'widgets', icon: vsExtensions, title: 'Widgets' },
  { key: 'controls', icon: vsMultipleWindows, title: 'Controls' },
  { key: 'settings', icon: vsSettingsGear, title: 'Settings' },
  { key: 'debug', icon: vsDebugAlt, title: 'Debug tools' },
];

const STORAGE_KEY = 'deephaven.widget-layout-demo.state';

const INITIAL_LAYOUT = {
  type: 'stack' as const,
  id: 'root',
  children: [],
};

function AppContent(): JSX.Element {
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
  const { state, setState, reset } = usePersistedLayoutState(initial, {
    key: STORAGE_KEY,
  });
  const [editMode, setEditMode] = useState(true);
  const [selectedTool, setSelectedTool] = useState<string | null>('widgets');

  // Adds route to whichever dashboard is currently maximized (or the top
  // level when nothing is maximized).
  const { addToActiveDashboard } = useMaximizeChain();

  const handleAddWidget = useCallback(
    (widget: dh.ide.VariableDefinition) => {
      if (widget.name == null || widget.name === '') return;
      addToActiveDashboard({
        type: 'panel',
        id: `${widget.type}-${widget.name}-${nanoid(6)}`,
        component: 'widget',
        title: widget.name,
        state: { type: widget.type, name: widget.name },
      });
    },
    [addToActiveDashboard]
  );

  const dashboardCountRef = useRef(0);
  const handleNewDashboard = useCallback(() => {
    dashboardCountRef.current += 1;
    addToActiveDashboard({
      type: 'panel',
      id: `dashboard-${nanoid(6)}`,
      component: 'dashboard',
      title: `Dashboard ${dashboardCountRef.current}`,
    });
  }, [addToActiveDashboard]);

  const transformsCount = state.transforms.length;

  const renderSidebarContent = useCallback(
    (key: string) => {
      switch (key) {
        case 'widgets':
          return <WidgetList widgets={widgets} onSelect={handleAddWidget} />;
        case 'controls':
          return <Controls onNewDashboard={handleNewDashboard} />;
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
        case 'settings':
          return <Settings />;
        default:
          return null;
      }
    },
    [
      widgets,
      handleAddWidget,
      handleNewDashboard,
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
        <MaximizeBreadcrumb />
        <div className="demo-layout-body">
          <Dashboard
            layout={state}
            components={COMPONENTS}
            onChange={next => setState(next)}
            editMode={editMode}
            layoutKey={STORAGE_KEY}
          />
        </div>
      </div>
    </div>
  );
}

function App(): JSX.Element {
  return (
    <MaximizeProvider>
      <AppContent />
    </MaximizeProvider>
  );
}

export default App;
