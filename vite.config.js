import {defineConfig} from "vitest/config";

export default defineConfig({
  // Vite dev server configuration
  server: {
    port: 8080,
    open: true,
  },

  // Vitest testing configuration
  test: {
    environment: "jsdom",
    globals: true,
  },

  // Build configuration
  build: {
    outDir: "dist",
  },
});
