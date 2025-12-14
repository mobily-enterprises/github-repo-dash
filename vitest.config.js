import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'happy-dom',
    globals: true,
    coverage: {
      provider: 'v8',
      exclude: ['docs/app.js'],
      thresholds: {
        lines: 99,
        branches: 99,
        functions: 99,
        statements: 99
      }
    }
  }
});
