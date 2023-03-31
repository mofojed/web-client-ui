import { Component, ComponentType } from 'react';
import { ConnectedComponent } from 'react-redux';
import GoldenLayout from '@deephaven/golden-layout';
import type {
  ReactComponentConfig,
  EventEmitter,
  Container,
} from '@deephaven/golden-layout';
import PanelManager from './PanelManager';

export type WrappedComponentType<
  P extends PanelProps,
  C extends ComponentType<P>
> = ConnectedComponent<C, P>;

export type PanelComponentType<
  P extends PanelProps = PanelProps,
  C extends ComponentType<P> = ComponentType<P>
> = ComponentType<P> | WrappedComponentType<P, C>;

export function isWrappedComponent<
  P extends PanelProps,
  C extends ComponentType<P>
>(type: PanelComponentType<P, C>): type is WrappedComponentType<P, C> {
  return (type as WrappedComponentType<P, C>)?.WrappedComponent !== undefined;
}

export type WidgetPanelMetadata = {
  name: string;
  type: string;
};

export function isWidgetPanelMetadata(
  metadata: unknown
): metadata is WidgetPanelMetadata {
  return (
    metadata != null &&
    typeof metadata === 'object' &&
    (metadata as WidgetPanelMetadata).name !== undefined &&
    (metadata as WidgetPanelMetadata).type !== undefined
  );
}

export type PanelProps = {
  glContainer: Container;
  glEventHub: EventEmitter;
  metadata?: unknown;
  panelState?: unknown;
};

export type PanelComponent<T extends PanelProps = PanelProps> = Component<T>;

export type DehydratedPanelConfig<
  P extends Record<string, unknown> = Record<string, unknown>,
  S extends Record<string, unknown> = Record<string, unknown>
> = ReactComponentConfig<P> & {
  props: P;
  componentState?: S | null;
};

export type PanelConfig<
  P extends PanelProps = PanelProps,
  S extends Record<string, unknown> = Record<string, unknown>
> = DehydratedPanelConfig<P, S>;

export type DashboardConfig = {
  id: string;
  layout: GoldenLayout;
  panelManager: PanelManager;
};

export interface DashboardPanelDefinition {
  name: string;
  definition: ComponentType;
}

export type DeregisterComponentFunction = () => void;

export type PanelHydrateFunction<
  P extends Record<string, unknown> = Record<string, unknown>,
  R extends Record<string, unknown> = P
> = (props: P, dashboardId: string) => R;

export type PanelDehydrateFunction<
  P extends PanelProps = PanelProps,
  R extends Record<string, unknown> = Record<string, unknown>
> = (
  config: PanelConfig<P>,
  dashboardId: string
) => DehydratedPanelConfig<R> | null;

export type DashboardPluginComponentProps = {
  id: string;
  layout: GoldenLayout;
  panelManager: PanelManager;
  registerComponent: <
    P extends PanelProps,
    C extends ComponentType<P>,
    H extends Record<string, unknown> = Record<string, unknown>,
    D extends Record<string, unknown> = Record<string, unknown>
  >(
    name: string,
    ComponentType: PanelComponentType<P, C>,
    hydrate?: PanelHydrateFunction<Partial<D>, Partial<H>>,
    dehydrate?: PanelDehydrateFunction<P, D>
  ) => DeregisterComponentFunction;
};

export interface DashboardPlugin {
  panels?: DashboardPanelDefinition[];

  /** Hydrate the provided panel and props. Return the same object if no changes made. */
  hydrateComponent?: (name: string, props: PanelProps) => PanelProps;

  /** Dehydrate a component. Return the same object if no changes made, or `null` if the component should not be saved */
  dehydrateComponent?: (
    name: string,
    config: PanelConfig
  ) => PanelConfig | null;

  /** Called when the dashboard is initialized and layout is ready. */
  initialize?: (config: DashboardConfig) => void;

  /** Called when the dashboard is unintialized and layout is about to be destroyed */
  deinitialize?: (config: DashboardConfig) => void;
}

/**
 * Takes a partial DashboardPluginComponentProps and verifies all the dashboard component fields are filled in.
 * @param props The props to check
 * @returns True if the props are valid DashboardPluginComponentProps, false otherwise
 */
export function isDashboardPluginProps(
  props: Partial<DashboardPluginComponentProps>
): props is DashboardPluginComponentProps {
  return (
    typeof props.id === 'string' &&
    props.layout instanceof GoldenLayout &&
    props.panelManager instanceof PanelManager &&
    typeof props.registerComponent === 'function'
  );
}

export function assertIsDashboardPluginProps(
  props: Partial<DashboardPluginComponentProps>
): asserts props is DashboardPluginComponentProps {
  if (!isDashboardPluginProps(props)) {
    throw new Error(
      `Expected dashboard plugin props, but instead received ${props}`
    );
  }
}
