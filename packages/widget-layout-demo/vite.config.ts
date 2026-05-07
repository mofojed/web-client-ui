/* eslint-disable import/no-extraneous-dependencies */
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react-swc';
import path from 'path';

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');

  const packagesDir = path.resolve(__dirname, '..');

  let port = Number.parseInt(env.PORT, 10);
  if (Number.isNaN(port) || port <= 0) {
    port = 4030;
  }

  const baseURL = new URL(env.BASE_URL, `http://localhost:${port}/`);
  // Paths that need to be proxied to the core server.
  // https://vitejs.dev/config/server-options.html#server-proxy
  const proxy: Record<string, unknown> = {
    // Proxy the websocket requests, allows tunneling to work with a single port
    '^/arrow\\.*': {
      target: env.VITE_PROXY_URL,
      changeOrigin: true,
      ws: true,
    },
    '^/io\\.deephaven\\..*': {
      target: env.VITE_PROXY_URL,
      changeOrigin: true,
      ws: true,
    },
  };

  if (env.VITE_PROXY_URL) {
    [env.VITE_CORE_API_URL, env.VITE_MODULE_PLUGINS_URL].forEach(p => {
      const route = new URL(p, baseURL).pathname;
      proxy[route] = {
        target: env.VITE_PROXY_URL,
        changeOrigin: true,
      };
    });
  }

  // Proxy to local dev server for js-plugins
  if (env.VITE_JS_PLUGINS_DEV_PORT && env.VITE_MODULE_PLUGINS_URL) {
    const route = new URL(env.VITE_MODULE_PLUGINS_URL, baseURL).pathname;
    proxy[route] = {
      target: `http://localhost:${env.VITE_JS_PLUGINS_DEV_PORT}`,
      changeOrigin: true,
      rewrite: (pathOrig: string) => pathOrig.replace(/^\/js-plugins/, ''),
    };
  }

  return {
    base: './',
    envPrefix: ['VITE_', 'npm_'],
    server: {
      port,
      proxy,
    },
    preview: {
      port,
      proxy,
    },
    resolve: {
      dedupe: ['react', 'react-redux', 'redux'],
      alias:
        mode === 'development'
          ? [
              {
                find: /^@deephaven\/(.*)\/scss\/(.*)/,
                replacement: `${packagesDir}/$1/scss/$2`,
              },
              {
                find: /^@deephaven\/(?!icons|jsapi-types)(.*)/,
                replacement: `${packagesDir}/$1/src`,
              },
            ]
          : [],
    },
    build: {
      outDir: env.VITE_BUILD_PATH,
      emptyOutDir: true,
      sourcemap: true,
    },
    define: {
      'process.env': {},
    },
    optimizeDeps: {
      esbuildOptions: {
        define: {
          global: 'globalThis',
        },
      },
    },
    plugins: [react()],
  };
});
