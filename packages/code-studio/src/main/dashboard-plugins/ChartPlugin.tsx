import React, {
  ComponentType,
  DragEvent,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import PropTypes from 'prop-types';
import GoldenLayout from 'golden-layout';
import { ChartModel } from '@deephaven/chart';
import {
  setDashboardColumns,
  setDashboardConsoleCreatorSettings,
  setDashboardInputFilters,
  setDashboardPanelTableMap,
  store,
} from '@deephaven/redux';
import shortid from 'shortid';
import MarkdownUtils from '../../controls/markdown/MarkdownUtils';
import {
  DashboardConfig,
  DashboardPlugin,
  DashboardPluginComponentProps,
  PanelConfig,
  PanelProps,
} from '../../dashboard/DashboardPlugin';
import {
  ChartEventHandler,
  ConsoleEventHandler,
  ControlEventHandler,
  InputFilterEventHandler,
  IrisGridEventHandler,
  NotebookEventHandler,
  PandasEventHandler,
} from '../../dashboard/event-handlers';
import {
  ChartPanel,
  CommandHistoryPanel,
  ConsolePanel,
  DropdownFilterPanel,
  FileExplorerPanel,
  InputFilterPanel,
  LogPanel,
  MarkdownPanel,
  NotebookPanel,
  PandasPanel,
  PanelManager,
} from '../../dashboard/panels';
import Linker from '../../dashboard/linker/Linker';
import { ChartEvent, IrisGridEvent } from '../../dashboard/events';
import LayoutUtils from '../../layout/LayoutUtils';

export const ChartPlugin = ({
  id,
  layout,
  panelManager,
  registerComponent,
}: DashboardPluginComponentProps): JSX.Element => {
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
  }, [
    dehydrateDefault,
    hydrateDefault,
    hydrateWithMetadata,
    registerComponent,
  ]);

  const handleOpen = useCallback(
    (
      title: string,
      makeModel: () => ChartModel,
      metadata: Record<string, unknown> = {},
      panelId = shortid.generate(),
      dragEvent?: DragEvent
    ) => {
      const config = {
        type: 'react-component',
        component: ChartPanel.COMPONENT,
        props: {
          localDashboardId: id,
          id: panelId,
          metadata,
          makeModel,
        },
        title,
        id,
      };

      const { root } = layout;
      LayoutUtils.openComponent({ root, config, dragEvent });
    },
    [id, layout]
  );

  const handleClose = useCallback(
    (panelId: string) => {
      const config = { component: ChartPanel.COMPONENT, id: panelId };
      const { root } = layout;
      LayoutUtils.closeComponent(root, config);
    },
    [id, layout]
  );

  useEffect(() => {
    registerComponents();
  }, [registerComponents]);

  useEffect(() => {
    layout.eventHub.on(ChartEvent.OPEN, handleOpen);
    layout.eventHub.on(ChartEvent.CLOSE, handleClose);
    return () => {
      layout.eventHub.off(ChartEvent.OPEN, handleOpen);
      layout.eventHub.off(ChartEvent.CLOSE, handleClose);
    };
  }, [handleClose, handleOpen, layout]);

  return <></>;
};

export default ChartPlugin;
