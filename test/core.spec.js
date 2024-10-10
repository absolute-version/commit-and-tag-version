'use strict';

const shell = require('shelljs');
const stripAnsi = require('strip-ansi');
const fs = require('fs');

const mockers = require('./mocks/jest-mocks');

const runExecFile = require('../lib/run-execFile');

const cli = require('../command');
const formatCommitMessage = require('../lib/format-commit-message');

// set by mock()
let standardVersion;
let readFileSyncSpy;
let lstatSyncSpy;

// Rather than trying to re-read something written out during tests, we can spy on writeFileSync
// we can trust fs is capable of writing the file
let writeFileSyncSpy;

const consoleErrorSpy = jest.spyOn(console, 'warn').mockImplementation();
const consoleInfoSpy = jest.spyOn(console, 'info').mockImplementation();

jest.mock('../lib/run-execFile');

const { readFileSync: readFileSyncActual, lstatSync: lstatSyncActual } = fs;

function exec(opt = '', git) {
  if (typeof opt === 'string') {
    opt = cli.parse(`commit-and-tag-version ${opt}`);
  }
  if (!git) opt.skip = Object.assign({}, opt.skip, { commit: true, tag: true });
  return standardVersion(opt);
}

function attemptingToReadPackageJson(path) {
  return path.includes('package.json') || path.includes('package-lock.json');
}

/**
 * @param fs - reference to 'fs' - needs to be defined in the root test class so that mocking works correctly
 * @param readFileSyncActual - actual implementation of fs.readFileSync - reference should be defined as a variable in root test class so we can unset spy after
 * @param existingChangelog ?: string - Existing CHANGELOG.md content
 * @param testFiles ?: object[] - with Path and Value fields, for mocking readFileSynch on packageFiles such as package.json, bower.json, manifest.json
 * @param realTestFiles ?: object[] - with Filename (e.g. mix.exs) and Path to real file in a directory
 * @return Jest spy on readFileSync
 */
const mockReadFilesFromDisk = ({
  fs,
  readFileSyncActual,
  existingChangelog,
  testFiles,
  realTestFiles,
}) =>
  jest.spyOn(fs, 'readFileSync').mockImplementation((path, opts) => {
    if (path === 'CHANGELOG.md') {
      if (existingChangelog) {
        return existingChangelog;
      }
      return '';
    }

    // If deliberately set to null when mocking, don't create a fake package.json
    if (testFiles === null && attemptingToReadPackageJson(path)) {
      return '{}';
    }

    if (testFiles) {
      const file = testFiles.find((otherFile) => {
        return path.includes(otherFile.path);
      });

      if (file) {
        if (file.value instanceof String || typeof file.value === 'string') {
          return file.value;
        }
        return JSON.stringify(file.value);
      }

      // For scenarios where we have defined testFiles such as bower.json
      // Do not create a fake package.json file
      if (attemptingToReadPackageJson(path)) {
        return '{}';
      }
    }

    // If no package files defined and not explicitly set to null, create a fake package json
    // otherwise fs will read the real package.json in the root of this project!
    if (attemptingToReadPackageJson(path)) {
      return JSON.stringify({ version: '1.0.0' });
    }

    if (realTestFiles) {
      const testFile = realTestFiles.find((testFile) => {
        return path.includes(testFile.filename);
      });

      if (testFile) {
        return readFileSyncActual(testFile.path, opts);
      }
    }

    return readFileSyncActual(path, opts);
  });

/**
 * @param fs - reference to 'fs' - needs to be defined in the root test class so that mocking works correctly
 * @param lstatSyncActual - actual implementation of fs.lstatSync
 * @param testFiles ?: object[] - with Path and Value fields, for mocking lstatSync on packageFiles such as package.json, bower.json, manifest.json
 * @param realTestFiles ?: object[] - with Filename (e.g. mix.exs) and Path to real file in a directory
 * @return Jest spy on lstatSync
 */
const mockFsLStat = ({ fs, lstatSyncActual, testFiles, realTestFiles }) =>
  jest.spyOn(fs, 'lstatSync').mockImplementation((path) => {
    if (testFiles) {
      const file = testFiles.find((otherFile) => {
        return path.includes(otherFile.path);
      });

      if (file) {
        return {
          isFile: () => true,
        };
      }
    }

    if (realTestFiles) {
      const file = realTestFiles.find((otherFile) => {
        return path.includes(otherFile.filename);
      });

      if (file) {
        return {
          isFile: () => true,
        };
      }
    }

    return lstatSyncActual(path);
  });

/**
 * Mock external conventional-changelog modules
 *
 * Mocks should be unregistered in test cleanup by calling unmock()
 *
 * bump?: 'major' | 'minor' | 'patch' | Error | (opt, parserOpts, cb) => { cb(err) | cb(null, { releaseType }) }
 * changelog?: string | Error | Array<string | Error | (opt) => string | null> - Changelog to be "generated" by conventional-changelog when reading commit history
 * execFile?: ({ dryRun, silent }, cmd, cmdArgs) => Promise<string>
 * tags?: string[] | Error
 * existingChangelog?: string - Existing CHANGELOG.md content
 * testFiles?: object[] - with Path and Value fields, for mocking readFileSynch on packageFiles such as package.json, bower.json, manifest.json
 * realTestFiles?: object[] - with Filename (e.g. mix.exs) and Path to real file in test directory
 */
function mock({
  bump,
  changelog,
  tags,
  existingChangelog,
  testFiles,
  realTestFiles,
} = {}) {
  mockers.mockRecommendedBump({ bump });

  if (!Array.isArray(changelog)) changelog = [changelog];

  mockers.mockConventionalChangelog({
    changelog,
  });

  mockers.mockGitSemverTags({
    tags,
  });

  // needs to be set after mockery, but before mock-fs
  standardVersion = require('../index');

  // For fake and injected test files pretend they exist at root level when Fs queries lstat
  // Package.json works without this as it'll check the one in this actual repo...
  lstatSyncSpy = mockFsLStat({
    fs,
    lstatSyncActual,
    testFiles,
    realTestFiles,
  });

  readFileSyncSpy = mockReadFilesFromDisk({
    fs,
    readFileSyncActual,
    existingChangelog,
    testFiles,
    realTestFiles,
  });

  // Spies on writeFileSync to capture calls and ensure we don't actually try write anything to disc
  writeFileSyncSpy = jest.spyOn(fs, 'writeFileSync').mockImplementation();
}

function clearCapturedSpyCalls() {
  consoleInfoSpy.mockClear();
  consoleErrorSpy.mockClear();
}

function restoreMocksToRealImplementation() {
  readFileSyncSpy.mockRestore();
  writeFileSyncSpy.mockRestore();
  lstatSyncSpy.mockRestore();
}

function unmock() {
  clearCapturedSpyCalls();

  restoreMocksToRealImplementation();

  standardVersion = null;
}

describe('format-commit-message', function () {
  it('works for no {{currentTag}}', function () {
    expect(formatCommitMessage('chore(release): 1.0.0', '1.0.0')).toEqual(
      'chore(release): 1.0.0',
    );
  });
  it('works for one {{currentTag}}', function () {
    expect(
      formatCommitMessage('chore(release): {{currentTag}}', '1.0.0'),
    ).toEqual('chore(release): 1.0.0');
  });
  it('works for two {{currentTag}}', function () {
    expect(
      formatCommitMessage(
        'chore(release): {{currentTag}} \n\n* CHANGELOG: https://github.com/absolute-version/commit-and-tag-version/blob/v{{currentTag}}/CHANGELOG.md',
        '1.0.0',
      ),
    ).toEqual(
      'chore(release): 1.0.0 \n\n* CHANGELOG: https://github.com/absolute-version/commit-and-tag-version/blob/v1.0.0/CHANGELOG.md',
    );
  });
});

describe('cli', function () {
  afterEach(unmock);

  describe('CHANGELOG.md does not exist', function () {
    it('populates changelog with commits since last tag by default', async function () {
      mock({ bump: 'patch', changelog: 'patch release\n', tags: ['v1.0.0'] });
      await exec();
      verifyNewChangelogContentMatches({
        writeFileSyncSpy,
        expectedContent: /patch release/,
      });
    });

    it('includes all commits if --first-release is true', async function () {
      mock({
        bump: 'minor',
        changelog: 'first commit\npatch release\n',
        testFiles: [{ path: 'package.json', value: { version: '1.0.1' } }],
      });
      await exec('--first-release');
      verifyNewChangelogContentMatches({
        writeFileSyncSpy,
        expectedContent: /patch release/,
      });
      verifyNewChangelogContentMatches({
        writeFileSyncSpy,
        expectedContent: /first commit/,
      });
    });

    it('skipping changelog will not create a changelog file', async function () {
      mock({ bump: 'minor', changelog: 'foo\n' });
      await exec('--skip.changelog true');

      verifyPackageVersion({ writeFileSyncSpy, expectedVersion: '1.1.0' });
      expect(writeFileSyncSpy).not.toHaveBeenCalledWith('CHANGELOG.md');
    });
  });

  describe('CHANGELOG.md exists', function () {
    afterEach(unmock);

    it('appends the new release above the last release, removing the old header (legacy format), and does not retain any front matter', async function () {
      const frontMatter = '---\nstatus: new\n---\n';
      mock({
        bump: 'patch',
        changelog: 'release 1.0.1\n',
        existingChangelog:
          frontMatter + 'legacy header format<a name="1.0.0">\n',
        tags: ['v1.0.0'],
      });
      await exec();

      verifyNewChangelogContentMatches({
        writeFileSyncSpy,
        expectedContent: /1\.0\.1/,
      });

      verifyNewChangelogContentDoesNotMatch({
        writeFileSyncSpy,
        expectedContent: /legacy header format/,
      });
      verifyNewChangelogContentDoesNotMatch({
        writeFileSyncSpy,
        expectedContent: /---status: new---/,
      });
    });

    it('appends the new release above the last release, replacing the old header (standard-version format) with header (new format), and retains any front matter', async function () {
      const { header } = require('../defaults');

      const standardVersionHeader =
        '# Changelog\n\nAll notable changes to this project will be documented in this file. See [standard-version](https://github.com/conventional-changelog/standard-version) for commit guidelines.';

      const frontMatter = '---\nstatus: new\n---\n';

      const changelog101 =
        '### [1.0.1](/compare/v1.0.0...v1.0.1) (YYYY-MM-DD)\n\n\n### Bug Fixes\n\n* patch release ABCDEFXY\n';

      const changelog100 =
        '### [1.0.0](/compare/v0.0.1...v1.0.0) (YYYY-MM-DD)\n\n\n### Features\n\n* Version one feature set\n';

      const initialChangelog =
        frontMatter + '\n' + standardVersionHeader + '\n' + changelog100;

      mock({
        bump: 'patch',
        changelog: changelog101,
        existingChangelog: initialChangelog,
        tags: ['v1.0.0'],
      });
      await exec();

      verifyNewChangelogContentEquals({
        writeFileSyncSpy,
        expectedContent:
          frontMatter + '\n' + header + '\n' + changelog101 + changelog100,
      });
    });

    it('appends the new release above the last release, removing the old header (new format), and retains any front matter', async function () {
      const { header } = require('../defaults');
      const frontMatter = '---\nstatus: new\n---\n';

      const changelog101 =
        '### [1.0.1](/compare/v1.0.0...v1.0.1) (YYYY-MM-DD)\n\n\n### Bug Fixes\n\n* patch release ABCDEFXY\n';

      const changelog100 =
        '### [1.0.0](/compare/v0.0.1...v1.0.0) (YYYY-MM-DD)\n\n\n### Features\n\n* Version one feature set\n';

      const initialChangelog =
        frontMatter + '\n' + header + '\n' + changelog100;

      mock({
        bump: 'patch',
        changelog: changelog101,
        existingChangelog: initialChangelog,
        tags: ['v1.0.0'],
      });
      await exec();

      verifyNewChangelogContentEquals({
        writeFileSyncSpy,
        expectedContent:
          frontMatter + '\n' + header + '\n' + changelog101 + changelog100,
      });
    });

    it('appends the new release above the last release, removing the old header (new format)', async function () {
      const { header } = require('../defaults');
      const changelog1 =
        '### [1.0.1](/compare/v1.0.0...v1.0.1) (YYYY-MM-DD)\n\n\n### Bug Fixes\n\n* patch release ABCDEFXY\n';
      mock({ bump: 'patch', changelog: changelog1, tags: ['v1.0.0'] });
      await exec();
      const content = header + '\n' + changelog1;
      verifyNewChangelogContentEquals({
        writeFileSyncSpy,
        expectedContent: content,
      });

      const changelog2 =
        '### [1.0.2](/compare/v1.0.1...v1.0.2) (YYYY-MM-DD)\n\n\n### Bug Fixes\n\n* another patch release ABCDEFXY\n';
      unmock();

      mock({
        bump: 'patch',
        changelog: changelog2,
        existingChangelog: content,
        tags: ['v1.0.0', 'v1.0.1'],
      });
      await exec();
      verifyNewChangelogContentEquals({
        writeFileSyncSpy,
        expectedContent: header + '\n' + changelog2 + changelog1,
      });
    });

    it('[DEPRECATED] (--changelogHeader) allows for a custom changelog header', async function () {
      const header = '# Pork Chop Log';
      mock({
        bump: 'minor',
        changelog: header + '\n',
        existingChangelog: '',
      });
      await exec(`--changelogHeader="${header}"`);
      verifyNewChangelogContentMatches({
        writeFileSyncSpy,
        expectedContent: new RegExp(header),
      });
    });

    it('[DEPRECATED] (--changelogHeader) exits with error if changelog header matches last version search regex', async function () {
      mock({ bump: 'minor', existingChangelog: '' });
      await expect(exec('--changelogHeader="## 3.0.2"')).rejects.toThrow(
        /custom changelog header must not match/,
      );
    });
  });

  describe('lifecycle scripts', function () {
    afterEach(unmock);

    describe('prerelease hook', function () {
      it('should run the prerelease hook when provided', async function () {
        mock({
          bump: 'minor',
          existingChangelog: 'legacy header format<a name="1.0.0">\n',
        });

        await exec({
          scripts: {
            prerelease: "node -e \"console.error('prerelease' + ' ran')\"",
          },
        });

        const expectedLog = 'prerelease ran';
        verifyLogPrinted({ consoleInfoSpy: consoleErrorSpy, expectedLog });
      });

      it('should abort if the hook returns a non-zero exit code', async function () {
        mock({
          bump: 'minor',
          existingChangelog: 'legacy header format<a name="1.0.0">\n',
        });

        await expect(
          exec({
            scripts: {
              prerelease: "node -e \"throw new Error('prerelease' + ' fail')\"",
            },
          }),
        ).rejects.toThrow(/prerelease fail/);
      });
    });

    describe('prebump hook', function () {
      it('should allow prebump hook to return an alternate version #', async function () {
        mock({
          bump: 'minor',
          existingChangelog: 'legacy header format<a name="1.0.0">\n',
        });

        await exec({
          scripts: {
            prebump: 'node -e "console.log(Array.of(9, 9, 9).join(\'.\'))"',
          },
        });
        verifyLogPrinted({ consoleInfoSpy, expectedLog: '9.9.9' });
        verifyPackageVersion({ writeFileSyncSpy, expectedVersion: '9.9.9' });
      });

      it('should not allow prebump hook to return a releaseAs command', async function () {
        mock({
          bump: 'minor',
          existingChangelog: 'legacy header format<a name="1.0.0">\n',
        });

        await exec({
          scripts: {
            prebump: 'node -e "console.log(\'major\')"',
          },
        });
        verifyPackageVersion({ writeFileSyncSpy, expectedVersion: '1.1.0' });
      });

      it('should allow prebump hook to return an arbitrary string', async function () {
        mock({
          bump: 'minor',
          existingChangelog: 'legacy header format<a name="1.0.0">\n',
        });

        await exec({
          scripts: {
            prebump: 'node -e "console.log(\'Hello World\')"',
          },
        });
        verifyPackageVersion({ writeFileSyncSpy, expectedVersion: '1.1.0' });
      });

      it('should allow prebump hook to return a version with build info', async function () {
        mock({
          bump: 'minor',
          existingChangelog: 'legacy header format<a name="1.0.0">\n',
        });

        await exec({
          scripts: {
            prebump: 'node -e "console.log(\'9.9.9-test+build\')"',
          },
        });
        verifyPackageVersion({
          writeFileSyncSpy,
          expectedVersion: '9.9.9-test+build',
        });
      });
    });

    describe('postbump hook', function () {
      it('should run the postbump hook when provided', async function () {
        mock({
          bump: 'minor',
          existingChangelog: 'legacy header format<a name="1.0.0">\n',
        });

        await exec({
          scripts: {
            postbump: "node -e \"console.error('postbump' + ' ran')\"",
          },
        });

        const expectedLog = 'postbump ran';
        verifyLogPrinted({ consoleInfoSpy: consoleErrorSpy, expectedLog });
      });

      it('should run the postbump and exit with error when postbump fails', async function () {
        mock({
          bump: 'minor',
          existingChangelog: 'legacy header format<a name="1.0.0">\n',
        });

        await expect(
          exec({
            scripts: {
              postbump: "node -e \"throw new Error('postbump' + ' fail')\"",
            },
          }),
        ).rejects.toThrow(/postbump fail/);
      });
    });

    describe('manual-release', function () {
      describe('release-types', function () {
        const regularTypes = ['major', 'minor', 'patch'];
        const nextVersion = { major: '2.0.0', minor: '1.1.0', patch: '1.0.1' };

        regularTypes.forEach(function (type) {
          it('creates a ' + type + ' release', async function () {
            mock({
              bump: 'patch',
              existingChangelog: 'legacy header format<a name="1.0.0">\n',
            });
            await exec('--release-as ' + type);
            verifyPackageVersion({
              writeFileSyncSpy,
              expectedVersion: nextVersion[type],
            });
          });
        });

        // this is for pre-releases
        regularTypes.forEach(function (type) {
          it('creates a pre' + type + ' release', async function () {
            mock({
              bump: 'patch',
              existingChangelog: 'legacy header format<a name="1.0.0">\n',
            });
            await exec('--release-as ' + type + ' --prerelease ' + type);
            verifyPackageVersion({
              writeFileSyncSpy,
              expectedVersion: `${nextVersion[type]}-${type}.0`,
            });
          });
        });

        it('exits with error if an invalid release type is provided', async function () {
          mock({ bump: 'minor', existingChangelog: '' });

          await expect(exec('--release-as invalid')).rejects.toThrow(
            /releaseAs must be one of/,
          );
        });
      });

      describe('release-as-exact', function () {
        it('releases as v100.0.0', async function () {
          mock({
            bump: 'patch',
            existingChangelog: 'legacy header format<a name="1.0.0">\n',
          });
          await exec('--release-as v100.0.0');
          verifyPackageVersion({
            writeFileSyncSpy,
            expectedVersion: '100.0.0',
          });
        });

        it('releases as 200.0.0-amazing', async function () {
          mock({
            bump: 'patch',
            existingChangelog: 'legacy header format<a name="1.0.0">\n',
          });
          await exec('--release-as 200.0.0-amazing');
          verifyPackageVersion({
            writeFileSyncSpy,
            expectedVersion: '200.0.0-amazing',
          });
        });

        it('releases as 100.0.0 with prerelease amazing', async function () {
          mock({
            bump: 'patch',
            existingChangelog: 'legacy header format<a name="1.0.0">\n',
            testFiles: [
              {
                path: 'package.json',
                value: {
                  version: '1.0.0',
                },
              },
            ],
          });
          await exec('--release-as 100.0.0 --prerelease amazing');
          verifyPackageVersion({
            writeFileSyncSpy,
            expectedVersion: '100.0.0-amazing.0',
          });
        });

        it('release 100.0.0 with prerelease amazing bumps build', async function () {
          mock({
            bump: 'patch',
            fs: {
              'CHANGELOG.md':
                'legacy header format<a name="100.0.0-amazing.0">\n',
            },
            testFiles: [
              {
                path: 'package.json',
                value: {
                  version: '100.0.0-amazing.0',
                },
              },
            ],
          });
          await exec('--release-as 100.0.0 --prerelease amazing');
          verifyPackageVersion({
            writeFileSyncSpy,
            expectedVersion: '100.0.0-amazing.1',
          });
        });

        it('release 100.0.0-amazing.0 with prerelease amazing bumps build', async function () {
          mock({
            bump: 'patch',
            fs: {
              'CHANGELOG.md':
                'legacy header format<a name="100.0.0-amazing.0">\n',
            },
            testFiles: [
              {
                path: 'package.json',
                value: {
                  version: '100.0.0-amazing.1',
                },
              },
            ],
          });
          await exec('--release-as 100.0.0-amazing.0 --prerelease amazing');
          verifyPackageVersion({
            writeFileSyncSpy,
            expectedVersion: '100.0.0-amazing.2',
          });
        });

        it('release 100.0.0 with prerelease amazing correctly sets version', async function () {
          mock({
            bump: 'patch',
            fs: {
              'CHANGELOG.md':
                'legacy header format<a name="100.0.0-amazing.0">\n',
            },
            testFiles: [
              {
                path: 'package.json',
                value: {
                  version: '99.0.0-amazing.0',
                },
              },
            ],
          });
          await exec('--release-as 100.0.0 --prerelease amazing');
          verifyPackageVersion({
            writeFileSyncSpy,
            expectedVersion: '100.0.0-amazing.0',
          });
        });

        it('release 100.0.0-amazing.0 with prerelease amazing correctly sets version', async function () {
          mock({
            bump: 'patch',
            fs: {
              'CHANGELOG.md':
                'legacy header format<a name="100.0.0-amazing.0">\n',
            },
            testFiles: [
              {
                path: 'package.json',
                value: {
                  version: '99.0.0-amazing.0',
                },
              },
            ],
          });
          await exec('--release-as 100.0.0-amazing.0 --prerelease amazing');
          verifyPackageVersion({
            writeFileSyncSpy,
            expectedVersion: '100.0.0-amazing.0',
          });
        });

        it('release 100.0.0-amazing.0 with prerelease amazing retains build metadata', async function () {
          mock({
            bump: 'patch',
            fs: {
              'CHANGELOG.md':
                'legacy header format<a name="100.0.0-amazing.0">\n',
            },
            testFiles: [
              {
                path: 'package.json',
                value: {
                  version: '100.0.0-amazing.0',
                },
              },
            ],
          });
          await exec(
            '--release-as 100.0.0-amazing.0+build.1234 --prerelease amazing',
          );
          verifyPackageVersion({
            writeFileSyncSpy,
            expectedVersion: '100.0.0-amazing.1+build.1234',
          });
        });

        it('release 100.0.0-amazing.3 with prerelease amazing correctly sets prerelease version', async function () {
          mock({
            bump: 'patch',
            fs: {
              'CHANGELOG.md':
                'legacy header format<a name="100.0.0-amazing.0">\n',
            },
            testFiles: [
              {
                path: 'package.json',
                value: {
                  version: '100.0.0-amazing.0',
                },
              },
            ],
          });
          await exec('--release-as 100.0.0-amazing.3 --prerelease amazing');
          verifyPackageVersion({
            writeFileSyncSpy,
            expectedVersion: '100.0.0-amazing.3',
          });
        });
      });

      it('creates a prerelease with a new minor version after two prerelease patches', async function () {
        let releaseType = 'patch';
        mock({
          bump: (_, __, cb) => cb(null, { releaseType }),
          existingChangelog: 'legacy header format<a name="1.0.0">\n',
        });

        let version = '1.0.1-dev.0';
        await exec('--release-as patch --prerelease dev');
        verifyPackageVersion({ writeFileSyncSpy, expectedVersion: version });

        unmock();
        mock({
          bump: (_, __, cb) => cb(null, { releaseType }),
          existingChangelog: 'legacy header format<a name="1.0.0">\n',
          testFiles: [{ path: 'package.json', value: { version } }],
        });

        version = '1.0.1-dev.1';
        await exec('--prerelease dev');
        verifyPackageVersion({ writeFileSyncSpy, expectedVersion: version });

        releaseType = 'minor';
        unmock();
        mock({
          bump: (_, __, cb) => cb(null, { releaseType }),
          existingChangelog: 'legacy header format<a name="1.0.0">\n',
          testFiles: [{ path: 'package.json', value: { version } }],
        });

        version = '1.1.0-dev.0';
        await exec('--release-as minor --prerelease dev');
        verifyPackageVersion({ writeFileSyncSpy, expectedVersion: version });

        unmock();
        mock({
          bump: (_, __, cb) => cb(null, { releaseType }),
          existingChangelog: 'legacy header format<a name="1.0.0">\n',
          testFiles: [{ path: 'package.json', value: { version } }],
        });

        version = '1.1.0-dev.1';
        await exec('--release-as minor --prerelease dev');
        verifyPackageVersion({ writeFileSyncSpy, expectedVersion: version });

        unmock();
        mock({
          bump: (_, __, cb) => cb(null, { releaseType }),
          existingChangelog: 'legacy header format<a name="1.0.0">\n',
          testFiles: [{ path: 'package.json', value: { version } }],
        });

        version = '1.1.0-dev.2';
        await exec('--prerelease dev');
        verifyPackageVersion({ writeFileSyncSpy, expectedVersion: version });
      });

      it('exits with error if an invalid release version is provided', async function () {
        mock({ bump: 'minor', existingChangelog: '' });

        await expect(exec('--release-as 10.2')).rejects.toThrow(
          /releaseAs must be one of/,
        );
      });

      it('exits with error if release version conflicts with prerelease', async function () {
        mock({ bump: 'minor', existingChangelog: '' });

        await expect(
          exec('--release-as 1.2.3-amazing.2 --prerelease awesome'),
        ).rejects.toThrow(
          /releaseAs and prerelease have conflicting prerelease identifiers/,
        );
      });
    });

    it('appends line feed at end of package.json', async function () {
      mock({ bump: 'patch' });
      await exec();
      verifyFileContentEquals({
        writeFileSyncSpy,
        content: '{\n  "version": "1.0.1"\n}\n',
      });
    });

    it('preserves indentation of tabs in package.json', async function () {
      mock({
        bump: 'patch',
        testFiles: [
          { path: 'package.json', value: '{\n\t"version": "1.0.0"\n}\n' },
        ],
      });
      await exec();
      // TODO: a) not bumping to 1.0.1, b) need to check how jest might handle tabbing etc
      verifyFileContentEquals({
        writeFileSyncSpy,
        content: '{\n\t"version": "1.0.1"\n}\n',
      });
    });

    it('preserves indentation of spaces in package.json', async function () {
      mock({
        bump: 'patch',
        testFiles: [
          { path: 'package.json', value: '{\n    "version": "1.0.0"\n}\n' },
        ],
      });
      await exec();
      verifyFileContentEquals({
        writeFileSyncSpy,
        content: '{\n    "version": "1.0.1"\n}\n',
      });
    });

    it('preserves carriage return + line feed in package.json', async function () {
      mock({
        bump: 'patch',
        testFiles: [
          { path: 'package.json', value: '{\r\n  "version": "1.0.0"\r\n}\r\n' },
        ],
      });
      await exec();
      verifyFileContentEquals({
        writeFileSyncSpy,
        content: '{\r\n  "version": "1.0.1"\r\n}\r\n',
      });
    });

    it('does not print output when the --silent flag is passed', async function () {
      mock();
      await exec('--silent');
      expect(consoleErrorSpy).not.toHaveBeenCalled();
      expect(consoleInfoSpy).not.toHaveBeenCalled();
    });
  });

  describe('commit-and-tag-version', function () {
    afterEach(unmock);

    it('should exit on bump error', async function () {
      mock({ bump: new Error('bump err') });

      await expect(exec()).rejects.toThrow(/bump err/);
    });

    it('should exit on changelog error', async function () {
      mock({ bump: 'minor', changelog: new Error('changelog err') });

      await expect(exec()).rejects.toThrow(/changelog err/);
    });

    it('should exit with error without a package file to bump', async function () {
      mock({ bump: 'patch', testFiles: null });

      await expect(exec({ gitTagFallback: false })).rejects.toThrow(
        'no package file found',
      );
    });

    it('bumps version # in bower.json', async function () {
      mock({
        bump: 'minor',
        testFiles: [{ path: 'bower.json', value: { version: '1.0.0' } }],
        tags: ['v1.0.0'],
      });
      await exec();

      verifyPackageVersion({
        writeFileSyncSpy,
        expectedVersion: '1.1.0',
        filename: 'bower.json',
      });
      verifyPackageVersion({ writeFileSyncSpy, expectedVersion: '1.1.0' });
    });

    it('bumps version # in manifest.json', async function () {
      mock({
        bump: 'minor',
        testFiles: [{ path: 'manifest.json', value: { version: '1.0.0' } }],
        tags: ['v1.0.0'],
      });
      await exec();

      verifyPackageVersion({
        writeFileSyncSpy,
        expectedVersion: '1.1.0',
        filename: 'manifest.json',
      });
      verifyPackageVersion({ writeFileSyncSpy, expectedVersion: '1.1.0' });
    });

    describe('custom `bumpFiles` support', function () {
      afterEach(unmock);

      it('mix.exs + version.txt', async function () {
        mock({
          bump: 'minor',
          realTestFiles: [
            { filename: 'mix.exs', path: './test/mocks/mix.exs' },
            { filename: 'version.txt', path: './test/mocks/version.txt' },
          ],
          tags: ['v1.0.0'],
        });

        await exec({
          bumpFiles: [
            'version.txt',
            {
              filename: 'mix.exs',
              updater: './test/mocks/updater/customer-updater',
            },
          ],
        });

        verifyPackageVersion({
          writeFileSyncSpy,
          expectedVersion: '1.1.0',
          filename: 'mix.exs',
          asString: true,
        });

        verifyPackageVersion({
          writeFileSyncSpy,
          expectedVersion: '1.1.0',
          filename: 'version.txt',
          asString: true,
        });
      });

      it('bumps a custom `plain-text` file', async function () {
        mock({
          bump: 'minor',
          realTestFiles: [
            {
              filename: 'VERSION_TRACKER.txt',
              path: './test/mocks/VERSION-1.0.0.txt',
            },
          ],
        });
        await exec({
          bumpFiles: [{ filename: 'VERSION_TRACKER.txt', type: 'plain-text' }],
        });
        verifyPackageVersion({
          writeFileSyncSpy,
          expectedVersion: '1.1.0',
          filename: 'VERSION_TRACKER.txt',
          asString: true,
        });
      });

      it('displays the new version from custom bumper with --dry-run', async function () {
        mock({
          bump: 'minor',
          realTestFiles: [
            {
              filename: 'increment-version.txt',
              path: './test/mocks/increment-version.txt',
            },
          ],
        });

        const origInfo = console.info;
        const capturedOutput = [];
        console.info = (...args) => {
          capturedOutput.push(...args);
          origInfo(...args);
        };

        try {
          await exec({
            bumpFiles: [
              {
                filename: 'increment-version.txt',
                updater: './test/mocks/updater/increment-updater',
              },
            ],
            dryRun: true,
          });

          const logOutput = capturedOutput.join(' ');
          expect(stripAnsi(logOutput)).toContain(
            'bumping version in increment-version.txt from 1 to 2',
          );
        } finally {
          console.info = origInfo;
        }
      });
    });

    describe('custom `packageFiles` support', function () {
      afterEach(unmock);

      it('reads and writes to a custom `plain-text` file', async function () {
        mock({
          bump: 'minor',
          realTestFiles: [
            {
              filename: 'VERSION_TRACKER.txt',
              path: './test/mocks/VERSION-6.3.1.txt',
            },
          ],
        });

        await exec({
          packageFiles: [
            { filename: 'VERSION_TRACKER.txt', type: 'plain-text' },
          ],
          bumpFiles: [{ filename: 'VERSION_TRACKER.txt', type: 'plain-text' }],
        });

        verifyPackageVersion({
          writeFileSyncSpy,
          expectedVersion: '6.4.0',
          filename: 'VERSION_TRACKER.txt',
          asString: true,
        });
      });

      it('allows same object to be used in packageFiles and bumpFiles', async function () {
        mock({
          bump: 'minor',
          realTestFiles: [
            {
              filename: 'VERSION_TRACKER.txt',
              path: './test/mocks/VERSION-6.3.1.txt',
            },
          ],
        });
        const origWarn = console.warn;

        console.warn = () => {
          throw new Error('console.warn should not be called');
        };

        const filedesc = {
          filename: 'VERSION_TRACKER.txt',
          type: 'plain-text',
        };

        try {
          await exec({ packageFiles: [filedesc], bumpFiles: [filedesc] });
          verifyPackageVersion({
            writeFileSyncSpy,
            expectedVersion: '6.4.0',
            filename: 'VERSION_TRACKER.txt',
            asString: true,
          });
        } finally {
          console.warn = origWarn;
        }
      });

      it('bumps version in Python `pyproject.toml` file', async function () {
        const expected = fs.readFileSync(
          './test/mocks/pyproject-1.1.0.toml',
          'utf-8',
        );

        const filename = 'python.toml';
        mock({
          bump: 'minor',
          realTestFiles: [
            {
              filename,
              path: './test/mocks/pyproject-1.0.0.toml',
            },
          ],
        });

        await exec({
          packageFiles: [{ filename, type: 'python' }],
          bumpFiles: [{ filename, type: 'python' }],
        });

        // filePath is the first arg passed to writeFileSync
        const packageJsonWriteFileSynchCall = findWriteFileCallForPath({
          writeFileSyncSpy,
          filename,
        });

        if (!packageJsonWriteFileSynchCall) {
          throw new Error(`writeFileSynch not invoked with path ${filename}`);
        }

        const calledWithContentStr = packageJsonWriteFileSynchCall[1];
        expect(calledWithContentStr).toEqual(expected);
      });
    });

    it('`packageFiles` are bumped along with `bumpFiles` defaults [commit-and-tag-version#533]', async function () {
      mock({
        bump: 'minor',
        testFiles: [
          {
            path: '.gitignore',
            value: '',
          },
          {
            path: 'package-lock.json',
            value: { version: '1.0.0' },
          },
        ],
        realTestFiles: [
          {
            filename: 'manifest.json',
            path: './test/mocks/manifest-6.3.1.json',
          },
        ],
        tags: ['v1.0.0'],
      });

      await exec({
        packageFiles: [
          {
            filename: 'manifest.json',
            type: 'json',
          },
        ],
      });

      verifyPackageVersion({
        writeFileSyncSpy,
        expectedVersion: '6.4.0',
        filename: 'package.json',
      });
      verifyPackageVersion({
        writeFileSyncSpy,
        expectedVersion: '6.4.0',
        filename: 'package-lock.json',
      });
      verifyPackageVersion({
        writeFileSyncSpy,
        expectedVersion: '6.4.0',
        filename: 'manifest.json',
      });
    });

    it('bumps version in OpenAPI `openapi.yaml` file with CRLF Line Endings', async function () {
      const expected = fs.readFileSync(
        './test/mocks/openapi-1.3.0-crlf.yaml',
        'utf-8',
      );
      const filename = 'openapi.yaml';
      mock({
        bump: 'minor',
        realTestFiles: [
          {
            filename,
            path: './test/mocks/openapi-1.2.3-crlf.yaml',
          },
        ],
      });
      await exec({
        packageFiles: [{ filename, type: 'openapi' }],
        bumpFiles: [{ filename, type: 'openapi' }],
      });

      // filePath is the first arg passed to writeFileSync
      const packageJsonWriteFileSynchCall = findWriteFileCallForPath({
        writeFileSyncSpy,
        filename,
      });

      if (!packageJsonWriteFileSynchCall) {
        throw new Error(`writeFileSynch not invoked with path ${filename}`);
      }

      const calledWithContentStr = packageJsonWriteFileSynchCall[1];
      expect(calledWithContentStr).toEqual(expected);
    });

    it('bumps version in OpenAPI `openapi.yaml` file with LF Line Endings', async function () {
      const expected = fs.readFileSync(
        './test/mocks/openapi-1.3.0-lf.yaml',
        'utf-8',
      );
      const filename = 'openapi.yaml';
      mock({
        bump: 'minor',
        realTestFiles: [
          {
            filename,
            path: './test/mocks/openapi-1.2.3-lf.yaml',
          },
        ],
      });
      await exec({
        packageFiles: [{ filename, type: 'openapi' }],
        bumpFiles: [{ filename, type: 'openapi' }],
      });

      // filePath is the first arg passed to writeFileSync
      const packageJsonWriteFileSynchCall = findWriteFileCallForPath({
        writeFileSyncSpy,
        filename,
      });

      if (!packageJsonWriteFileSynchCall) {
        throw new Error(`writeFileSynch not invoked with path ${filename}`);
      }

      const calledWithContentStr = packageJsonWriteFileSynchCall[1];
      expect(calledWithContentStr).toEqual(expected);
    });

    it('bumps version in Maven `pom.xml` file with CRLF Line Endings', async function () {
      const expected = fs.readFileSync(
        './test/mocks/pom-6.4.0-crlf.xml',
        'utf-8',
      );
      const filename = 'pom.xml';
      mock({
        bump: 'minor',
        realTestFiles: [
          {
            filename,
            path: './test/mocks/pom-6.3.1-crlf.xml',
          },
        ],
      });
      await exec({
        packageFiles: [{ filename, type: 'maven' }],
        bumpFiles: [{ filename, type: 'maven' }],
      });

      // filePath is the first arg passed to writeFileSync
      const packageJsonWriteFileSynchCall = findWriteFileCallForPath({
        writeFileSyncSpy,
        filename,
      });

      if (!packageJsonWriteFileSynchCall) {
        throw new Error(`writeFileSynch not invoked with path ${filename}`);
      }

      const calledWithContentStr = packageJsonWriteFileSynchCall[1];
      expect(calledWithContentStr).toEqual(expected);
    });

    it('bumps version in Maven `pom.xml` file with LF Line Endings', async function () {
      const expected = fs.readFileSync(
        './test/mocks/pom-6.4.0-lf.xml',
        'utf-8',
      );
      const filename = 'pom.xml';
      mock({
        bump: 'minor',
        realTestFiles: [
          {
            filename,
            path: './test/mocks/pom-6.3.1-lf.xml',
          },
        ],
      });
      await exec({
        packageFiles: [{ filename, type: 'maven' }],
        bumpFiles: [{ filename, type: 'maven' }],
      });

      // filePath is the first arg passed to writeFileSync
      const packageJsonWriteFileSynchCall = findWriteFileCallForPath({
        writeFileSyncSpy,
        filename,
      });

      if (!packageJsonWriteFileSynchCall) {
        throw new Error(`writeFileSynch not invoked with path ${filename}`);
      }

      const calledWithContentStr = packageJsonWriteFileSynchCall[1];
      expect(calledWithContentStr).toEqual(expected);
    });

    it('bumps version in Gradle `build.gradle.kts` file', async function () {
      const expected = fs.readFileSync(
        './test/mocks/build-6.4.0.gradle.kts',
        'utf-8',
      );

      const filename = 'build.gradle.kts';
      mock({
        bump: 'minor',
        realTestFiles: [
          {
            filename,
            path: './test/mocks/build-6.3.1.gradle.kts',
          },
        ],
      });

      await exec({
        packageFiles: [{ filename, type: 'gradle' }],
        bumpFiles: [{ filename, type: 'gradle' }],
      });

      // filePath is the first arg passed to writeFileSync
      const packageJsonWriteFileSynchCall = findWriteFileCallForPath({
        writeFileSyncSpy,
        filename,
      });

      if (!packageJsonWriteFileSynchCall) {
        throw new Error(`writeFileSynch not invoked with path ${filename}`);
      }

      const calledWithContentStr = packageJsonWriteFileSynchCall[1];
      expect(calledWithContentStr).toEqual(expected);
    });

    it('bumps version in .NET `Project.csproj` file', async function () {
      const expected = fs.readFileSync(
        './test/mocks/Project-6.4.0.csproj',
        'utf-8',
      );
      const filename = 'Project.csproj';
      mock({
        bump: 'minor',
        realTestFiles: [
          {
            filename,
            path: './test/mocks/Project-6.3.1.csproj',
          },
        ],
      });
      await exec({
        packageFiles: [{ filename, type: 'csproj' }],
        bumpFiles: [{ filename, type: 'csproj' }],
      });

      // filePath is the first arg passed to writeFileSync
      const packageJsonWriteFileSynchCall = findWriteFileCallForPath({
        writeFileSyncSpy,
        filename,
      });

      if (!packageJsonWriteFileSynchCall) {
        throw new Error(`writeFileSynch not invoked with path ${filename}`);
      }

      const calledWithContentStr = packageJsonWriteFileSynchCall[1];
      expect(calledWithContentStr).toEqual(expected);
    });

    it('bumps version # in npm-shrinkwrap.json', async function () {
      mock({
        bump: 'minor',
        testFiles: [
          {
            path: 'npm-shrinkwrap.json',
            value: { version: '1.0.0' },
          },
        ],
        tags: ['v1.0.0'],
      });

      await exec();

      verifyPackageVersion({
        writeFileSyncSpy,
        expectedVersion: '1.1.0',
        filename: 'npm-shrinkwrap.json',
      });
      verifyPackageVersion({ writeFileSyncSpy, expectedVersion: '1.1.0' });
    });

    it('bumps version # in package-lock.json', async function () {
      mock({
        bump: 'minor',
        testFiles: [
          {
            path: '.gitignore',
            value: '',
          },
          {
            path: 'package-lock.json',
            value: { version: '1.0.0' },
          },
        ],
        tags: ['v1.0.0'],
      });
      await exec();

      verifyPackageVersion({
        writeFileSyncSpy,
        expectedVersion: '1.1.0',
        filename: 'package-lock.json',
      });
      verifyPackageVersion({ writeFileSyncSpy, expectedVersion: '1.1.0' });
    });

    it('bumps version in Dart `pubspec.yaml` file', async function () {
      const expected = fs.readFileSync(
        './test/mocks/pubspec-6.4.0.yaml',
        'utf-8',
      );

      const filename = 'pubspec.yaml';
      mock({
        bump: 'minor',
        realTestFiles: [
          {
            filename,
            path: './test/mocks/pubspec-6.3.1.yaml',
          },
        ],
      });

      await exec({
        packageFiles: [{ filename, type: 'yaml' }],
        bumpFiles: [{ filename, type: 'yaml' }],
      });

      // filePath is the first arg passed to writeFileSync
      const packageJsonWriteFileSynchCall = findWriteFileCallForPath({
        writeFileSyncSpy,
        filename,
      });

      if (!packageJsonWriteFileSynchCall) {
        throw new Error(`writeFileSynch not invoked with path ${filename}`);
      }

      const calledWithContentStr = packageJsonWriteFileSynchCall[1];
      expect(calledWithContentStr).toEqual(expected);
    });

    it('bumps version in Dart `pubspec.yaml` file with CRLF line endings', async function () {
      const expected = fs.readFileSync(
        './test/mocks/pubspec-6.4.0-crlf.yaml',
        'utf-8',
      );

      const filename = 'pubspec.yaml';
      mock({
        bump: 'minor',
        realTestFiles: [
          {
            filename,
            path: './test/mocks/pubspec-6.3.1-crlf.yaml',
          },
        ],
      });

      await exec({
        packageFiles: [{ filename, type: 'yaml' }],
        bumpFiles: [{ filename, type: 'yaml' }],
      });

      // filePath is the first arg passed to writeFileSync
      const packageJsonWriteFileSynchCall = findWriteFileCallForPath({
        writeFileSyncSpy,
        filename,
      });

      if (!packageJsonWriteFileSynchCall) {
        throw new Error(`writeFileSynch not invoked with path ${filename}`);
      }

      const calledWithContentStr = packageJsonWriteFileSynchCall[1];
      expect(calledWithContentStr).toEqual(expected);
    });

    describe('skip', function () {
      it('allows bump and changelog generation to be skipped', async function () {
        const changelogContent = 'legacy header format<a name="1.0.0">\n';
        mock({
          bump: 'minor',
          changelog: 'foo\n',
          existingChangelog: changelogContent,
        });

        await exec('--skip.bump true --skip.changelog true');

        expect(writeFileSyncSpy).not.toHaveBeenCalledWith('package.json');
        expect(writeFileSyncSpy).not.toHaveBeenCalledWith('CHANGELOG.md');
      });
    });

    it('does not update files present in .gitignore', async function () {
      const DotGitIgnore = require('dotgitignore');
      jest.mock('dotgitignore');

      DotGitIgnore.mockImplementation(() => {
        return {
          ignore: (filename) => {
            if (filename === 'package-lock.json' || filename === 'bower.json') {
              return true;
            }

            return false;
          },
        };
      });

      mock({
        bump: 'minor',
        testFiles: [
          {
            path: 'bower.json',
            value: { version: '1.0.0' },
          },
          {
            path: 'package-lock.json',
            value: {
              name: '@org/package',
              version: '1.0.0',
              lockfileVersion: 1,
            },
          },
        ],
        tags: ['v1.0.0'],
      });
      await exec();

      // does not bump these as in .gitignore
      expect(writeFileSyncSpy).not.toHaveBeenCalledWith('package-lock.json');
      expect(writeFileSyncSpy).not.toHaveBeenCalledWith('bower.json');

      // should still bump version in package.json
      verifyPackageVersion({ writeFileSyncSpy, expectedVersion: '1.1.0' });

      DotGitIgnore.mockRestore();
    });

    describe('configuration', function () {
      it('--header', async function () {
        mock({ bump: 'minor', existingChangelog: '' });
        await exec('--header="# Welcome to our CHANGELOG.md"');

        verifyNewChangelogContentMatches({
          writeFileSyncSpy,
          expectedContent: /# Welcome to our CHANGELOG.md/,
        });
      });

      it('--issuePrefixes and --issueUrlFormat', async function () {
        const format = 'http://www.foo.com/{{prefix}}{{id}}';
        const prefix = 'ABC-';
        const changelog = ({ preset }) =>
          preset.issueUrlFormat + ':' + preset.issuePrefixes;
        mock({ bump: 'minor', changelog });
        await exec(`--issuePrefixes="${prefix}" --issueUrlFormat="${format}"`);

        verifyNewChangelogContentMatches({
          writeFileSyncSpy,
          expectedContent: `${format}:${prefix}`,
        });
      });
    });

    describe('pre-major', function () {
      it('bumps the minor rather than major, if version < 1.0.0', async function () {
        mock({
          bump: 'minor',
          testFiles: [
            {
              path: 'package.json',
              value: {
                version: '0.5.0',
                repository: { url: 'https://github.com/yargs/yargs.git' },
              },
            },
          ],
        });
        await exec();
        verifyPackageVersion({ writeFileSyncSpy, expectedVersion: '0.6.0' });
      });

      it('bumps major if --release-as=major specified, if version < 1.0.0', async function () {
        mock({
          bump: 'major',
          testFiles: [
            {
              path: 'package.json',
              value: {
                version: '0.5.0',
                repository: { url: 'https://github.com/yargs/yargs.git' },
              },
            },
          ],
        });
        await exec('-r major');
        verifyPackageVersion({ writeFileSyncSpy, expectedVersion: '1.0.0' });
      });
    });
  });

  describe('GHSL-2020-111', function () {
    afterEach(unmock);

    it('does not allow command injection via basic configuration', async function () {
      mock({ bump: 'patch' });
      await exec({
        noVerify: true,
        releaseCommitMessageFormat: 'bla `touch exploit`',
      });
      const stat = shell.test('-f', './exploit');
      expect(stat).toEqual(false);
    });
  });

  describe('with mocked git', function () {
    afterEach(unmock);

    it('--sign signs the commit and tag', async function () {
      const gitArgs = [
        ['add', 'CHANGELOG.md', 'package.json', 'package-lock.json'],
        [
          'commit',
          '-S',
          'CHANGELOG.md',
          'package.json',
          'package-lock.json',
          '-m',
          'chore(release): 1.0.1',
        ],
        ['tag', '-s', 'v1.0.1', '-m', 'chore(release): 1.0.1'],
        ['rev-parse', '--abbrev-ref', 'HEAD'],
      ];

      runExecFile.mockImplementation((_args, cmd, cmdArgs) => {
        expect(cmd).toEqual('git');

        const expected = gitArgs.shift();
        expect(cmdArgs).toEqual(expected);

        if (expected[0] === 'rev-parse') return Promise.resolve('master');

        return Promise.resolve('');
      });

      mock({
        bump: 'patch',
        changelog: 'foo\n',
      });

      await exec('--sign', true);
      expect(gitArgs).toHaveLength(0);
    });

    it('--signedoff adds signed-off-by to the commit message', async function () {
      const gitArgs = [
        ['add', 'CHANGELOG.md', 'package.json', 'package-lock.json'],
        [
          'commit',
          '--signoff',
          'CHANGELOG.md',
          'package.json',
          'package-lock.json',
          '-m',
          'chore(release): 1.0.1',
        ],
        ['tag', '-a', 'v1.0.1', '-m', 'chore(release): 1.0.1'],
        ['rev-parse', '--abbrev-ref', 'HEAD'],
      ];

      runExecFile.mockImplementation((_args, cmd, cmdArgs) => {
        expect(cmd).toEqual('git');

        const expected = gitArgs.shift();
        expect(cmdArgs).toEqual(expected);

        if (expected[0] === 'rev-parse') return Promise.resolve('master');

        return Promise.resolve('');
      });

      mock({
        bump: 'patch',
        changelog: 'foo\n',
      });

      await exec('--signoff', true);
      expect(gitArgs).toHaveLength(0);
    });

    it('--tag-force forces tag replacement', async function () {
      const gitArgs = [
        ['add', 'CHANGELOG.md', 'package.json', 'package-lock.json'],
        [
          'commit',
          'CHANGELOG.md',
          'package.json',
          'package-lock.json',
          '-m',
          'chore(release): 1.0.1',
        ],
        ['tag', '-a', '-f', 'v1.0.1', '-m', 'chore(release): 1.0.1'],
        ['rev-parse', '--abbrev-ref', 'HEAD'],
      ];

      runExecFile.mockImplementation((_args, cmd, cmdArgs) => {
        expect(cmd).toEqual('git');

        const expected = gitArgs.shift();
        expect(cmdArgs).toEqual(expected);

        if (expected[0] === 'rev-parse') return Promise.resolve('master');

        return Promise.resolve('');
      });

      mock({ bump: 'patch', changelog: 'foo\n' });

      await exec('--tag-force', true);
      expect(gitArgs).toHaveLength(0);
    });

    it('fails if git add fails', async function () {
      const gitArgs = [
        ['add', 'CHANGELOG.md', 'package.json', 'package-lock.json'],
      ];
      const gitError = new Error('Command failed: git\nfailed add');

      runExecFile.mockImplementation((_args, cmd, cmdArgs) => {
        expect(cmd).toEqual('git');

        const expected = gitArgs.shift();
        expect(cmdArgs).toEqual(expected);

        if (expected[0] === 'add') {
          return Promise.reject(gitError);
        }
        return Promise.resolve('');
      });

      mock({ bump: 'patch', changelog: 'foo\n' });

      await expect(exec({}, true)).rejects.toThrow(gitError);
    });

    it('fails if git commit fails', async function () {
      const gitArgs = [
        ['add', 'CHANGELOG.md', 'package.json', 'package-lock.json'],
        [
          'commit',
          'CHANGELOG.md',
          'package.json',
          'package-lock.json',
          '-m',
          'chore(release): 1.0.1',
        ],
      ];
      const gitError = new Error('Command failed: git\nfailed commit');

      runExecFile.mockImplementation((_args, cmd, cmdArgs) => {
        expect(cmd).toEqual('git');

        const expected = gitArgs.shift();
        expect(cmdArgs).toEqual(expected);

        if (expected[0] === 'commit') {
          return Promise.reject(gitError);
        }
        return Promise.resolve('');
      });

      mock({ bump: 'patch', changelog: 'foo\n' });

      await expect(exec({}, true)).rejects.toThrow(gitError);
    });

    it('fails if git tag fails', async function () {
      const gitArgs = [
        ['add', 'CHANGELOG.md', 'package.json', 'package-lock.json'],
        [
          'commit',
          'CHANGELOG.md',
          'package.json',
          'package-lock.json',
          '-m',
          'chore(release): 1.0.1',
        ],
        ['tag', '-a', 'v1.0.1', '-m', 'chore(release): 1.0.1'],
      ];
      const gitError = new Error('Command failed: git\nfailed tag');

      runExecFile.mockImplementation((_args, cmd, cmdArgs) => {
        expect(cmd).toEqual('git');

        const expected = gitArgs.shift();
        expect(cmdArgs).toEqual(expected);

        if (expected[0] === 'tag') {
          return Promise.reject(gitError);
        }
        return Promise.resolve('');
      });

      mock({ bump: 'patch', changelog: 'foo\n' });

      await expect(exec({}, true)).rejects.toThrow(gitError);
    });
  });

  // ------- Verifiers ------
  function findWriteFileCallForPath({ writeFileSyncSpy, filename }) {
    // filePath is the first arg passed to writeFileSync
    return writeFileSyncSpy.mock.calls.find((args) =>
      args[0].includes(filename),
    );
  }

  function verifyPackageVersion({
    writeFileSyncSpy,
    expectedVersion,
    filename = 'package.json',
    asString = false,
  }) {
    // filePath is the first arg passed to writeFileSync
    const packageJsonWriteFileSynchCall = findWriteFileCallForPath({
      writeFileSyncSpy,
      filename,
    });

    if (!packageJsonWriteFileSynchCall) {
      throw new Error(`writeFileSynch not invoked with path ${filename}`);
    }

    const calledWithContentStr = packageJsonWriteFileSynchCall[1];
    if (!asString) {
      // parse to JSON and verify has property
      const calledWithContent = JSON.parse(calledWithContentStr);

      expect(calledWithContent).toHaveProperty('version');
      expect(calledWithContent.version).toEqual(expectedVersion);
    } else {
      // for non-JSON files i.e. .exs and .txt just verify version exists
      if (filename.includes('.exs')) {
        expect(calledWithContentStr).toMatch(`version: "${expectedVersion}"`);
      } else {
        expect(calledWithContentStr).toMatch(expectedVersion);
      }
    }
  }

  function verifyFileContentEquals({
    writeFileSyncSpy,
    content,
    filename = 'package.json',
  }) {
    // filePath is the first arg passed to writeFileSync
    const packageJsonWriteFileSynchCall = findWriteFileCallForPath({
      writeFileSyncSpy,
      filename,
    });

    if (!packageJsonWriteFileSynchCall) {
      throw new Error('writeFileSynch not invoked with path package.json');
    }

    const calledWithContentStr = packageJsonWriteFileSynchCall[1];

    expect(calledWithContentStr).toEqual(content);
  }

  function verifyNewChangelogContentMatches({
    writeFileSyncSpy,
    expectedContent,
  }) {
    const changelogWriteFileSynchCall = findWriteFileCallForPath({
      writeFileSyncSpy,
      filename: 'CHANGELOG.md',
    });

    if (!changelogWriteFileSynchCall) {
      throw new Error('writeFileSynch not invoked with path CHANGELOG.md');
    }

    const calledWithContent = changelogWriteFileSynchCall[1];
    expect(calledWithContent).toMatch(expectedContent);
  }

  function verifyNewChangelogContentEquals({
    writeFileSyncSpy,
    expectedContent,
  }) {
    const changelogWriteFileSynchCall = findWriteFileCallForPath({
      writeFileSyncSpy,
      filename: 'CHANGELOG.md',
    });

    if (!changelogWriteFileSynchCall) {
      throw new Error('writeFileSynch not invoked with path CHANGELOG.md');
    }

    const calledWithContent = changelogWriteFileSynchCall[1];
    expect(calledWithContent).toEqual(expectedContent);
  }

  function verifyNewChangelogContentDoesNotMatch({
    writeFileSyncSpy,
    expectedContent,
  }) {
    const changelogWriteFileSynchCall = findWriteFileCallForPath({
      writeFileSyncSpy,
      filename: 'CHANGELOG.md',
    });

    if (!changelogWriteFileSynchCall) {
      throw new Error('writeFileSynch not invoked with path CHANGELOG.md');
    }

    const calledWithContent = changelogWriteFileSynchCall[1];
    expect(calledWithContent).not.toMatch(expectedContent);
  }

  function verifyLogPrinted({ consoleInfoSpy, expectedLog }) {
    const consoleInfoLogs = consoleInfoSpy.mock.calls.map((args) => args[0]);
    const desiredLog = consoleInfoLogs.find((log) => log.includes(expectedLog));
    expect(desiredLog).not.toBeUndefined();
    expect(desiredLog).toMatch(expectedLog);
  }
});
