import React, { DragEvent, useCallback, useEffect } from 'react';
import {
  DashboardPluginComponentProps,
  DashboardUtils,
  LayoutUtils,
  PanelEvent,
  PanelHydrateFunction,
  useListener,
} from '@deephaven/dashboard';
import {
  IrisGridModel,
  IrisGridModelFactory,
  IrisGridThemeType,
} from '@deephaven/iris-grid';
import { Table } from '@deephaven/jsapi-shim';
import shortid from 'shortid';
import { IrisGridPanel } from './panels';
import { IrisGridEvent } from './events';

export type GridPluginComponentProps = DashboardPluginComponentProps & {
  getDownloadWorker?: () => Promise<ServiceWorker>;
  loadPlugin?: (name: string) => ReturnType<typeof React.forwardRef>;
  hydrate: PanelHydrateFunction;
  theme?: Partial<IrisGridThemeType>;
};

export const GridPlugin = ({
  getDownloadWorker,
  loadPlugin,
  id,
  layout,
  registerComponent,
  hydrate = DashboardUtils.hydrate,
  theme,
}: GridPluginComponentProps): JSX.Element => {
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
          getDownloadWorker,
          loadPlugin,
          localDashboardId: id,
          id: panelId,
          metadata,
          makeModel,
          theme,
        },
        title,
        id: panelId,
      };

      const { root } = layout;
      LayoutUtils.openComponent({ root, config, dragEvent });
    },
    [getDownloadWorker, id, layout, loadPlugin, theme]
  );

  const handlePanelOpen = useCallback(
    ({ dragEvent, fetch, panelId = shortid.generate(), widget }) => {
      const { name, type } = widget;
      if (type !== dh.VariableType.TABLE) {
        return;
      }

      const metadata = { name, table: name };
      const makeModel = () =>
        fetch().then((table: Table) => IrisGridModelFactory.makeModel(table));
      const config = {
        type: 'react-component',
        component: IrisGridPanel.COMPONENT,
        props: {
          getDownloadWorker,
          loadPlugin,
          localDashboardId: id,
          id: panelId,
          metadata,
          makeModel,
          theme,
        },
        title: name,
        id: panelId,
      };

      const { root } = layout;
      LayoutUtils.openComponent({ root, config, dragEvent });
    },
    [getDownloadWorker, id, layout, loadPlugin, theme]
  );

  const handleClose = useCallback(
    (panelId: string) => {
      const config = { component: IrisGridPanel.COMPONENT, id: panelId };
      const { root } = layout;
      LayoutUtils.closeComponent(root, config);
    },
    [layout]
  );

  useEffect(() => {
    const cleanups = [
      registerComponent(IrisGridPanel.COMPONENT, IrisGridPanel, hydrate),
    ];
    return () => {
      cleanups.forEach(cleanup => cleanup());
    };
  }, [hydrate, registerComponent]);

  useListener(layout.eventHub, IrisGridEvent.OPEN_GRID, handleOpen);
  useListener(layout.eventHub, IrisGridEvent.CLOSE_GRID, handleClose);
  useListener(layout.eventHub, PanelEvent.OPEN, handlePanelOpen);

  return <></>;
};

export default GridPlugin;
