import { useCallback, useEffect } from 'react';
import {
  assertIsDashboardPluginProps,
  DashboardPluginComponentProps,
  LayoutUtils,
  PanelEvent,
  PanelHydrateFunction,
  useComponent,
  useListener,
} from '@deephaven/dashboard';
import { IrisGridModelFactory } from '@deephaven/iris-grid';
import { Table } from '@deephaven/jsapi-shim';
import shortid from 'shortid';
import { PandasPanel, PandasPanelProps } from './panels';

export type PandasPluginProps = Partial<DashboardPluginComponentProps> & {
  hydrate: PanelHydrateFunction<PandasPanelProps>;
};

export function PandasPlugin(props: PandasPluginProps): JSX.Element | null {
  assertIsDashboardPluginProps(props);
  const { hydrate, id, layout, registerComponent } = props;

  useComponent(
    props,
    PandasPanel.COMPONENT,
    PandasPanel,
    dh.VariableType.PANDAS,
    hydrate
  );

  return null;
}

export default PandasPlugin;
