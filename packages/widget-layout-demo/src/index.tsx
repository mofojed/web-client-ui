import { createRoot } from 'react-dom/client';
import React, { Suspense } from 'react';
import '@deephaven/components/scss/BaseStyleSheet.scss'; // Do NOT move any lower. Must be imported before any other styles.
import { LoadingOverlay, preloadTheme } from '@deephaven/components';
import { ApiBootstrap } from '@deephaven/jsapi-bootstrap';
import { parsePopoutParams } from '@deephaven/layout';
import { logInit } from '@deephaven/log';
import { assertNotNull } from '@deephaven/utils';
import './index.scss';

logInit(
  parseInt(import.meta.env.VITE_LOG_LEVEL ?? '2', 10),
  import.meta.env.VITE_ENABLE_LOG_PROXY === 'true'
);

preloadTheme();

const isPopout = parsePopoutParams(window.location.search) != null;

// eslint-disable-next-line react-refresh/only-export-components
const App = React.lazy(() =>
  isPopout ? import('./PopoutApp') : import('./App')
);

// eslint-disable-next-line react-refresh/only-export-components
const AppBootstrap = React.lazy(async () => {
  const module = await import('@deephaven/app-utils');
  return { default: module.AppBootstrap };
});

const apiURL = new URL(
  `${import.meta.env.VITE_CORE_API_URL}/${import.meta.env.VITE_CORE_API_NAME}`,
  document.baseURI
);

const pluginsURL = new URL(
  import.meta.env.VITE_MODULE_PLUGINS_URL,
  document.baseURI
);

const logMetadata: Record<string, unknown> = {
  uiVersion: import.meta.env.npm_package_version,
};

// We deliberately omit `WidgetLoaderPluginConfig` — it is wired into the
// golden-layout event hub and we render widgets directly via the plugin map.
async function getCorePlugins() {
  const dashboardCorePlugins = await import(
    '@deephaven/dashboard-core-plugins'
  );
  const { GridPluginConfig, PandasPluginConfig, ChartPluginConfig } =
    dashboardCorePlugins;
  return [GridPluginConfig, PandasPluginConfig, ChartPluginConfig];
}

const rootElement = document.getElementById('root');
assertNotNull(rootElement);
const root = createRoot(rootElement);

root.render(
  <ApiBootstrap apiUrl={apiURL.href} setGlobally>
    <Suspense
      fallback={
        <LoadingOverlay data-testid="widget-layout-demo-index-loading" />
      }
    >
      <AppBootstrap
        getCorePlugins={getCorePlugins}
        serverUrl={apiURL.origin}
        pluginsUrl={pluginsURL.href}
        logMetadata={logMetadata}
      >
        <App />
      </AppBootstrap>
    </Suspense>
  </ApiBootstrap>
);
