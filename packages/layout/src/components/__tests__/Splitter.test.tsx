import { render } from '@testing-library/react';
import { panel, row, stack } from '../../state/__tests__/fixtures';
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
