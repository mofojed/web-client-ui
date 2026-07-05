/* eslint-disable react-refresh/only-export-components */
import type { ReactNode } from 'react';
import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
} from 'react';
import type { DropTarget, PanelNode } from '../types';

/**
 * Describes the maximize "branch" a nested dashboard is rendered on. Provided
 * around each panel's content (see `PanelContentMount`) so a `Dashboard`
 * rendered inside a panel knows its nesting depth and whether it sits on the
 * currently maximized path.
 */
export interface PanelBranch {
  /**
   * True when the dashboard rendered in this panel's content is on the active
   * maximized path — i.e. every ancestor dashboard up to the root has this
   * panel (or its ancestors) as its maximized panel. The outermost dashboard
   * is always active.
   */
  activeBranch: boolean;
  /** Nesting depth of the dashboard rendered in this panel's content. */
  depth: number;
  /**
   * Ask the parent chain to maximize this panel's host all the way up, so the
   * dashboard rendered in this panel's content fills the whole layout. Called
   * by a nested dashboard when one of its own panels is maximized.
   */
  requestMaximize: () => void;
  /** Inverse of {@link requestMaximize}: restore this panel's host chain. */
  requestRestore: () => void;
}

export const PanelBranchContext = createContext<PanelBranch | null>(null);

export type AddPanelFn = (panel: PanelNode, target?: DropTarget) => void;

interface DashboardEntry {
  depth: number;
  /**
   * The breadcrumb crumb contributed by this dashboard's maximized panel, or
   * null when this dashboard has nothing maximized / is off the active branch.
   */
  crumb: { title: string; clear: () => void } | null;
  /**
   * Non-null only for the active-branch leaf dashboard (active branch, nothing
   * maximized). This is where sidebar "add" actions should land.
   */
  addPanel: AddPanelFn | null;
}

/**
 * Stable action handles for registering/unregistering a dashboard. Kept
 * separate from the entries map so the registration effect can depend on
 * these without re-running every time the entries change (which would loop).
 */
interface MaximizeActions {
  set: (id: string, entry: DashboardEntry) => void;
  remove: (id: string) => void;
}

const MaximizeActionsContext = createContext<MaximizeActions | null>(null);
const MaximizeEntriesContext = createContext<Map<
  string,
  DashboardEntry
> | null>(null);

export interface MaximizeProviderProps {
  children: ReactNode;
}

/**
 * Shares maximize/zoom state across a tree of nested `Dashboard`s. Wrap the
 * outermost dashboard (and any breadcrumb UI that reads `useMaximizeChain`)
 * in this. Nested dashboards discover it through React context — even across
 * the content portals — and register their own maximize state into it.
 *
 * Maximize *rendering* (the full-panel overlay + tab double-click) works
 * without this provider; it only gates the cross-dashboard breadcrumb and the
 * "add to the maximized dashboard" routing.
 */
export function MaximizeProvider({
  children,
}: MaximizeProviderProps): JSX.Element {
  const [entries, setEntries] = useState<Map<string, DashboardEntry>>(
    () => new Map()
  );

  const set = useCallback((id: string, entry: DashboardEntry) => {
    setEntries(prev => {
      const next = new Map(prev);
      next.set(id, entry);
      return next;
    });
  }, []);

  const remove = useCallback((id: string) => {
    setEntries(prev => {
      if (!prev.has(id)) return prev;
      const next = new Map(prev);
      next.delete(id);
      return next;
    });
  }, []);

  const actions = useMemo<MaximizeActions>(
    () => ({ set, remove }),
    [set, remove]
  );

  return (
    <MaximizeActionsContext.Provider value={actions}>
      <MaximizeEntriesContext.Provider value={entries}>
        {children}
      </MaximizeEntriesContext.Provider>
    </MaximizeActionsContext.Provider>
  );
}

/** Stable register/unregister handles, or null when outside a provider. */
export function useMaximizeActions(): MaximizeActions | null {
  return useContext(MaximizeActionsContext);
}

export interface BreadcrumbSegment {
  title: string;
}

export interface MaximizeChain {
  /**
   * Ordered crumbs from the outermost maximized dashboard inward. Empty when
   * nothing is maximized.
   */
  segments: BreadcrumbSegment[];
  /**
   * Zoom out to a crumb: clears every maximized dashboard deeper than `index`.
   * Pass `-1` (Home) to clear everything.
   */
  zoomTo: (index: number) => void;
  /** Add a panel to the currently maximized (active-branch leaf) dashboard. */
  addToActiveDashboard: AddPanelFn;
}

/**
 * Read the current maximize breadcrumb chain and the actions to navigate it.
 * Must be called inside a {@link MaximizeProvider}; returns an empty chain
 * otherwise.
 */
export function useMaximizeChain(): MaximizeChain {
  const entries = useContext(MaximizeEntriesContext);

  return useMemo<MaximizeChain>(() => {
    // Entries sorted by depth so the chain reads outermost-first.
    const all = (entries != null ? [...entries.values()] : []).sort(
      (a, b) => a.depth - b.depth
    );
    const crumbs = all
      .map(e => e.crumb)
      .filter((c): c is NonNullable<DashboardEntry['crumb']> => c != null);
    const clears = crumbs.map(c => c.clear);
    const segments = crumbs.map(c => ({ title: c.title }));
    const leaf = all.find(e => e.addPanel != null);

    return {
      segments,
      zoomTo: (index: number) => {
        // Clear from the deepest crumb inward, stopping at the clicked index
        // (which stays maximized). Home passes -1 to clear all.
        for (let i = clears.length - 1; i > index; i -= 1) {
          clears[i]();
        }
      },
      addToActiveDashboard: (panel, target) => {
        leaf?.addPanel?.(panel, target);
      },
    };
  }, [entries]);
}
