import React, { useCallback, useEffect } from 'react';
import { ChartModelFactory } from '@deephaven/chart';
import {
  DashboardPluginComponentProps,
  DashboardUtils,
  LayoutUtils,
  PanelEvent,
  PanelHydrateFunction,
  useListener,
} from '@deephaven/dashboard';
import { Figure } from '@deephaven/jsapi-shim';
import shortid from 'shortid';
import { ChartPanel } from './panels';

export type ChartPluginComponentProps = DashboardPluginComponentProps & {
  hydrate: PanelHydrateFunction;
};

export const ChartPlugin = ({
  id,
  layout,
  registerComponent,
  hydrate = DashboardUtils.hydrate,
}: ChartPluginComponentProps): JSX.Element => {
  const handlePanelOpen = useCallback(
    ({ dragEvent, fetch, panelId = shortid.generate(), widget }) => {
      const { name, type } = widget;
      if (type !== dh.VariableType.FIGURE) {
        return;
      }

      const metadata = { name, figure: name };
      const makeModel = () =>
        fetch().then((figure: Figure) =>
          ChartModelFactory.makeModel(undefined, figure)
        );
      const config = {
        type: 'react-component',
        component: ChartPanel.COMPONENT,
        props: {
          localDashboardId: id,
          id: panelId,
          metadata,
          makeModel,
        },
        title: name,
        id: panelId,
      };

      const { root } = layout;
      LayoutUtils.openComponent({ root, config, dragEvent });
    },
    [id, layout]
  );

  useEffect(() => {
    const cleanups = [
      registerComponent(ChartPanel.COMPONENT, ChartPanel, hydrate),
    ];
    return () => {
      cleanups.forEach(cleanup => cleanup());
    };
  }, [hydrate, registerComponent]);

  useListener(layout.eventHub, PanelEvent.OPEN, handlePanelOpen);

  return <></>;
};

export default ChartPlugin;
