'use strict';

const { Readable } = require('stream');

/**
 * Create mock functions and install a CJS hook to intercept require() calls
 * in the source code's dependency graph.
 *
 * Usage in test files:
 *
 *   const mockers = vi.hoisted(() => require('./mocks/jest-mocks').setup());
 *
 *   vi.mock('conventional-changelog', () => ({ default: mockers.conventionalChangelog }));
 *   vi.mock('conventional-recommended-bump', () => ({ default: mockers.conventionalRecommendedBump }));
 *   vi.mock('git-semver-tags', () => ({ default: mockers.gitSemverTags }));
 *   vi.mock('git-raw-commits', () => ({ default: mockers.gitRawCommits }));
 */
function setup({ mockRunExecFile = false } = {}) {
  const gitSemverTags = vi.fn();
  const conventionalChangelog = vi.fn();
  const conventionalRecommendedBump = vi.fn();
  const gitRawCommits = vi.fn();
  const runExecFile = vi.fn();

  // Use the actual fs module object directly for spying
  const fsProxy = require('fs');

  const MOCK_MAP = {
    'conventional-changelog': conventionalChangelog,
    'conventional-recommended-bump': conventionalRecommendedBump,
    'git-semver-tags': gitSemverTags,
    'git-raw-commits': gitRawCommits,
  };

  // Hook into Node's Module._load to intercept CJS require() calls
  // in the source code's dependency graph. vi.mock() only intercepts
  // ESM imports, so this hook is needed for CJS source code.
  const Module = require('module');
  const origLoad = Module._load;
  Module._load = function (request, parent, isMain) {
    if (MOCK_MAP[request]) return MOCK_MAP[request];
    if (request === 'fs') return fsProxy;
    // Only intercept run-execFile when explicitly requested (core.spec.js).
    // Integration tests need the real run-execFile for git operations.
    if (mockRunExecFile && (request.endsWith('run-execFile') || request.endsWith('run-execFile.js'))) {
      return runExecFile;
    }
    return origLoad.call(this, request, parent, isMain);
  };

  // Re-load the actual module AFTER the hook is installed so its internal
  // requires (like git-raw-commits) go through our hook. This is needed
  // for tests that use the actual conventionalRecommendedBump function.
  const crbPath = require.resolve('conventional-recommended-bump');
  delete require.cache[crbPath];
  const actualConventionalRecommendedBump = origLoad.call(
    Module,
    'conventional-recommended-bump',
    module,
    false,
  );

  const mockGitSemverTags = ({ tags = [] }) => {
    gitSemverTags.mockImplementation((opts, cb) => {
      if (tags instanceof Error) cb(tags);
      else cb(null, tags);
    });
  };

  const mockGitRawCommits = ({ commits = [] }) => {
    gitRawCommits.mockImplementation(() => {
      return new Readable({
        read() {
          commits.forEach((c) => this.push(c));
          this.push(null);
        },
      });
    });
  };

  const mockConventionalChangelog = ({ changelog }) => {
    conventionalChangelog.mockImplementation(
      (opt) =>
        new Readable({
          read(_size) {
            const next = changelog.shift();
            if (next instanceof Error) {
              this.destroy(next);
            } else if (typeof next === 'function') {
              this.push(next(opt));
            } else {
              this.push(next ? Buffer.from(next, 'utf8') : null);
            }
          },
        }),
    );
  };

  const mockRecommendedBump = ({ bump }) => {
    conventionalRecommendedBump.mockImplementation((opt, parserOpts, cb) => {
      if (typeof bump === 'function') bump(opt, parserOpts, cb);
      else if (bump instanceof Error) cb(bump);
      else cb(null, bump ? { releaseType: bump } : {});
    });
  };

  return {
    fsProxy,
    gitSemverTags,
    conventionalChangelog,
    conventionalRecommendedBump,
    gitRawCommits,
    runExecFile,
    actualConventionalRecommendedBump,
    mockGitSemverTags,
    mockGitRawCommits,
    mockConventionalChangelog,
    mockRecommendedBump,
  };
}

module.exports = { setup };
