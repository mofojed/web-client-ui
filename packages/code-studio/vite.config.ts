// This is a dev dependency for building, so importing dev deps is fine
/* eslint-disable import/no-extraneous-dependencies */
import { defineConfig } from "vite";

// https://vitejs.dev/config/
export default defineConfig(() => {
  return {
    server: {
      open: true,
    },
    optimizeDeps: {
      esbuildOptions: {
        // Some packages need this to start properly if they reference global
        define: {
          global: "globalThis",
        },
      },
    },
  };
});
