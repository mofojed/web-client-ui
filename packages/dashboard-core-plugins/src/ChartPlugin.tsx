import {
  assertIsDashboardPluginProps,
  DashboardPluginComponentProps,
  PanelHydrateFunction,
  useComponent,
} from '@deephaven/dashboard';
import { ChartPanel, ChartPanelProps } from './panels';

export type ChartPluginProps = Partial<DashboardPluginComponentProps> & {
  hydrate: PanelHydrateFunction<ChartPanelProps>;
};

export function ChartPlugin(props: ChartPluginProps): JSX.Element | null {
  assertIsDashboardPluginProps(props);
  const { hydrate } = props;
  useComponent(
    props,
    ChartPanel.COMPONENT,
    ChartPanel,
    dh.VariableType.FIGURE,
    // TODO: Need to clean up... the component we pass in is the connected redux component type, but then the hydrate function takes the props from the dehydrated iris grid panel props...
    hydrate as any
  );

  return null;
}

export default ChartPlugin;
