import { useContext } from 'react';
import type { EventEmitter } from '@deephaven/golden-layout';
import LayoutManagerContext from './LayoutManagerContext';

/**
 * Retrieve the event hub from the current LayoutManager, if one is available.
 *
 * Unlike {@link useLayoutManager}, this does not throw when there is no
 * LayoutManager in the tree - it returns `undefined` instead. This lets
 * components that only participate in dashboard-level events (input filters,
 * links, etc.) render outside of a golden-layout `Dashboard` and simply skip
 * those integrations.
 * @returns The event hub for the current LayoutManager, or undefined if there
 *          is no LayoutManager in the tree.
 */
export function useEventHub(): EventEmitter | undefined {
  return useContext(LayoutManagerContext)?.eventHub;
}

export default useEventHub;
