import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    testTimeout: 30000,
    include: ['test/**/*.spec.js', 'test/**/*.integration-test.js'],
    coverage: {
      provider: 'istanbul',
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
        // Inline source dependencies so vi.mock() can intercept CJS require()
        // in the source code's dependency graph.
        // Must not inline coverage/vitest internals or they break.
        inline: [/^(?!.*@vitest\/)(?!.*vitest\/)/],
      },
    },
  },
});
