import { useMemo } from 'react';
import { ErrorBoundary, LoadingSpinner } from '@deephaven/components';
import { useObjectFetch } from '@deephaven/jsapi-bootstrap';
import { isWidgetPlugin, usePlugins } from '@deephaven/plugin';
import type { PanelContentProps } from '@deephaven/layout';
import type { dh } from '@deephaven/jsapi-types';

export interface WidgetPanelState {
  type: string;
  name: string;
}

function isWidgetPanelState(value: unknown): value is WidgetPanelState {
  return (
    typeof value === 'object' &&
    value !== null &&
    typeof (value as WidgetPanelState).type === 'string' &&
    typeof (value as WidgetPanelState).name === 'string'
  );
}

export function WidgetPanel({ panel }: PanelContentProps): JSX.Element {
  const descriptor = isWidgetPanelState(panel.state) ? panel.state : null;

  if (descriptor == null) {
    return (
      <div className="widget-panel-message">
        Panel is missing a widget descriptor.
      </div>
    );
  }

  return (
    <ErrorBoundary>
      <WidgetPanelContent descriptor={descriptor} />
    </ErrorBoundary>
  );
}

function WidgetPanelContent({
  descriptor,
}: {
  descriptor: dh.ide.VariableDescriptor;
}): JSX.Element {
  const fetchUpdate = useObjectFetch(descriptor);
  const plugins = usePlugins();

  const plugin = useMemo(
    () =>
      [...plugins.values()]
        .filter(isWidgetPlugin)
        .find(p =>
          [p.supportedTypes].flat().some(t => t === descriptor.type)
        ),
    [plugins, descriptor.type]
  );

  if (plugin == null) {
    return (
      <div className="widget-panel-message">
        No plugin registered for type &quot;{descriptor.type}&quot;.
      </div>
    );
  }

  if (fetchUpdate.status === 'loading') {
    return (
      <div className="widget-panel-loading">
        <LoadingSpinner />
      </div>
    );
  }

  if (fetchUpdate.status === 'error') {
    return (
      <div className="widget-panel-message widget-panel-error">
        Failed to load &quot;{descriptor.name}&quot;: {String(fetchUpdate.error)}
      </div>
    );
  }

  const Component = plugin.component;
  return (
    <div className="widget-panel-content">
      <Component fetch={fetchUpdate.fetch} metadata={descriptor} />
    </div>
  );
}

export default WidgetPanel;
