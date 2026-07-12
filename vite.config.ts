import { defineConfig } from 'vitest/config';

export default defineConfig({
  base: './',
  build: {
    target: 'es2022',
    sourcemap: false,
    assetsInlineLimit: 4096,
  },
  server: { host: true },
  test: {
    globals: true,
    environment: 'node',
  },
});
