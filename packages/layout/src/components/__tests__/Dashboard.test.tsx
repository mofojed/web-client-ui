import { fireEvent, render, screen } from '@testing-library/react';
import { useState } from 'react';
import type { LayoutState, Transform } from '../../types';
import { applyTransform } from '../../state/reducer';
import { resolveLayout } from '../../state/compact';
import { panel, row, stack } from '../../state/__tests__/fixtures';
import Dashboard from '../Dashboard';
import createLayoutState from '../createLayoutState';
import type { PanelRegistry } from '../types';

beforeEach(() => {
  expect.hasAssertions();
});

function DemoPanel({
  panel: p,
  isActive,
}: {
  panel: { id: string; title?: string };
  isActive: boolean;
}): JSX.Element {
  return (
    <div data-testid={`content-${p.id}`} data-active={isActive}>
      content of {p.title ?? p.id}
    </div>
  );
}

const components: PanelRegistry = {
  demo: { component: DemoPanel },
};

function Harness({
  initial,
  editMode,
  registry = components,
}: {
  initial: LayoutState;
  editMode?: boolean;
  registry?: PanelRegistry;
}): JSX.Element {
  const [state, setState] = useState(initial);
  return (
    <Dashboard
      layout={state}
      components={registry}
      editMode={editMode}
      onChange={(next, transform) => {
        setState({
          initial: next.initial,
          transforms: [...state.transforms, transform],
        });
      }}
    />
  );
}

describe('Dashboard rendering', () => {
  it('renders panel content for a single-panel stack', () => {
    const state = createLayoutState(stack('s', [panel('p1', { title: 'A' })]));
    render(<Harness initial={state} />);
    expect(screen.getByTestId('content-p1')).toBeInTheDocument();
  });

  it('hides the tab strip when a stack has only one panel and edit mode is off', () => {
    const state = createLayoutState(stack('s', [panel('p1', { title: 'A' })]));
    render(<Harness initial={state} />);
    expect(screen.queryByRole('tab')).not.toBeInTheDocument();
  });

  it('shows the tab strip in edit mode even with one panel', () => {
    const state = createLayoutState(stack('s', [panel('p1', { title: 'A' })]));
    render(<Harness initial={state} editMode />);
    expect(screen.getByRole('tab')).toBeInTheDocument();
    expect(screen.getByRole('tab')).toHaveTextContent('A');
  });

  it('renders multiple tabs and only the active panel content is visible', () => {
    const state = createLayoutState(
      stack('s', [panel('p1', { title: 'A' }), panel('p2', { title: 'B' })])
    );
    render(<Harness initial={state} />);
    const tabs = screen.getAllByRole('tab');
    expect(tabs).toHaveLength(2);
    // both panels render in DOM, but only the active one is visible
    expect(screen.getByTestId('content-p1')).toHaveAttribute(
      'data-active',
      'true'
    );
    expect(screen.getByTestId('content-p2')).toHaveAttribute(
      'data-active',
      'false'
    );
  });

  it('switches active tab when a tab is clicked', () => {
    const state = createLayoutState(
      stack('s', [panel('p1', { title: 'A' }), panel('p2', { title: 'B' })])
    );
    render(<Harness initial={state} />);
    fireEvent.click(screen.getByRole('tab', { name: /B/ }));
    expect(screen.getByTestId('content-p2')).toHaveAttribute(
      'data-active',
      'true'
    );
  });

  it('closes a panel when the close affordance is clicked', () => {
    const state = createLayoutState(
      stack('s', [panel('p1', { title: 'A' }), panel('p2', { title: 'B' })])
    );
    render(<Harness initial={state} />);
    const closeButtons = screen.getAllByLabelText(/^Close/);
    fireEvent.click(closeButtons[0]);
    expect(screen.queryByTestId('content-p1')).not.toBeInTheDocument();
    expect(screen.getByTestId('content-p2')).toBeInTheDocument();
  });

  it('renders rows with multiple stacks', () => {
    const state = createLayoutState(
      row('r', [
        stack('s1', [panel('p1', { title: 'A' })]),
        stack('s2', [panel('p2', { title: 'B' })]),
      ])
    );
    render(<Harness initial={state} />);
    expect(screen.getByTestId('content-p1')).toBeInTheDocument();
    expect(screen.getByTestId('content-p2')).toBeInTheDocument();
  });

  it('renders an "unknown component" fallback when a panel is not in the registry', () => {
    const state = createLayoutState(
      stack('s', [
        {
          type: 'panel',
          id: 'p1',
          component: 'missing',
        },
      ])
    );
    render(<Harness initial={state} registry={{}} />);
    expect(
      screen.getByText(/Unknown panel component: missing/)
    ).toBeInTheDocument();
  });

  it('uses renderTab and renderTabTooltip from the registry', () => {
    const registry: PanelRegistry = {
      demo: {
        component: DemoPanel,
        renderTab: ({ panel: p }) => (
          <span data-testid={`tab-${p.id}`}>★ {p.title}</span>
        ),
        renderTabTooltip: ({ panel: p }) => `tooltip for ${p.id}`,
      },
    };
    const state = createLayoutState(
      stack('s', [panel('p1', { title: 'A' }), panel('p2', { title: 'B' })])
    );
    render(<Harness initial={state} registry={registry} />);
    expect(screen.getByTestId('tab-p1')).toHaveTextContent('★ A');
    expect(screen.getByRole('tab', { name: /A/ })).toHaveAttribute(
      'title',
      'tooltip for p1'
    );
  });

  it('hides the close affordance when isClosable is false', () => {
    const registry: PanelRegistry = {
      demo: { component: DemoPanel, isClosable: false },
    };
    const state = createLayoutState(
      stack('s', [panel('p1', { title: 'A' }), panel('p2', { title: 'B' })])
    );
    render(<Harness initial={state} registry={registry} />);
    expect(screen.queryAllByLabelText(/^Close/)).toHaveLength(0);
  });

  it('updatePanelState transform persists state across re-renders', () => {
    function StatefulPanel({
      panel: p,
      setState: save,
    }: {
      panel: { id: string; state?: unknown };
      setState: (s: unknown) => void;
    }): JSX.Element {
      return (
        <button
          type="button"
          data-testid={`save-${p.id}`}
          onClick={() => save({ saved: true })}
        >
          state: {JSON.stringify(p.state ?? null)}
        </button>
      );
    }
    const registry: PanelRegistry = {
      demo: { component: StatefulPanel as never },
    };
    const state = createLayoutState(stack('s', [panel('p1')]));
    render(<Harness initial={state} registry={registry} />);
    expect(screen.getByTestId('save-p1')).toHaveTextContent('state: null');
    fireEvent.click(screen.getByTestId('save-p1'));
    expect(screen.getByTestId('save-p1')).toHaveTextContent(
      'state: {"saved":true}'
    );
  });
});

function HostContent(): JSX.Element {
  const inner = createLayoutState(stack('inner', [panel('inner-1')]));
  return <Dashboard layout={inner} components={components} editMode={false} />;
}

describe('nested dashboard', () => {
  it('marks an inner Dashboard with the is-nested class', () => {
    const hostRegistry: PanelRegistry = {
      host: { component: HostContent as never },
    };
    const outer = createLayoutState(
      stack('outer', [{ type: 'panel', id: 'p1', component: 'host' }])
    );
    const { container } = render(
      <Dashboard layout={outer} components={hostRegistry} />
    );
    const dashboards = container.querySelectorAll('.dh-layout');
    expect(dashboards).toHaveLength(2);
    expect(dashboards[0]).not.toHaveClass('is-nested');
    expect(dashboards[1]).toHaveClass('is-nested');
  });
});

describe('onChange contract', () => {
  it('emits the transform that produced the change', () => {
    const handle = jest.fn<void, [LayoutState, Transform]>();
    const state = createLayoutState(
      stack('s', [panel('p1', { title: 'A' }), panel('p2', { title: 'B' })])
    );
    function Controlled(): JSX.Element {
      return (
        <Dashboard layout={state} components={components} onChange={handle} />
      );
    }
    render(<Controlled />);
    fireEvent.click(screen.getByRole('tab', { name: /B/ }));
    expect(handle).toHaveBeenCalledTimes(1);
    const [, transform] = handle.mock.calls[0];
    expect(transform).toEqual({
      kind: 'setActive',
      stackId: 's',
      panelId: 'p2',
    });
  });

  it('produces an effective layout consistent with applyTransform', () => {
    const initial = stack('s', [panel('p1'), panel('p2')]);
    const layout = createLayoutState(initial);
    const transform: Transform = {
      kind: 'closePanel',
      panelId: 'p1',
    };
    const expected = applyTransform(layout.initial, transform);
    const next = {
      initial: layout.initial,
      transforms: [transform],
    };
    expect(resolveLayout(next)).toEqual(expected);
  });
});
