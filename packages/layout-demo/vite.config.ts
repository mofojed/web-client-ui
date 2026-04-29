/* eslint-disable import/no-extraneous-dependencies */
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react-swc';
import path from 'path';

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  const packagesDir = path.resolve(__dirname, '..');

  let port = Number.parseInt(env.PORT, 10);
  if (Number.isNaN(port) || port <= 0) {
    port = 4020;
  }

  return {
    server: { port },
    preview: { port },
    resolve: {
      dedupe: ['react', 'react-dom'],
      alias:
        mode === 'development'
          ? [
              {
                find: /^@deephaven\/(?!icons|jsapi-types)(.*)/,
                replacement: `${packagesDir}/$1/src`,
              },
            ]
          : [],
    },
    plugins: [react()],
  };
});
