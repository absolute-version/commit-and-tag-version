import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    testTimeout: 30000,
    include: ['test/**/*.spec.js', 'test/**/*.integration-test.js'],
    coverage: {
      include: ['**/*.{js,jsx,ts}'],
      exclude: [
        'node_modules/**',
        'tmp/**',
        'test/**',
        'coverage/**',
        'bin/**',
      ],
      reporter: ['lcov', 'text'],
    },
    pool: 'forks',
    sequence: {
      concurrent: false,
    },
    server: {
      deps: {
        // Inline all node_modules so vi.mock() can intercept CJS require()
        // in the source code's dependency graph
        inline: true,
      },
    },
  },
});
