import { useCallback, useReducer } from 'react';
import type { LayoutNode, LayoutState, Transform } from '../types';
import { normalize } from '../state/normalize';

interface ReducerState {
  state: LayoutState;
}

type Action =
  | { type: 'transform'; transform: Transform }
  | { type: 'replace'; state: LayoutState };

function reducer(prev: ReducerState, action: Action): ReducerState {
  if (action.type === 'replace') {
    return { state: action.state };
  }
  return {
    state: {
      initial: prev.state.initial,
      transforms: [...prev.state.transforms, action.transform],
    },
  };
}

export interface UseLayoutStateResult {
  state: LayoutState;
  dispatch: (transform: Transform) => void;
  setState: (state: LayoutState) => void;
}

/**
 * Convenience hook for managing layout state in component-local React state.
 * Returns the current state plus a `dispatch` for appending a transform and
 * a `setState` for full replacement (e.g. after compaction or rehydration).
 */
export function useLayoutState(
  initial: LayoutNode | LayoutState
): UseLayoutStateResult {
  const [{ state }, send] = useReducer(reducer, undefined, () => ({
    state: toLayoutState(initial),
  }));

  const dispatch = useCallback((transform: Transform) => {
    send({ type: 'transform', transform });
  }, []);

  const setState = useCallback((next: LayoutState) => {
    send({ type: 'replace', state: next });
  }, []);

  return { state, dispatch, setState };
}

function toLayoutState(input: LayoutNode | LayoutState): LayoutState {
  if ('initial' in input && 'transforms' in input) {
    return input;
  }
  return {
    initial: normalize(input),
    transforms: [],
  };
}
