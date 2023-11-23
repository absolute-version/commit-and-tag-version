'use strict';

const shell = require('shelljs');
const fs = require('fs');

const mockers = require('./test-utils/mockers');

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

// Really picky about running - works fine when run individually or in it's on file/jest-runner
// but falls over if run as part of all tests in config-files.test
describe('invalid .versionrc', function () {
  beforeEach(function () {
    shell.rm('-rf', 'tmp');
    shell.config.silent = true;
    shell.mkdir('tmp');
    shell.cd('tmp');

    fs.writeFileSync(
      'package.json',
      JSON.stringify({ version: '1.0.0' }),
      'utf-8',
    );
  });

  afterEach(function () {
    shell.cd('../');
    shell.rm('-rf', 'tmp');
  });

  it('throws an error when a non-object is returned from .versionrc.js', async function () {
    mock({ bump: 'minor' });
    fs.writeFileSync('.versionrc.js', 'module.exports = 3', 'utf-8');

    expect(exec).toThrow(/Invalid configuration/);
  });
});
