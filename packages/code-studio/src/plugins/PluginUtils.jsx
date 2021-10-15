import React, { Suspense } from 'react';
import Log from '@deephaven/log';
import RemoteComponent from './RemoteComponent';
import loadRemoteModule from './loadRemoteModule';

const log = Log.module('PluginUtils');

class PluginUtils {
  static loadPlugin(pluginName) {
    if (
      process.env.REACT_APP_INTERNAL_PLUGINS.split(',').includes(pluginName)
    ) {
      const LazyPlugin = React.lazy(() => import(`./internal/${pluginName}`));
      const LocalPlugin = React.forwardRef((props, ref) => (
        <Suspense fallback={<div>Loading Plugin...</div>}>
          {/* eslint-disable-next-line react/jsx-props-no-spreading */}
          <LazyPlugin ref={ref} {...props} />
        </Suspense>
      ));
      LocalPlugin.pluginName = pluginName;
      LocalPlugin.displayName = 'Local Plugin';
      return LocalPlugin;
    }

    const baseUrl = new URL(process.env.REACT_APP_PLUGIN_URL, window.location);
    const pluginUrl = new URL(`${pluginName}.js`, baseUrl);
    const Plugin = React.forwardRef((props, ref) => (
      <RemoteComponent
        url={pluginUrl}
        render={({ err, Component }) => {
          if (err) {
            const errorMessage = `Error loading plugin ${pluginName} from ${pluginUrl} due to ${err}`;
            log.error(errorMessage);
            return <div className="error-message">{`${errorMessage}`}</div>;
          }
          // eslint-disable-next-line react/jsx-props-no-spreading
          return <Component ref={ref} {...props} />;
        }}
      />
    ));
    Plugin.pluginName = pluginName;
    Plugin.displayName = 'Plugin';
    return Plugin;
  }

  /**
   * Imports a commonjs plugin from the provided URL
   * @param {string} pluginUrl The URL of the plugin to load
   * @returns The loaded modules `default()` value
   */
  static async loadPluginModule(
    pluginUrl = 'http://localhost:4000/jsapi/matplotlib-plugin.js'
  ) {
    const myModule = await loadRemoteModule(pluginUrl);
    return myModule.default;
  }
}

export default PluginUtils;
