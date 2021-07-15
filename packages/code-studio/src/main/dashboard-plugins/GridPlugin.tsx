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
import {
  setDashboardColumns,
  setDashboardConsoleCreatorSettings,
  setDashboardInputFilters,
  setDashboardPanelTableMap,
  store,
} from '@deephaven/redux';
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
  IrisGridPanel,
  LogPanel,
  MarkdownPanel,
  NotebookPanel,
  PandasPanel,
  PanelManager,
} from '../../dashboard/panels';
import Linker from '../../dashboard/linker/Linker';
import { IrisGridEvent } from '../../dashboard/events';
import { IrisGridModel } from '@deephaven/iris-grid';
import shortid from 'shortid';
import LayoutUtils from '../../layout/LayoutUtils';

export const GridPlugin = ({
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
      IrisGridPanel.COMPONENT,
      (IrisGridPanel as unknown) as ComponentType,
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
      makeModel: () => IrisGridModel,
      metadata: Record<string, unknown> = {},
      panelId = shortid.generate(),
      dragEvent?: DragEvent
    ) => {
      const config = {
        type: 'react-component',
        component: IrisGridPanel.COMPONENT,
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
      const config = { component: IrisGridPanel.COMPONENT, id: panelId };
      const { root } = layout;
      LayoutUtils.closeComponent(root, config);
    },
    [id, layout]
  );

  useEffect(() => {
    registerComponents();
  }, [registerComponents]);

  useEffect(() => {
    layout.eventHub.on(IrisGridEvent.OPEN_GRID, handleOpen);
    layout.eventHub.on(IrisGridEvent.CLOSE_GRID, handleClose);
    return () => {
      layout.eventHub.off(IrisGridEvent.OPEN_GRID, handleOpen);
      layout.eventHub.off(IrisGridEvent.CLOSE_GRID, handleClose);
    };
  }, [handleClose, handleOpen, layout]);

  return null;
};

export default GridPlugin;
