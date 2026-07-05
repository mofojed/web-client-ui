import type { LayoutState } from '../types';
import { applyTransforms, type ResolvedState } from './reducer';

/**
 * Fold all transforms into a fresh baseline. Returns a new state where
 * `transforms` is empty and `initial` is the current applied tree, with any
 * popouts captured on `popouts`.
 *
 * Use before persisting to keep stored payloads small, or whenever you want
 * to "checkpoint" the current layout.
 */
export function compact(state: LayoutState): LayoutState {
  if (state.transforms.length === 0) return state;
  const resolved = applyTransforms(
    state.initial,
    state.transforms,
    state.popouts ?? {},
    state.maximizedId ?? null
  );
  return {
    initial: resolved.root,
    transforms: [],
    popouts: resolved.popouts,
    maximizedId: resolved.maximizedId,
  };
}

/**
 * The current effective layout — the result of folding transforms over the
 * initial tree. Returns both the resolved tree and the current popouts map.
 */
export function resolveLayout(state: LayoutState): ResolvedState {
  return applyTransforms(
    state.initial,
    state.transforms,
    state.popouts ?? {},
    state.maximizedId ?? null
  );
}
