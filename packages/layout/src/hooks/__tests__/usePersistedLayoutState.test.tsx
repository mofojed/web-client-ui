import { act, renderHook } from '@testing-library/react';
import { panel, stack } from '../../state/__tests__/fixtures';
import type { LayoutState, SerializedLayoutState } from '../../types';
import { usePersistedLayoutState } from '../usePersistedLayoutState';

beforeEach(() => {
  expect.hasAssertions();
  window.localStorage.clear();
});

function read(key: string): SerializedLayoutState | null {
  const raw = window.localStorage.getItem(key);
  return raw == null ? null : (JSON.parse(raw) as SerializedLayoutState);
}

describe('usePersistedLayoutState', () => {
  it('initializes from initial when storage is empty and writes it back', () => {
    const initial = stack('s', [panel('p1')]);
    const { result } = renderHook(() =>
      usePersistedLayoutState(initial, { key: 'test:a' })
    );
    expect(result.current.state.transforms).toEqual([]);
    expect(result.current.state.initial.id).toBe('s');
    // Effect runs after render and persists initial state
    expect(read('test:a')?.initial.id).toBe('s');
  });

  it('hydrates from storage on first render when present', () => {
    const stored: LayoutState = {
      initial: stack('stored', [panel('px')]),
      transforms: [{ kind: 'setActive', stackId: 'stored', panelId: 'px' }],
    };
    window.localStorage.setItem('test:b', JSON.stringify(stored));

    const fallback = stack('fallback', [panel('p1')]);
    const { result } = renderHook(() =>
      usePersistedLayoutState(fallback, { key: 'test:b' })
    );
    expect(result.current.state.initial.id).toBe('stored');
    expect(result.current.state.transforms).toHaveLength(1);
  });

  it('persists subsequent transforms', () => {
    const initial = stack('s', [panel('p1'), panel('p2')]);
    const { result } = renderHook(() =>
      usePersistedLayoutState(initial, { key: 'test:c' })
    );
    act(() => {
      result.current.dispatch({
        kind: 'setActive',
        stackId: 's',
        panelId: 'p2',
      });
    });
    expect(read('test:c')?.transforms).toEqual([
      { kind: 'setActive', stackId: 's', panelId: 'p2' },
    ]);
  });

  it('reset() clears storage and restores initial', () => {
    const initial = stack('s', [panel('p1'), panel('p2')]);
    const { result } = renderHook(() =>
      usePersistedLayoutState(initial, { key: 'test:d' })
    );
    act(() => {
      result.current.dispatch({
        kind: 'setActive',
        stackId: 's',
        panelId: 'p2',
      });
    });
    expect(window.localStorage.getItem('test:d')).not.toBeNull();
    expect(result.current.state.transforms).toHaveLength(1);

    act(() => {
      result.current.reset();
    });
    expect(result.current.state.transforms).toEqual([]);
    expect(result.current.state.initial.id).toBe('s');
    // Effect re-persists after reset, but with the cleared/initial state
    const after = read('test:d');
    expect(after?.transforms).toEqual([]);
    expect(after?.initial.id).toBe('s');
  });

  it('falls back to initial when stored value is malformed', () => {
    window.localStorage.setItem('test:e', '{not json');
    const initial = stack('s', [panel('p1')]);
    const { result } = renderHook(() =>
      usePersistedLayoutState(initial, { key: 'test:e' })
    );
    expect(result.current.state.initial.id).toBe('s');
  });

  it('skips persistence when storage is null', () => {
    const initial = stack('s', [panel('p1')]);
    const { result } = renderHook(() =>
      usePersistedLayoutState(initial, { key: 'test:f', storage: null })
    );
    act(() => {
      result.current.dispatch({
        kind: 'setActive',
        stackId: 's',
        panelId: 'p1',
      });
    });
    expect(window.localStorage.getItem('test:f')).toBeNull();
    expect(result.current.state.transforms).toHaveLength(1);
  });

  it('uses sessionStorage when supplied', () => {
    const initial = stack('s', [panel('p1')]);
    renderHook(() =>
      usePersistedLayoutState(initial, {
        key: 'test:g',
        storage: window.sessionStorage,
      })
    );
    expect(window.sessionStorage.getItem('test:g')).not.toBeNull();
    expect(window.localStorage.getItem('test:g')).toBeNull();
    window.sessionStorage.clear();
  });
});
