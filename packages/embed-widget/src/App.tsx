import React, { useEffect, useMemo, useState } from 'react';
import { useDispatch } from 'react-redux';
import {
  GrpcLayoutStorage,
  LocalWorkspaceStorage,
  useConnection,
  useServerConfig,
  useUser,
} from '@deephaven/app-utils';
import {
  ErrorBoundary,
  LoadingOverlay,
  Shortcut,
  ShortcutRegistry,
  ToastContainer,
} from '@deephaven/components'; // Use the loading spinner from the Deephaven components package
import { FiberProvider } from '@deephaven/dashboard';
import type { dh } from '@deephaven/jsapi-types';
import { fetchVariableDefinition } from '@deephaven/jsapi-utils';
import Log from '@deephaven/log';
import { WidgetView } from '@deephaven/plugin';
import { useApi, useClient } from '@deephaven/jsapi-bootstrap';
import {
  setDefaultWorkspaceSettings,
  setWorkspace,
  setApi,
  setUser,
  setServerConfigValues,
} from '@deephaven/redux';
import { useMcpApp } from './useMcpApp';
import './App.scss'; // Styles for in this app

const log = Log.module('EmbedWidget.App');

/**
 * A functional React component that displays a Deephaven Widget using the @deephaven/plugin package.
 * It will attempt to open and display the widget specified with the `name` parameter, expecting it to be present on the server.
 * E.g. http://localhost:4010/?name=myWidget will attempt to open a widget `myWidget` by emitting a `PanelEvent.OPEN` event.
 * If no query param is provided, it will display an error.
 * By default, tries to connect to the server defined in the VITE_CORE_API_URL variable, which is set to http://localhost:10000/jsapi
 * See Vite docs for how to update these env vars: https://vitejs.dev/guide/env-and-mode.html
 *
 * Also connects as an MCP App to report widget status to an MCP host if
 * running inside one.
 */
function App(): JSX.Element {
  const [error, setError] = useState<string>();
  const [definition, setDefinition] = useState<dh.ide.VariableDefinition>();
  const searchParams = useMemo(
    () => new URLSearchParams(window.location.search),
    []
  );

  const mcpApp = useMcpApp();

  // Get the widget name from the query param `name`.
  const name = searchParams.get('name');
  const api = useApi();
  const connection = useConnection();
  const client = useClient();
  const user = useUser();
  const dispatch = useDispatch();
  const serverConfig = useServerConfig();

  // Update the browser title when the widget name is available
  useEffect(
    function updateTitle() {
      if (name != null) {
        document.title = `${name} - Deephaven`;
      }
    },
    [name]
  );

  useEffect(
    function initializeApp() {
      async function initApp(): Promise<void> {
        try {
          if (name == null) {
            throw new Error('Missing URL parameter "name"');
          }

          const storageService = client.getStorageService();
          const layoutStorage = new GrpcLayoutStorage(
            storageService,
            import.meta.env.VITE_STORAGE_PATH_LAYOUTS ?? ''
          );
          const workspaceStorage = new LocalWorkspaceStorage(layoutStorage);
          const loadedWorkspace = await workspaceStorage.load({
            isConsoleAvailable: false,
          });
          const {
            data: { settings },
          } = loadedWorkspace;
          // Set any shortcuts that user has overridden on this platform
          const { shortcutOverrides = {} } = settings;
          const isMac = Shortcut.isMacPlatform;
          const platformOverrides = isMac
            ? shortcutOverrides.mac ?? {}
            : shortcutOverrides.windows ?? {};
          Object.entries(platformOverrides).forEach(([id, keyState]) => {
            ShortcutRegistry.get(id)?.setKeyState(keyState);
          });
          dispatch(setApi(api));
          dispatch(setServerConfigValues(serverConfig));
          dispatch(setUser(user));
          dispatch(setWorkspace(loadedWorkspace));
          dispatch(
            setDefaultWorkspaceSettings(
              LocalWorkspaceStorage.makeDefaultWorkspaceSettings(serverConfig)
            )
          );

          log.debug(`Loading widget definition for ${name}...`);

          const newDefinition = await fetchVariableDefinition(connection, name);

          setDefinition(newDefinition);

          log.debug(`Widget definition successfully loaded for ${name}`);
        } catch (e: unknown) {
          log.error(`Unable to load widget definition for ${name}`, e);
          setError(`${e}`);
        }
      }
      initApp();
    },
    [api, client, connection, dispatch, name, serverConfig, user]
  );

  // Report widget state to the MCP host
  useEffect(
    function reportMcpContext() {
      if (mcpApp.app == null || !mcpApp.isConnected) {
        return;
      }
      if (definition != null) {
        mcpApp.app
          .updateModelContext({
            content: [
              {
                type: 'text',
                text: `Widget "${name}" (type: ${definition.type}) loaded successfully.`,
              },
            ],
          })
          .catch((err: unknown) => {
            log.warn('Failed to update MCP model context:', err);
          });
      } else if (error != null) {
        mcpApp.app
          .updateModelContext({
            content: [
              {
                type: 'text',
                text: `Widget "${name}" failed to load: ${error}`,
              },
            ],
          })
          .catch((err: unknown) => {
            log.warn('Failed to update MCP model context:', err);
          });
      }
    },
    [mcpApp.app, mcpApp.isConnected, definition, error, name]
  );

  const isLoaded = definition != null && error == null;
  const isLoading = definition == null && error == null;

  const fetch = useMemo(() => {
    if (definition == null) {
      return async () => {
        throw new Error('Definition is null');
      };
    }
    return () => connection.getObject(definition);
  }, [connection, definition]);

  return (
    <div className="App">
      <FiberProvider>
        {isLoaded && (
          <ErrorBoundary>
            <WidgetView
              fetch={fetch}
              type={definition?.type ?? ''}
              metadata={definition}
            />
          </ErrorBoundary>
        )}
        {!isLoaded && (
          <LoadingOverlay
            data-testid="embed-widget-app-loading"
            isLoaded={isLoaded}
            isLoading={isLoading}
            errorMessage={error ?? null}
          />
        )}
        <ToastContainer />
      </FiberProvider>
    </div>
  );
}

export default App;
