import { act, renderHook } from '@testing-library/react';
import { panel, stack } from '../../state/__tests__/fixtures';
import { useLayoutState } from '../useLayoutState';

beforeEach(() => {
  expect.hasAssertions();
});

describe('useLayoutState', () => {
  it('initializes from a LayoutNode (normalized)', () => {
    const { result } = renderHook(() => useLayoutState(panel('p1')));
    expect(result.current.state.transforms).toEqual([]);
    expect(result.current.state.initial.type).toBe('stack');
  });

  it('appends a transform on dispatch', () => {
    const { result } = renderHook(() =>
      useLayoutState(stack('s', [panel('p1'), panel('p2')]))
    );
    act(() => {
      result.current.dispatch({
        kind: 'setActive',
        stackId: 's',
        panelId: 'p2',
      });
    });
    expect(result.current.state.transforms).toEqual([
      { kind: 'setActive', stackId: 's', panelId: 'p2' },
    ]);
  });

  it('replaces state on setState', () => {
    const { result } = renderHook(() =>
      useLayoutState(stack('s', [panel('p1')]))
    );
    act(() => {
      result.current.setState({
        initial: stack('s2', [panel('px')]),
        transforms: [],
      });
    });
    expect(result.current.state.initial.id).toBe('s2');
  });
});
