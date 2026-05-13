import { fireEvent, render } from '@testing-library/react';
import { useState } from 'react';
import { panel, row, stack } from '../../state/__tests__/fixtures';
import type { LayoutState, Transform } from '../../types';
import Dashboard from '../Dashboard';
import createLayoutState from '../createLayoutState';
import type { PanelRegistry } from '../types';

beforeEach(() => {
  expect.hasAssertions();
});

function DemoPanel({
  panel: p,
}: {
  panel: { id: string; title?: string };
}): JSX.Element {
  return <div data-testid={`content-${p.id}`}>{p.title ?? p.id}</div>;
}

const components: PanelRegistry = { demo: { component: DemoPanel } };

function Harness({
  initial,
  onChange,
}: {
  initial: LayoutState;
  onChange?: (state: LayoutState, transform: Transform) => void;
}): JSX.Element {
  const [state, setState] = useState(initial);
  return (
    <Dashboard
      layout={state}
      components={components}
      onChange={(next, transform) => {
        setState({
          initial: next.initial,
          transforms: [...state.transforms, transform],
        });
        onChange?.(next, transform);
      }}
    />
  );
}

describe('Splitter rendering', () => {
  it('renders n-1 splitters in a row of n stacks', () => {
    const state = createLayoutState(
      row('r', [
        stack('s1', [panel('p1', { title: 'A' })]),
        stack('s2', [panel('p2', { title: 'B' })]),
        stack('s3', [panel('p3', { title: 'C' })]),
      ])
    );
    render(<Dashboard layout={state} components={components} />);
    expect(document.querySelectorAll('[data-layout-splitter]')).toHaveLength(2);
  });

  it('renders no splitter for a single-child container', () => {
    const state = createLayoutState(stack('s', [panel('p1')]));
    render(<Dashboard layout={state} components={components} />);
    expect(document.querySelectorAll('[data-layout-splitter]')).toHaveLength(0);
  });

  it('marks splitters with the correct axis class and aria orientation', () => {
    const state = createLayoutState(
      row('r', [stack('s1', [panel('p1')]), stack('s2', [panel('p2')])])
    );
    render(<Dashboard layout={state} components={components} />);
    const splitter = document.querySelector('[data-layout-splitter]');
    expect(splitter).toHaveClass('dh-layout-splitter-row');
    expect(splitter).toHaveAttribute('aria-orientation', 'vertical');
  });

  it('marks splitters in a column with horizontal orientation', () => {
    const state = createLayoutState({
      type: 'column',
      id: 'c',
      children: [stack('s1', [panel('p1')]), stack('s2', [panel('p2')])],
    });
    render(<Dashboard layout={state} components={components} />);
    const splitter = document.querySelector('[data-layout-splitter]');
    expect(splitter).toHaveClass('dh-layout-splitter-column');
    expect(splitter).toHaveAttribute('aria-orientation', 'horizontal');
  });
});

describe('Splitter drag behavior', () => {
  function twoStackRow(): LayoutState {
    return createLayoutState(
      row('r', [
        stack('s1', [panel('p1', { title: 'A' })]),
        stack('s2', [panel('p2', { title: 'B' })]),
      ])
    );
  }

  it('does not dispatch setSizes during pointermove (preview-only)', () => {
    const handleChange = jest.fn();
    render(<Harness initial={twoStackRow()} onChange={handleChange} />);
    const splitter = document.querySelector(
      '[data-layout-splitter]'
    ) as HTMLElement;
    fireEvent.pointerDown(splitter, { clientX: 500, pointerId: 1 });
    fireEvent.pointerMove(splitter, { clientX: 550, pointerId: 1 });
    fireEvent.pointerMove(splitter, { clientX: 600, pointerId: 1 });
    expect(handleChange).not.toHaveBeenCalled();
  });

  it('shows the preview overlay while dragging and removes it on release', () => {
    render(<Harness initial={twoStackRow()} />);
    const splitter = document.querySelector(
      '[data-layout-splitter]'
    ) as HTMLElement;
    expect(splitter.querySelector('.dh-layout-splitter-preview')).toBeNull();
    fireEvent.pointerDown(splitter, { clientX: 500, pointerId: 1 });
    expect(
      splitter.querySelector('.dh-layout-splitter-preview')
    ).not.toBeNull();
    fireEvent.pointerUp(splitter, { clientX: 600, pointerId: 1 });
    expect(splitter.querySelector('.dh-layout-splitter-preview')).toBeNull();
  });

  it('dispatches a single setSizes transform on pointerup', () => {
    const handleChange = jest.fn();
    render(<Harness initial={twoStackRow()} onChange={handleChange} />);
    const splitter = document.querySelector(
      '[data-layout-splitter]'
    ) as HTMLElement;
    fireEvent.pointerDown(splitter, { clientX: 500, pointerId: 1 });
    fireEvent.pointerMove(splitter, { clientX: 600, pointerId: 1 });
    fireEvent.pointerUp(splitter, { clientX: 600, pointerId: 1 });
    expect(handleChange).toHaveBeenCalledTimes(1);
    const [, transform] = handleChange.mock.calls[0];
    expect(transform.kind).toBe('setSizes');
    expect(transform.containerId).toBe('r');
  });

  it('cancels the drag and skips the dispatch when Escape is pressed', () => {
    const handleChange = jest.fn();
    render(<Harness initial={twoStackRow()} onChange={handleChange} />);
    const splitter = document.querySelector(
      '[data-layout-splitter]'
    ) as HTMLElement;
    fireEvent.pointerDown(splitter, { clientX: 500, pointerId: 1 });
    fireEvent.pointerMove(splitter, { clientX: 600, pointerId: 1 });
    fireEvent.keyDown(window, { key: 'Escape' });
    expect(splitter.querySelector('.dh-layout-splitter-preview')).toBeNull();
    fireEvent.pointerUp(splitter, { clientX: 600, pointerId: 1 });
    expect(handleChange).not.toHaveBeenCalled();
  });
});
