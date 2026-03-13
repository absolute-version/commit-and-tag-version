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

function setupTempGitRepo() {
  shell.rm('-rf', 'config-keys-temp');
  shell.config.silent = true;
  shell.mkdir('config-keys-temp');
  shell.cd('config-keys-temp');
}

function resetShell() {
  shell.cd('../');
  shell.rm('-rf', 'config-keys-temp');
}

describe('config files', function () {
  beforeEach(function () {
    setupTempGitRepo();

    fs.writeFileSync(
      'package.json',
      JSON.stringify({ version: '1.0.0' }),
      'utf-8',
    );
  });

  afterEach(function () {
    resetShell();
  });

  const configKeys = ['commit-and-tag-version', 'standard-version'];

  configKeys.forEach((configKey) => {
    it(`reads config from package.json key '${configKey}'`, async function () {
      const issueUrlFormat =
        'https://commit-and-tag-version.company.net/browse/{{id}}';
      mock({
        bump: 'minor',
        changelog: ({ preset }) => preset.issueUrlFormat,
      });
      const pkg = {
        version: '1.0.0',
        repository: { url: 'git+https://company@scm.org/office/app.git' },
        [configKey]: { issueUrlFormat },
      };
      fs.writeFileSync('package.json', JSON.stringify(pkg), 'utf-8');

      await exec();
      const content = fs.readFileSync('CHANGELOG.md', 'utf-8');
      expect(content).toMatch(issueUrlFormat);
    });
  });
});
