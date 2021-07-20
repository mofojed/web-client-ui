import React, { ComponentType, DragEvent, useCallback, useEffect } from 'react';
import { DashboardPluginComponentProps } from '../../dashboard/DashboardPlugin';
import {
  ConsolePanel,
  CommandHistoryPanel,
  FileExplorerPanel,
  LogPanel,
} from '../../dashboard/panels';
import { ConsoleEvent } from '../../dashboard/events';
import shortid from 'shortid';
import LayoutUtils from '../../layout/LayoutUtils';

export const ConsolePlugin = ({
  id,
  layout,
  registerComponent,
}: DashboardPluginComponentProps): JSX.Element => {
  const hydrate = useCallback(
    props => ({
      ...props,
      localDashboardId: id,
    }),
    [id]
  );

  const hydrateWithMetadata = useCallback(
    props => ({
      metadata: {},
      ...props,
      localDashboardId: id,
    }),
    [id]
  );

  // TODO: Actually dehydrate correctly
  const dehydrate = useCallback(props => null, []);

  const registerComponents = useCallback(() => {
    registerComponent(
      ConsolePanel.COMPONENT,
      (ConsolePanel as unknown) as ComponentType,
      hydrateWithMetadata,
      dehydrate
    );
    registerComponent(
      CommandHistoryPanel.COMPONENT,
      (CommandHistoryPanel as unknown) as ComponentType,
      hydrate,
      dehydrate
    );
    registerComponent(
      FileExplorerPanel.COMPONENT,
      (FileExplorerPanel as unknown) as ComponentType,
      hydrate,
      dehydrate
    );
    registerComponent(
      LogPanel.COMPONENT,
      (LogPanel as unknown) as ComponentType,
      hydrate,
      dehydrate
    );
  }, [dehydrate, hydrate, registerComponent]);

  useEffect(() => {
    registerComponents();
  }, [registerComponents]);

  // useEffect(() => {
  //   layout.eventHub.on(IrisGridEvent.OPEN_GRID, handleOpen);
  //   layout.eventHub.on(IrisGridEvent.CLOSE_GRID, handleClose);
  //   return () => {
  //     layout.eventHub.off(IrisGridEvent.OPEN_GRID, handleOpen);
  //     layout.eventHub.off(IrisGridEvent.CLOSE_GRID, handleClose);
  //   };
  // }, [handleClose, handleOpen, layout]);

  return <></>;
};

export default ConsolePlugin;
