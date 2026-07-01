import { useEffect, useMemo, useState } from 'react';
import { ErrorBoundary } from '@deephaven/components';
import { FiberProvider } from '@deephaven/dashboard';
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
  // panel.state's *reference* changes every time the layout state is
  // re-broadcast (popout geometry polling, sibling rearrangement, etc.).
  // Memoize by-value so `useObjectFetch(descriptor)` doesn't re-subscribe
  // and tear the plugin down on every broadcast.
  const state = isWidgetPanelState(panel.state) ? panel.state : null;
  const type = state?.type ?? null;
  const name = state?.name ?? null;
  const descriptor = useMemo<WidgetPanelState | null>(
    () => (type != null && name != null ? { type, name } : null),
    [type, name]
  );

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

type LoadState =
  | { status: 'loading' }
  | { status: 'ready'; value: unknown }
  | { status: 'error'; error: unknown };

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
        .find(p => [p.supportedTypes].flat().some(t => t === descriptor.type)),
    [plugins, descriptor.type]
  );

  // Pre-fetch the widget object ourselves so the panel can show a loading
  // indicator across both descriptor resolution and the actual server
  // round-trip. We then hand the plugin a memoized fetch that resolves
  // synchronously, so its own data-loading effect is effectively a no-op.
  const [load, setLoad] = useState<LoadState>({ status: 'loading' });

  useEffect(() => {
    if (fetchUpdate.status === 'loading') {
      setLoad({ status: 'loading' });
      return undefined;
    }
    if (fetchUpdate.status === 'error') {
      setLoad({ status: 'error', error: fetchUpdate.error });
      return undefined;
    }
    let cancelled = false;
    setLoad({ status: 'loading' });
    fetchUpdate.fetch().then(
      value => {
        if (!cancelled) setLoad({ status: 'ready', value });
      },
      error => {
        if (!cancelled) setLoad({ status: 'error', error });
      }
    );
    return () => {
      cancelled = true;
    };
  }, [fetchUpdate]);

  const cachedFetch = useMemo<() => Promise<unknown>>(() => {
    if (load.status === 'ready') {
      const { value } = load;
      return () => Promise.resolve(value);
    }
    return () => Promise.reject(new Error('Widget not loaded'));
  }, [load]);

  if (plugin == null) {
    return (
      <div className="widget-panel-message">
        No plugin registered for type &quot;{descriptor.type}&quot;.
      </div>
    );
  }

  if (load.status === 'error') {
    return (
      <div className="widget-panel-message widget-panel-error">
        Failed to load &quot;{descriptor.name}&quot;: {String(load.error)}
      </div>
    );
  }

  const Component = plugin.component;
  const isLoading = load.status === 'loading';
  return (
    <div className={`widget-panel-outer${isLoading ? ' is-loading' : ''}`}>
      {!isLoading && (
        // Widget plugins (e.g. deephaven.ui) call `useDhId`/`usePersistentState`,
        // which rely on `useFiber` and must be rendered within a FiberProvider.
        <FiberProvider>
          <Component fetch={cachedFetch} metadata={descriptor} />
        </FiberProvider>
      )}
    </div>
  );
}

export default WidgetPanel;
