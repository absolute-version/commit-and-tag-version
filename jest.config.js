const config = {
  collectCoverage: true,
  collectCoverageFrom: [
    '**/*.{js,jsx,ts}',
    '!**/node_modules/**',
    '!**/tmp/**',
    '!**/test/**',
    '!**/coverage/**',
    '!**/bin/**',
  ],
  coverageReporters: ['lcov', 'text'],
  projects: [
    {
      displayName: 'Unit Test',
      testMatch: ['**/test/*.spec.js'],
    },
    {
      displayName: 'Integration Test',
      runner: 'jest-serial-runner',
      testMatch: ['**/test/*.integration-test.js'],
    },
  ],
  silent: true, // Suppresses runtime console logs during test runs
  testTimeout: 30000,
  verbose: true, // Prints test describe/it names into console during test runs
};

module.exports = config;
