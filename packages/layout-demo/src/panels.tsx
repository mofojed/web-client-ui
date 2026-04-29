/* eslint-disable react-refresh/only-export-components */
import { useState } from 'react';
import {
  Dashboard,
  createLayoutState,
  type PanelContentProps,
  type PanelRegistry,
} from '@deephaven/layout';

interface CounterState {
  count: number;
}

function CounterPanel({ panel, setState }: PanelContentProps): JSX.Element {
  const state = (panel.state as CounterState | undefined) ?? { count: 0 };
  return (
    <div className="demo-counter">
      <h3>{panel.title ?? panel.id}</h3>
      <p>This panel persists its state via the `updatePanelState` transform.</p>
      <p>
        Count: <strong>{state.count}</strong>
      </p>
      <button
        type="button"
        onClick={() => setState({ count: state.count + 1 })}
      >
        increment
      </button>
    </div>
  );
}

interface ColorState {
  color: string;
}

function ColorPanel({ panel }: PanelContentProps): JSX.Element {
  const state = (panel.state as ColorState | undefined) ?? {
    color: '#4080ff',
  };
  return (
    <div className="demo-color" style={{ background: state.color }}>
      {state.color}
    </div>
  );
}

function TextPanel({ panel }: PanelContentProps): JSX.Element {
  return (
    <div className="demo-text">
      <h3>{panel.title ?? panel.id}</h3>
      <p>
        This is just a static text panel. Try dragging its tab around when in
        edit mode — drop it on another panel&apos;s edge to split, on its center
        to join the stack.
      </p>
      <p>Press Esc mid-drag to cancel.</p>
    </div>
  );
}

/**
 * A nested dashboard demonstrates that <Dashboard> can be used as the content
 * of a <Panel>. The inner dashboard manages its own state and DnD context.
 */
function NestedPanel(): JSX.Element {
  const [state, setState] = useState(() =>
    createLayoutState({
      type: 'row',
      id: 'nested-row',
      children: [
        {
          type: 'panel',
          id: 'inner-1',
          component: 'text',
          title: 'Inner A',
        },
        {
          type: 'panel',
          id: 'inner-2',
          component: 'color',
          title: 'Inner B',
          state: { color: '#ff8040' },
        },
      ],
    })
  );

  return (
    <div className="demo-nested" style={{ width: '100%', height: '100%' }}>
      <Dashboard
        layout={state}
        components={NESTED_COMPONENTS}
        onChange={next => setState(next)}
        editMode
      />
    </div>
  );
}

const NESTED_COMPONENTS: PanelRegistry = {
  text: { component: TextPanel },
  color: { component: ColorPanel },
};

const COMPONENTS: PanelRegistry = {
  counter: { component: CounterPanel },
  color: { component: ColorPanel },
  text: { component: TextPanel },
  nested: { component: NestedPanel },
};

export default COMPONENTS;
