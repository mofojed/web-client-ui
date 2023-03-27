import {
  assertIsDashboardPluginProps,
  DashboardPluginComponentProps,
  PanelHydrateFunction,
  useComponent,
} from '@deephaven/dashboard';
import { IrisGridPanel, IrisGridPanelProps } from './panels';

const SUPPORTED_TYPES: string[] = [
  dh.VariableType.TABLE,
  dh.VariableType.TREETABLE,
  dh.VariableType.HIERARCHICALTABLE,
];

export type GridPluginProps = Partial<DashboardPluginComponentProps> & {
  hydrate: PanelHydrateFunction<IrisGridPanelProps>;
};

export function GridPlugin(props: GridPluginProps): JSX.Element | null {
  assertIsDashboardPluginProps(props);
  const { hydrate } = props;
  useComponent(
    props,
    IrisGridPanel.COMPONENT,
    IrisGridPanel,
    SUPPORTED_TYPES,
    // TODO: Need to clean up... the component we pass in is the connected redux component type, but then the hydrate function takes the props from the dehydrated iris grid panel props...
    hydrate as any
  );

  return null;
}

export default GridPlugin;
