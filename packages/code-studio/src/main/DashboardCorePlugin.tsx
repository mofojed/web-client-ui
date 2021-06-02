import React, {
  ComponentType,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import PropTypes from 'prop-types';
import GoldenLayout from 'golden-layout';
import {
  setDashboardColumns,
  setDashboardConsoleCreatorSettings,
  setDashboardInputFilters,
  setDashboardPanelTableMap,
  store,
} from '@deephaven/redux';
import MarkdownUtils from '../controls/markdown/MarkdownUtils';
import {
  DashboardConfig,
  DashboardPlugin,
  PanelConfig,
  PanelProps,
} from '../dashboard/DashboardPlugin';
import {
  ChartEventHandler,
  ConsoleEventHandler,
  ControlEventHandler,
  InputFilterEventHandler,
  IrisGridEventHandler,
  NotebookEventHandler,
  PandasEventHandler,
} from '../dashboard/event-handlers';
import {
  ChartPanel,
  CommandHistoryPanel,
  ConsolePanel,
  DropdownFilterPanel,
  InputFilterPanel,
  IrisGridPanel,
  LogPanel,
  MarkdownPanel,
  NotebookPanel,
  PandasPanel,
} from '../dashboard/panels';
import { DashboardPluginComponentProps } from '../dashboard/DashboardPlugin';
import Linker from '../dashboard/linker/Linker';

export const DashboardCorePlugin = ({
  id,
  layout,
  panelManager,
  registerComponent,
}: DashboardPluginComponentProps): React.ReactNode => {
  const hydrateWithMetadata = useCallback(
    props => ({
      metadata: {},
      ...props,
      localDashboardId: id,
    }),
    [id]
  );
  const hydrateDefault = useCallback(
    props => ({
      ...props,
      localDashboardId: id,
    }),
    [id]
  );
  // TODO: Actually dehydrate correctly
  const dehydrateDefault = useCallback(props => null, []);

  const registerComponents = useCallback(() => {
    registerComponent(
      ChartPanel.COMPONENT,
      (ChartPanel as unknown) as ComponentType,
      hydrateDefault,
      dehydrateDefault
    );
    registerComponent(
      ConsolePanel.COMPONENT,
      ConsolePanel as ComponentType,
      hydrateWithMetadata,
      dehydrateDefault
    );
    registerComponent(
      CommandHistoryPanel.COMPONENT,
      (CommandHistoryPanel as unknown) as ComponentType,
      hydrateDefault,
      dehydrateDefault
    );
    // TODO: Add all the types
    registerComponent(
      IrisGridPanel.COMPONENT,
      (IrisGridPanel as unknown) as ComponentType,
      hydrateDefault,
      dehydrateDefault
    );
    registerComponent(
      LogPanel.COMPONENT,
      LogPanel,
      hydrateDefault,
      dehydrateDefault
    );
  }, [registerComponent]);

  useEffect(() => {
    registerComponents();
  }, [registerComponents]);

  return null;
  // return (
  //  Need to figure out TypeScript errors with redux connected component here...
  //   <Linker layout={layout} localDashboardId={id} panelManager={panelManager} />
  // );
};

export default DashboardCorePlugin;
