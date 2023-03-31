import {
  DehydratedPanelConfig,
  PanelConfig,
  PanelProps,
} from './DashboardPlugin';

export type DashboardPanelProps = PanelProps & {
  localDashboardId: string;
};

/**
 * Dehydrate an existing panel to allow it to be serialized/saved.
 * Just takes what's in the panels `metadata` in the props and `panelState` in
 * the component state, assumes it's serializable, and saves it.
 * @param config The panel config to dehydrate
 * @returns The dehydrated PanelConfig
 */
export function dehydrate(config: PanelConfig): DehydratedPanelConfig | null {
  const { props, componentState } = config;
  const { metadata } = props;
  let { panelState = null } = props;
  if (componentState != null) {
    const componentPanelState = componentState.panelState;
    if (componentPanelState != null) {
      panelState = componentPanelState as Record<string, unknown>;
    }
  }
  const newProps: Record<string, unknown> = {};
  if (metadata != null) {
    newProps.metadata = metadata;
  }
  if (panelState != null) {
    newProps.panelState = panelState;
  }

  return {
    ...config,
    componentState: null,
    props: newProps,
    type: 'react-component',
  };
}

/**
 * Default hydration function. Just applies the dashboard ID. When used with dehydrate above,
 * the panels state will be stored in `panelState` prop.
 * @param props Panel props to hydrate
 * @param localDashboardId The local dashboard ID to hydrate the panel with
 * @returns The hydrated panel props
 */
export function hydrate<T = DashboardPanelProps>(
  props: Partial<T>,
  localDashboardId = ''
): Partial<T> {
  return {
    metadata: {},
    ...props,
    localDashboardId,
  };
}

export default {
  dehydrate,
  hydrate,
};
