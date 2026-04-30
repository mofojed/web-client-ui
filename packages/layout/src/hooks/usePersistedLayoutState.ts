import { useCallback, useEffect, useRef } from 'react';
import Log from '@deephaven/log';
import type {
  DehydrateOptions,
  HydrateOptions,
  LayoutNode,
  LayoutState,
  SerializedLayoutState,
} from '../types';
import { dehydrate, hydrate } from '../state/hydrate';
import { normalize } from '../state/normalize';
import { useLayoutState, type UseLayoutStateResult } from './useLayoutState';

const log = Log.module('@deephaven/layout/usePersistedLayoutState');

export interface UsePersistedLayoutStateOptions {
  /** Storage key under which the serialized state is written. */
  key: string;
  /**
   * Storage backend. Defaults to `localStorage` when available. Pass
   * `sessionStorage` to scope persistence to the tab/session, or any other
   * `Storage`-shaped object. If unavailable (e.g. SSR, disabled cookies),
   * persistence is skipped silently.
   */
  storage?: Storage | null;
  dehydrateOptions?: DehydrateOptions;
  hydrateOptions?: HydrateOptions;
}

export interface UsePersistedLayoutStateResult extends UseLayoutStateResult {
  /** Reset to the initial layout and remove the persisted entry. */
  reset: () => void;
}

function getDefaultStorage(): Storage | null {
  if (typeof window === 'undefined') return null;
  try {
    return window.localStorage;
  } catch {
    return null;
  }
}

function readStored(
  storage: Storage | null,
  key: string,
  hydrateOptions?: HydrateOptions
): LayoutState | null {
  if (storage == null) return null;
  let raw: string | null;
  try {
    raw = storage.getItem(key);
  } catch (e) {
    log.warn('Failed to read persisted layout state:', e);
    return null;
  }
  if (raw == null) return null;
  try {
    const parsed = JSON.parse(raw) as SerializedLayoutState;
    return hydrate(parsed, hydrateOptions);
  } catch (e) {
    log.warn('Failed to parse persisted layout state, ignoring:', e);
    return null;
  }
}

function writeStored(
  storage: Storage | null,
  key: string,
  state: LayoutState,
  dehydrateOptions?: DehydrateOptions
): void {
  if (storage == null) return;
  try {
    const serialized = dehydrate(state, dehydrateOptions);
    storage.setItem(key, JSON.stringify(serialized));
  } catch (e) {
    log.warn('Failed to persist layout state:', e);
  }
}

function clearStored(storage: Storage | null, key: string): void {
  if (storage == null) return;
  try {
    storage.removeItem(key);
  } catch (e) {
    log.warn('Failed to clear persisted layout state:', e);
  }
}

/**
 * Like {@link useLayoutState}, but persists the current state to a `Storage`
 * (default `localStorage`) on every change so a refresh restores it.
 *
 * On first render, attempts to load and hydrate the stored state. If parsing
 * fails or storage is unavailable, falls back to the supplied `initial`.
 *
 * The returned `reset()` clears the persisted entry and replaces state with
 * the original `initial`. Use this for an explicit "reset layout" affordance.
 */
export function usePersistedLayoutState(
  initial: LayoutNode | LayoutState,
  options: UsePersistedLayoutStateOptions
): UsePersistedLayoutStateResult {
  const { key, dehydrateOptions, hydrateOptions } = options;

  const storageRef = useRef<Storage | null | undefined>(undefined);
  if (storageRef.current === undefined) {
    storageRef.current =
      options.storage === undefined ? getDefaultStorage() : options.storage;
  }
  const storage = storageRef.current;

  const initialRef = useRef(initial);

  const seedRef = useRef<LayoutNode | LayoutState | undefined>(undefined);
  if (seedRef.current === undefined) {
    seedRef.current = readStored(storage, key, hydrateOptions) ?? initial;
  }

  const { state, dispatch, setState } = useLayoutState(seedRef.current);

  useEffect(() => {
    writeStored(storage, key, state, dehydrateOptions);
  }, [storage, key, state, dehydrateOptions]);

  const reset = useCallback(() => {
    clearStored(storage, key);
    const seed = initialRef.current;
    if ('initial' in seed && 'transforms' in seed) {
      setState(seed);
    } else {
      setState({ initial: normalize(seed), transforms: [] });
    }
  }, [storage, key, setState]);

  return { state, dispatch, setState, reset };
}
