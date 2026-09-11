import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node',
    include: ['src/**/*.test.ts'],
    setupFiles: ['./src/test/test-database-guard.ts'],
    fileParallelism: false,
    sequence: { concurrent: false }
  }
});
