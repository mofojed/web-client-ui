import type { LayoutNode, LayoutState } from '../types';
import { normalize } from '../state/normalize';

/**
 * Build an initial `LayoutState` from a tree, normalizing it. Useful when
 * authoring layouts inline.
 */
export default function createLayoutState(initial: LayoutNode): LayoutState {
  return {
    initial: normalize(initial),
    transforms: [],
  };
}
