import React, { useMemo } from 'react';
import usePlugins from './usePlugins';
import { isWidgetPlugin, type WidgetComponentProps } from './PluginTypes';

export type WidgetViewProps = WidgetComponentProps & {
  /** Type of the widget */
  type: string;
};

export function WidgetView({
  fetch,
  type,
  metadata,
}: WidgetViewProps): JSX.Element {
  const plugins = usePlugins();
  const plugin = useMemo(
    () =>
      [...plugins.values()]
        .filter(isWidgetPlugin)
        .find(p => [p.supportedTypes].flat().includes(type)),
    [plugins, type]
  );

  if (plugin != null) {
    const Component = plugin.component;
    return <Component fetch={fetch} metadata={metadata} />;
  }

  throw new Error(`Unknown widget type '${type}'`);
}

export default WidgetView;
