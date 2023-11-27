'use strict';

const shell = require('shelljs');
const fs = require('fs');

const mockers = require('./mocks/jest-mocks');

// Jest swallows most standard console logs not explicitly defined into a custom logger
// see: https://stackoverflow.com/questions/51555568/remove-logging-the-origin-line-in-jest
const consoleWarnSpy = jest.spyOn(global.console, 'warn').mockImplementation();
const consoleInfoSpy = jest.spyOn(global.console, 'info').mockImplementation();

function exec(opt = '') {
  if (typeof opt === 'string') {
    const cli = require('../command');
    opt = cli.parse(`commit-and-tag-version ${opt}`);
  }
  return require('../index')(opt);
}

function writePackageJson(version, option) {
  const pkg = Object.assign({}, option, { version });
  fs.writeFileSync('package.json', JSON.stringify(pkg), 'utf-8');
}

function getPackageVersion() {
  return JSON.parse(fs.readFileSync('package.json', 'utf-8')).version;
}

/**
 * Mock external conventional-changelog modules
 *
 * bump: 'major' | 'minor' | 'patch' | Error | (opt, parserOpts, cb) => { cb(err) | cb(null, { releaseType }) }
 * changelog?: string | Error | Array<string | Error | (opt) => string | null>
 * tags?: string[] | Error
 */
function mock({ bump, changelog, tags }) {
  if (bump === undefined) throw new Error('bump must be defined for mock()');

  mockers.mockRecommendedBump({ bump });

  if (!Array.isArray(changelog)) changelog = [changelog];
  mockers.mockConventionalChangelog({ changelog });

  mockers.mockGitSemverTags({ tags });
}

function getLog(expectedLog, spy = consoleInfoSpy) {
  const consoleInfoLogs = spy.mock.calls.map((args) => args[0]);
  return consoleInfoLogs.find((log) => log.includes(expectedLog));
}

function verifyLogPrinted(expectedLog, spy = consoleInfoSpy) {
  const logType = spy === consoleInfoSpy ? 'info' : 'error';
  const desiredLog = getLog(expectedLog, spy);
  if (desiredLog) {
    expect(desiredLog).toMatch(expectedLog);
  } else {
    expect(`no ${logType} Log printed matching`).toMatch(expectedLog);
  }
}

function verifyLogNotPrinted(expectedLog, spy = consoleInfoSpy) {
  const desiredLog = getLog(expectedLog, spy);
  expect(desiredLog).toBeUndefined();
}

function clearCapturedSpyCalls() {
  consoleInfoSpy.mockClear();
  consoleWarnSpy.mockClear();
}

function resetShell() {
  shell.cd('../');
  shell.rm('-rf', 'git-repo-temp');
}

function setupTempGitRepo() {
  shell.rm('-rf', 'git-repo-temp');
  shell.config.silent = true;
  shell.mkdir('git-repo-temp');
  shell.cd('git-repo-temp');
  shell.exec('git init');
  shell.exec('git config commit.gpgSign false');
  shell.exec('git config core.autocrlf false');
  shell.exec('git commit --allow-empty -m"root-commit"');
}

describe('git', function () {
  function setup() {
    setupTempGitRepo();
    writePackageJson('1.0.0');
  }

  function reset() {
    resetShell();

    clearCapturedSpyCalls();
  }

  beforeEach(function () {
    setup();
  });

  afterEach(function () {
    reset();
  });

  describe('tagPrefix', function () {
    beforeEach(function () {
      setup();
    });

    afterEach(function () {
      reset();
    });

    // TODO: Use unmocked git-semver-tags and stage a git environment
    it('will add prefix onto tag based on version from package', async function () {
      writePackageJson('1.2.0');
      mock({ bump: 'minor', tags: ['p-v1.2.0'] });
      await exec('--tag-prefix p-v');
      expect(shell.exec('git tag').stdout).toMatch(/p-v1\.3\.0/);
    });

    it('will add prefix onto tag via when gitTagFallback is true and no package [cli]', async function () {
      shell.rm('package.json');
      mock({
        bump: 'minor',
        tags: ['android/production/v1.2.0', 'android/production/v1.0.0'],
      });
      await exec('--tag-prefix android/production/v');
      expect(shell.exec('git tag').stdout).toMatch(
        /android\/production\/v1\.3\.0/,
      );
    });

    it('will add prefix onto tag via when gitTagFallback is true and no package [options]', async function () {
      mock({
        bump: 'minor',
        tags: ['android/production/v1.2.0', 'android/production/v1.0.0'],
      });
      await exec({ tagPrefix: 'android/production/v', packageFiles: [] });
      expect(shell.exec('git tag').stdout).toMatch(
        /android\/production\/v1\.3\.0/,
      );
    });
  });

  it('formats the commit and tag messages appropriately', async function () {
    mock({ bump: 'minor', tags: ['v1.0.0'] });
    await exec({});
    // check last commit message
    expect(shell.exec('git log --oneline -n1').stdout).toMatch(
      /chore\(release\): 1\.1\.0/,
    );
    // check annotated tag message
    expect(shell.exec('git tag -l -n1 v1.1.0').stdout).toMatch(
      /chore\(release\): 1\.1\.0/,
    );
  });

  it('formats the tag if --first-release is true', async function () {
    writePackageJson('1.0.1');
    mock({ bump: 'minor' });
    await exec('--first-release');
    expect(shell.exec('git tag').stdout).toMatch(/1\.0\.1/);
  });

  it('commits all staged files', async function () {
    fs.writeFileSync(
      'CHANGELOG.md',
      'legacy header format<a name="1.0.0">\n',
      'utf-8',
    );
    fs.writeFileSync('STUFF.md', 'stuff\n', 'utf-8');
    shell.exec('git add STUFF.md');

    mock({ bump: 'patch', changelog: 'release 1.0.1\n', tags: ['v1.0.0'] });
    await exec('--commit-all');
    const status = shell.exec('git status --porcelain').stdout; // see http://unix.stackexchange.com/questions/155046/determine-if-git-working-directory-is-clean-from-a-script
    expect(status).toEqual('');
    expect(status).not.toMatch(/STUFF.md/);

    const content = fs.readFileSync('CHANGELOG.md', 'utf-8');
    expect(content).toMatch(/1\.0\.1/);
    expect(content).not.toMatch(/legacy header format/);
  });

  it('does not run git hooks if the --no-verify flag is passed', async function () {
    fs.writeFileSync(
      '.git/hooks/pre-commit',
      '#!/bin/sh\necho "precommit ran"\nexit 1',
      'utf-8',
    );
    fs.chmodSync('.git/hooks/pre-commit', '755');

    mock({ bump: 'minor' });
    await exec('--no-verify');
    await exec('-n');
  });

  it('replaces tags if version not bumped', async function () {
    mock({ bump: 'minor', tags: ['v1.0.0'] });
    await exec({});
    expect(shell.exec('git describe').stdout).toMatch(/v1\.1\.0/);
    await exec('--tag-force --skip.bump');
    expect(shell.exec('git describe').stdout).toMatch(/v1\.1\.0/);
  });

  it('allows the commit phase to be skipped', async function () {
    const changelogContent = 'legacy header format<a name="1.0.0">\n';
    writePackageJson('1.0.0');
    fs.writeFileSync('CHANGELOG.md', changelogContent, 'utf-8');

    mock({ bump: 'minor', changelog: 'new feature\n' });
    await exec('--skip.commit true');
    expect(getPackageVersion()).toEqual('1.1.0');
    const content = fs.readFileSync('CHANGELOG.md', 'utf-8');
    expect(content).toMatch(/new feature/);
    expect(shell.exec('git log --oneline -n1').stdout).toMatch(/root-commit/);
  });

  it('dry-run skips all non-idempotent steps', async function () {
    shell.exec('git tag -a v1.0.0 -m "my awesome first release"');
    mock({
      bump: 'minor',
      changelog: '### Features\n',
      tags: ['v1.0.0'],
    });
    await exec('--dry-run');
    verifyLogPrinted('### Features');

    expect(shell.exec('git log --oneline -n1').stdout).toMatch(/root-commit/);
    expect(shell.exec('git tag').stdout).toMatch(/1\.0\.0/);
    expect(getPackageVersion()).toEqual('1.0.0');
  });

  it('works fine without specifying a tag id when prereleasing', async function () {
    writePackageJson('1.0.0');
    fs.writeFileSync(
      'CHANGELOG.md',
      'legacy header format<a name="1.0.0">\n',
      'utf-8',
    );
    mock({ bump: 'minor' });
    await exec('--prerelease');
    expect(getPackageVersion()).toEqual('1.1.0-0');
  });

  describe('gitTagFallback', function () {
    beforeEach(function () {
      setup();
    });

    afterEach(function () {
      reset();
    });

    it('defaults to 1.0.0 if no tags in git history', async function () {
      shell.rm('package.json');
      mock({ bump: 'minor' });
      await exec({});
      const output = shell.exec('git tag');
      expect(output.stdout).toContain('v1.1.0');
    });

    it('bases version on greatest version tag, if tags are found', async function () {
      shell.rm('package.json');
      mock({ bump: 'minor', tags: ['v3.9.0', 'v5.0.0', 'v3.0.0'] });
      await exec({});
      const output = shell.exec('git tag');
      expect(output.stdout).toContain('v5.1.0');
    });
  });

  describe('Run ... to publish', function () {
    beforeEach(function () {
      setup();
    });

    afterEach(function () {
      reset();
    });

    it('does normally display `npm publish`', async function () {
      mock({ bump: 'patch' });
      await exec('');
      verifyLogPrinted('npm publish');
    });

    it('can display publish hints with custom npm client name', async function () {
      mock({ bump: 'patch' });
      await exec('--npmPublishHint "yarn publish"');
      verifyLogPrinted('yarn publish');
    });

    it('does not display `npm publish` if the package is private', async function () {
      writePackageJson('1.0.0', { private: true });
      mock({ bump: 'patch' });
      await exec('');
      verifyLogNotPrinted('npm publish');
    });

    it('does not display `npm publish` if there is no package.json', async function () {
      shell.rm('package.json');
      mock({ bump: 'patch' });
      await exec('');
      verifyLogNotPrinted('npm publish');
    });

    it('does not display `all staged files` without the --commit-all flag', async function () {
      mock({ bump: 'patch' });
      await exec('');
      verifyLogNotPrinted('all staged files');
    });

    it('does display `all staged files` if the --commit-all flag is passed', async function () {
      mock({ bump: 'patch' });
      await exec('--commit-all');
      verifyLogPrinted('all staged files');
    });

    it('advises use of --tag prerelease for publishing to npm', async function () {
      writePackageJson('1.0.0');
      fs.writeFileSync(
        'CHANGELOG.md',
        'legacy header format<a name="1.0.0">\n',
        'utf-8',
      );

      mock({ bump: 'patch' });
      await exec('--prerelease');
      verifyLogPrinted('--tag prerelease');
    });

    it('advises use of --tag alpha for publishing to npm when tagging alpha', async function () {
      writePackageJson('1.0.0');
      fs.writeFileSync(
        'CHANGELOG.md',
        'legacy header format<a name="1.0.0">\n',
        'utf-8',
      );

      mock({ bump: 'patch' });
      await exec('--prerelease alpha');
      verifyLogPrinted('--tag alpha');
    });

    it('does not advise use of --tag prerelease for private modules', async function () {
      writePackageJson('1.0.0', { private: true });
      fs.writeFileSync(
        'CHANGELOG.md',
        'legacy header format<a name="1.0.0">\n',
        'utf-8',
      );

      mock({ bump: 'minor' });
      await exec('--prerelease');
      verifyLogNotPrinted('--tag prerelease');
    });
  });
});
