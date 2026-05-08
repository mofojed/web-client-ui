import React, { useEffect } from 'react';
import {
  assertIsDashboardPluginProps,
  type DashboardPluginComponentProps,
} from '@deephaven/dashboard';
import Linker from './linker/Linker';
import DashboardLinkerProvider from './linker/DashboardLinkerProvider';

export type LinkerPluginProps = Partial<DashboardPluginComponentProps>;

export function LinkerPlugin(props: LinkerPluginProps): JSX.Element {
  assertIsDashboardPluginProps(props);
  const { id, layout, panelManager, registerWrapper } = props;

  useEffect(
    () => registerWrapper(DashboardLinkerProvider),
    [registerWrapper]
  );

  return (
    <Linker layout={layout} localDashboardId={id} panelManager={panelManager} />
  );
}

export default LinkerPlugin;
