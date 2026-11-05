import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node',
    globals: true,
    setupFiles: ['./test/setup.ts'],
    include: ['test/integration/**/*.ts'],
    fileParallelism: false,
    testTimeout: 30_000,
    hookTimeout: 30_000,
  },
});
