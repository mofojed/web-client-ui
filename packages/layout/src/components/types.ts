import type { ComponentType, ReactNode } from 'react';
import type { LayoutState, NodeId, PanelNode, Transform } from '../types';

/**
 * Props passed to the consumer's panel content component.
 */
export interface PanelContentProps {
  panel: PanelNode;
  /** Whether this panel is the visible tab in its stack. */
  isActive: boolean;
  /** Whether the dashboard is in edit mode. */
  editMode: boolean;
  /** Save the panel's serializable state. Dispatches `updatePanelState`. */
  setState: (state: unknown) => void;
}

/**
 * Props passed to the optional `renderTab` / `renderTabTooltip` functions.
 */
export interface TabRenderProps {
  panel: PanelNode;
  isActive: boolean;
  editMode: boolean;
}

export interface PanelDefinition {
  /** The component that renders the panel's content. */
  component: ComponentType<PanelContentProps>;
  /** Optional override for the tab label. Defaults to `panel.title ?? panel.id`. */
  renderTab?: (props: TabRenderProps) => ReactNode;
  /** Optional tooltip rendered when hovering the tab. */
  renderTabTooltip?: (props: TabRenderProps) => ReactNode;
  /** When false, hides the close button on this panel's tab. Default true. */
  isClosable?: boolean;
}

export type PanelRegistry = Record<string, PanelDefinition>;

/**
 * Internal context for child components — never exported.
 */
export interface LayoutContextValue {
  state: LayoutState;
  dispatch: (transform: Transform) => void;
  components: PanelRegistry;
  editMode: boolean;
  /**
   * The id of the panel a consumer is dragging in the source location, if any.
   * Used in Phase 4 for visual feedback. Null in Phase 2/3.
   */
  draggingPanelId: NodeId | null;
  /**
   * The id of the panel within this dashboard whose content currently has
   * focus, or null if no panel in this dashboard is focused. Determined
   * relative to *this* dashboard's tree, so a focus inside a nested
   * Dashboard does not mark the outer host panel as focused.
   */
  focusedPanelId: NodeId | null;
  /**
   * Returns a persistent DOM element used as the host for a panel's
   * content. Panel slots append this host as a child via their ref so the
   * portaled React content stays mounted across rearrangements.
   */
  getPanelHost: (panelId: NodeId) => HTMLDivElement;
  /**
   * The panel currently maximized to fill this dashboard, or null. Nested
   * dashboards each track their own maximized panel.
   */
  maximizedId: NodeId | null;
  /** Maximize the panel if not already maximized, otherwise restore it. */
  toggleMaximize: (panelId: NodeId) => void;
  /** Set (or clear, with null) the maximized panel of this dashboard. */
  setMaximized: (panelId: NodeId | null) => void;
  /**
   * Whether this dashboard sits on the active maximized branch (true for the
   * outermost dashboard; for a nested one, true only when its host panel is
   * the maximized panel of an active-branch parent).
   */
  branchActive: boolean;
  /** Nesting depth of this dashboard (0 for the outermost). */
  depth: number;
}
