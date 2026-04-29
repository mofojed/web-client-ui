import type { LayoutState } from '../types';
import { applyTransforms } from './reducer';

/**
 * Fold all transforms into a fresh baseline. Returns a new state where
 * `transforms` is empty and `initial` is the current applied tree.
 *
 * Use before persisting to keep stored payloads small, or whenever you want
 * to "checkpoint" the current layout.
 */
export function compact(state: LayoutState): LayoutState {
  if (state.transforms.length === 0) return state;
  return {
    initial: applyTransforms(state.initial, state.transforms),
    transforms: [],
  };
}

/**
 * The current effective layout — the result of folding transforms over the
 * initial tree. Equivalent to `compact(state).initial`.
 */
export function resolveLayout(state: LayoutState): LayoutState['initial'] {
  return applyTransforms(state.initial, state.transforms);
}
