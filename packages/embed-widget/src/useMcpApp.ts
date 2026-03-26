/**
 * Thin wrapper around the `useApp` hook from `@modelcontextprotocol/ext-apps/react`.
 *
 * This exists because the project's `moduleResolution: "node"` tsconfig does not
 * support package.json `exports` subpaths. Vite resolves them at build time, so
 * the `// @ts-expect-error` is safe for runtime.
 */

// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-expect-error — moduleResolution:"node" can't resolve the /react subpath export; Vite handles it at build time
// eslint-disable-next-line import/no-unresolved
import { useApp } from '@modelcontextprotocol/ext-apps/react';
import type { App } from '@modelcontextprotocol/ext-apps';

export interface McpAppState {
  /** The MCP App instance, null if not yet connected */
  app: App | null;
  /** Whether the MCP connection has been established */
  isConnected: boolean;
  /** Connection error, if any */
  error: Error | null;
}

/**
 * Connects the embed-widget as an MCP App using the library's `useApp` hook.
 * If the widget is not running inside an MCP host iframe, the connection will
 * fail and `error` will be set (which can be safely ignored).
 */
export function useMcpApp(): McpAppState {
  return useApp({
    appInfo: {
      name: 'Deephaven Embedded Widget',
      version: import.meta.env.npm_package_version ?? '0.0.0',
    },
    capabilities: {},
  }) as McpAppState;
}
