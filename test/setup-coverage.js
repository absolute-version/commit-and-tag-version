/**
 * Node.js require hook that applies Istanbul instrumentation to source files
 * loaded via CJS require() chains.
 *
 * In Vitest with pool:'forks', files directly imported by tests go through
 * Vite's transform pipeline (where @vitest/coverage-istanbul instruments them).
 * But files loaded via CJS require() inside source code bypass Vite entirely
 * and go through Node's native Module._load. This hook uses pirates to
 * intercept those loads and apply Istanbul instrumentation, writing to the
 * same __VITEST_COVERAGE__ global that the coverage provider reads.
 *
 * Preloaded via execArgv: ['--require', ...] in vitest.config.js.
 */
'use strict';

const path = require('path');
const { createInstrumenter } = require('istanbul-lib-instrument');
const { addHook } = require('pirates');

const ROOT = path.resolve(__dirname, '..');

const instrumenter = createInstrumenter({
  esModules: false,
  compact: false,
  produceSourceMap: false,
  coverageVariable: '__VITEST_COVERAGE__',
  coverageGlobalScope: 'globalThis',
  coverageGlobalScopeFunc: false,
});

addHook(
  (code, filename) => {
    return instrumenter.instrumentSync(code, filename);
  },
  {
    exts: ['.js'],
    matcher: (filename) => {
      // Only instrument project source files, not node_modules or test files
      return (
        filename.startsWith(ROOT) &&
        !filename.includes('node_modules') &&
        !filename.includes(path.sep + 'test' + path.sep) &&
        !filename.includes(path.sep + 'bin' + path.sep)
      );
    },
  },
);
