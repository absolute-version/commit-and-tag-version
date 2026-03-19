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
    execArgv: ['--require', './test/setup-coverage.js'],
    sequence: {
      concurrent: false,
    },
  },
});
