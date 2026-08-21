/* eslint-disable import/no-extraneous-dependencies */
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react-swc';
import path from 'path';

// The plot demo intentionally has no Deephaven server dependency, so unlike the
// other apps there is no proxy configuration here.
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');

  const packagesDir = path.resolve(__dirname, '..');

  let port = Number.parseInt(env.PORT, 10);
  if (Number.isNaN(port) || port <= 0) {
    port = 4020;
  }

  return {
    base: env.BASE_URL ?? './',
    envPrefix: ['VITE_', 'npm_'],
    plugins: [react()],
    server: { port },
    preview: { port },
    resolve: {
      dedupe: ['react', 'react-dom'],
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
      outDir: env.VITE_BUILD_PATH ?? './build',
      emptyOutDir: true,
      sourcemap: true,
    },
  };
});
