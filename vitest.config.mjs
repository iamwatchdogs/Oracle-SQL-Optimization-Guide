import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    include: ['test/unit/**/*.test.mjs', 'test/integration/**/*.test.mjs'],
    environment: 'node',
    globals: false,
    // The Tailwind integration tests compile the real stylesheet through Vite.
    // Isolate them in forked processes and give them room to finish.
    pool: 'forks',
    testTimeout: 30_000,
    hookTimeout: 30_000,
    reporters: ['default'],
    coverage: {
      provider: 'v8',
      include: ['src/lib/**/*.mjs', 'src/components/**', 'src/layouts/**'],
      exclude: ['**/*.test.mjs', '**/fixtures/**', 'node_modules/**'],
      reporter: ['text', 'html'],
    },
  },
});
