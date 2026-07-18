'use strict';

/**
 * Create mock state and module factories for the conventional-changelog
 * ecosystem packages.
 *
 * Usage in test files:
 *
 *   const mockers = vi.hoisted(() => require('./mocks/vitest-mocks').setup());
 *
 *   vi.mock('conventional-changelog', () =>
 *     mockers.conventionalChangelogModule(),
 *   );
 *   vi.mock('conventional-recommended-bump', async (importOriginal) =>
 *     mockers.conventionalRecommendedBumpModule(
 *       await importOriginal(),
 *       await import('@conventional-changelog/git-client'),
 *     ),
 *   );
 *   vi.mock('@conventional-changelog/git-client', async (importOriginal) =>
 *     mockers.gitClientModule(await importOriginal()),
 *   );
 */
function setup({ mockRunExecFile = false } = {}) {
  const runExecFile = vi.fn();

  // Use the actual fs module object directly for spying
  const fsProxy = require('fs');

  // Sentinel passed as `bump` by tests that want the real Bumper
  // implementation to run (against the mocked git client).
  const actualConventionalRecommendedBump = Symbol(
    'actual-conventional-recommended-bump',
  );

  // Shared mock data, updated by the mock* helpers below.
  const state = {
    tags: [], // string[] | Error - git tags yielded by the git client
    commits: [], // string[] - raw commit bodies yielded by the git client
    changelog: [], // Array<string | Error | fn | undefined> - changelog chunks
    bump: undefined, // releaseType | Error | fn | actualConventionalRecommendedBump
  };

  /**
   * Module factory for '@conventional-changelog/git-client': the real
   * ConventionalGitClient with the raw git interactions (log for commits and
   * tags) replaced by the mock state. Parsing and semver filtering still use
   * the real implementation.
   */
  const gitClientModule = (actual) => {
    class MockConventionalGitClient extends actual.ConventionalGitClient {
      async *getRawCommits() {
        for (const commit of state.commits || []) {
          yield commit;
        }
      }

      async *getTags() {
        if (state.tags instanceof Error) throw state.tags;
        for (const tag of state.tags || []) {
          yield tag;
        }
      }
    }

    return { ...actual, ConventionalGitClient: MockConventionalGitClient };
  };

  /**
   * Module factory for 'conventional-changelog': a chainable stub whose
   * write() generator yields the queued changelog chunks.
   */
  const conventionalChangelogModule = () => {
    class MockConventionalChangelog {
      readPackage() {
        return this;
      }

      package() {
        return this;
      }

      loadPreset(preset) {
        this.presetParams = preset;
        return this;
      }

      config(config) {
        this.configParams = config;
        return this;
      }

      tags(params) {
        this.tagsParams = params;
        return this;
      }

      options(options) {
        this.optionsParams = options;
        return this;
      }

      context(context) {
        this.contextParams = context;
        return this;
      }

      commits(params, parserOptions) {
        this.commitsParams = params;
        this.parserOptions = parserOptions;
        return this;
      }

      writer(options) {
        this.writerOptions = options;
        return this;
      }

      async *write() {
        // Mirrors the behaviour of the old stream mock: consume queued
        // entries until an empty entry ends the stream; an Error entry
        // fails it; a function entry is called with the params captured
        // from the chained setup calls.
        for (;;) {
          const next = state.changelog.shift();
          if (next instanceof Error) throw next;
          const chunk =
            typeof next === 'function'
              ? next({
                  preset: this.presetParams,
                  tags: this.tagsParams,
                  options: this.optionsParams,
                  context: this.contextParams,
                  commits: this.commitsParams,
                  parser: this.parserOptions,
                  writer: this.writerOptions,
                })
              : next;
          if (!chunk) return;
          yield chunk;
        }
      }
    }

    return { ConventionalChangelog: MockConventionalChangelog };
  };

  /**
   * Module factory for 'conventional-recommended-bump': a chainable Bumper
   * stub driven by the `bump` mock state. When `bump` is the
   * `actualConventionalRecommendedBump` sentinel, the real Bumper runs with
   * the mocked git client, so real presets, parsing and whatBump logic are
   * exercised against the mock commits/tags.
   */
  const conventionalRecommendedBumpModule = (actual, gitClientMod) => {
    class MockBumper {
      loadPreset(preset) {
        this.presetParams = preset;
        return this;
      }

      config(config) {
        this.configParams = config;
        return this;
      }

      options(options) {
        this.optionsParams = options;
        return this;
      }

      tag(params) {
        this.tagParams = params;
        return this;
      }

      commits(params, parserOptions) {
        this.commitsParams = params;
        this.parserOptions = parserOptions;
        return this;
      }

      async bump(whatBump) {
        const bump = state.bump;

        if (bump === actualConventionalRecommendedBump) {
          const bumper = new actual.Bumper(
            new gitClientMod.ConventionalGitClient(process.cwd()),
          );
          if (this.presetParams) bumper.loadPreset(this.presetParams);
          if (this.tagParams) bumper.tag(this.tagParams);
          if (this.commitsParams || this.parserOptions) {
            bumper.commits(this.commitsParams || {}, this.parserOptions);
          }
          if (this.optionsParams) bumper.options(this.optionsParams);
          return bumper.bump(whatBump);
        }

        if (bump instanceof Error) throw bump;

        if (typeof bump === 'function') {
          // Legacy callback-style test hook: (opt, parserOpts, cb)
          return new Promise((resolve, reject) => {
            bump(
              {
                preset: this.presetParams,
                tag: this.tagParams,
                commits: this.commitsParams,
              },
              this.parserOptions,
              (err, release) => {
                if (err) reject(err);
                else resolve({ commits: [], ...release });
              },
            );
          });
        }

        if (bump) {
          return { releaseType: bump, commits: [] };
        }
        return { commits: [] };
      }
    }

    return { ...actual, Bumper: MockBumper };
  };

  const mockGitSemverTags = ({ tags = [] }) => {
    state.tags = tags;
  };

  const mockGitRawCommits = ({ commits = [] }) => {
    state.commits = commits;
  };

  const mockConventionalChangelog = ({ changelog }) => {
    state.changelog = Array.isArray(changelog) ? changelog : [changelog];
  };

  const mockRecommendedBump = ({ bump }) => {
    state.bump = bump;
  };

  return {
    fsProxy,
    runExecFile,
    mockRunExecFile,
    actualConventionalRecommendedBump,
    gitClientModule,
    conventionalChangelogModule,
    conventionalRecommendedBumpModule,
    mockGitSemverTags,
    mockGitRawCommits,
    mockConventionalChangelog,
    mockRecommendedBump,
  };
}

module.exports = { setup };
