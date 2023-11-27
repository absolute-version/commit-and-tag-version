'use strict';

const shell = require('shelljs');
const fs = require('fs');

const mockers = require('./mocks/jest-mocks');

function exec() {
  const cli = require('../command');
  const opt = cli.parse('commit-and-tag-version');
  opt.skip = { commit: true, tag: true };
  return require('../index')(opt);
}

/**
 * Mock external conventional-changelog modules
 *
 * Mocks should be unregistered in test cleanup by calling unmock()
 *
 * bump?: 'major' | 'minor' | 'patch' | Error | (opt, parserOpts, cb) => { cb(err) | cb(null, { releaseType }) }
 * changelog?: string | Error | Array<string | Error | (opt) => string | null>
 * tags?: string[] | Error
 */
function mock({ bump, changelog, tags } = {}) {
  mockers.mockRecommendedBump({ bump });

  if (!Array.isArray(changelog)) changelog = [changelog];

  mockers.mockConventionalChangelog({ changelog });

  mockers.mockGitSemverTags({ tags });
}

function setupTestDirectory() {
  shell.rm('-rf', 'invalid-config-temp');
  shell.config.silent = true;
  shell.mkdir('invalid-config-temp');
  shell.cd('invalid-config-temp');
}

function resetShell() {
  shell.cd('../');
  shell.rm('-rf', 'invalid-config-temp');
}

/**
 * This test is very sensitive to the setup of "tmp" directories and must currently be run in it's own "Jest" runner instance.
 * By default Jest spawns a Runner per-test file even if running serially each test in a File
 * When we refactored from Mocha -> Jest, if this test was run as part of a larger test-suite, it would always fail, due to presence of a valid .verisonrc
 * somewhere in the "real" or "tmp" filesystem, despite the shell code seemingly setting up and tearing down correctly
 */
describe('invalid .versionrc', function () {
  beforeEach(function () {
    setupTestDirectory();

    fs.writeFileSync(
      'package.json',
      JSON.stringify({ version: '1.0.0' }),
      'utf-8',
    );
  });

  afterEach(function () {
    resetShell();
  });

  it('throws an error when a non-object is returned from .versionrc.js', async function () {
    mock({ bump: 'minor' });
    fs.writeFileSync('.versionrc.js', 'module.exports = 3', 'utf-8');

    expect(exec).toThrow(/Invalid configuration/);
  });
});
