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
  shell.rm('-rf', 'config-files-temp');
  shell.config.silent = true;
  shell.mkdir('config-files-temp');
  shell.cd('config-files-temp');
}

function resetShell() {
  shell.cd('../');
  shell.rm('-rf', 'config-files-temp');
}

describe('config files', function () {
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
    4;
  });

  it('reads config from .versionrc', async function () {
    const issueUrlFormat = 'http://www.foo.com/{{id}}';
    const changelog = ({ preset }) => preset.issueUrlFormat;

    mock({ bump: 'minor', changelog });
    fs.writeFileSync('.versionrc', JSON.stringify({ issueUrlFormat }), 'utf-8');

    await exec();
    const content = fs.readFileSync('CHANGELOG.md', 'utf-8');
    expect(content).toContain(issueUrlFormat);
  });

  it('reads config from .versionrc.json', async function () {
    const issueUrlFormat = 'http://www.foo.com/{{id}}';
    const changelog = ({ preset }) => preset.issueUrlFormat;
    mock({ bump: 'minor', changelog });
    fs.writeFileSync(
      '.versionrc.json',
      JSON.stringify({ issueUrlFormat }),
      'utf-8',
    );

    await exec();
    const content = fs.readFileSync('CHANGELOG.md', 'utf-8');
    expect(content).toContain(issueUrlFormat);
  });

  it('evaluates a config-function from .versionrc.js', async function () {
    const issueUrlFormat = 'http://www.foo.com/{{id}}';
    const src = `module.exports = function() { return ${JSON.stringify({
      issueUrlFormat,
    })} }`;
    const changelog = ({ preset }) => preset.issueUrlFormat;
    mock({ bump: 'minor', changelog });
    fs.writeFileSync('.versionrc.js', src, 'utf-8');

    await exec();
    const content = fs.readFileSync('CHANGELOG.md', 'utf-8');
    expect(content).toContain(issueUrlFormat);
  });

  it('evaluates a config-object from .versionrc.js', async function () {
    const issueUrlFormat = 'http://www.foo.com/{{id}}';
    const src = `module.exports = ${JSON.stringify({ issueUrlFormat })}`;
    const changelog = ({ preset }) => preset.issueUrlFormat;
    mock({ bump: 'minor', changelog });
    fs.writeFileSync('.versionrc.js', src, 'utf-8');

    await exec();
    const content = fs.readFileSync('CHANGELOG.md', 'utf-8');
    expect(content).toContain(issueUrlFormat);
  });
});
