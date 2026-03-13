'use strict';

const shell = require('shelljs');
const fs = require('fs');

const mockers = require('./mocks/jest-mocks');

// Jest swallows most standard console logs not explicitly defined into a custom logger
// see: https://stackoverflow.com/questions/51555568/remove-logging-the-origin-line-in-jest
const consoleWarnSpy = jest.spyOn(global.console, 'warn').mockImplementation();

const consoleInfoSpy = jest.spyOn(global.console, 'info').mockImplementation();

const consoleErrorSpy = jest
  .spyOn(global.console, 'error')
  .mockImplementation();

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

function writeHook(hookName, causeError, script) {
  shell.mkdir('-p', 'scripts');
  let content = script || 'console.error("' + hookName + ' ran")';
  content += causeError ? '\nthrow new Error("' + hookName + '-failure")' : '';
  fs.writeFileSync('scripts/' + hookName + '.js', content, 'utf-8');
  fs.chmodSync('scripts/' + hookName + '.js', '755');
}

function setupTempGitRepo() {
  shell.rm('-rf', 'pre-commit-hook-temp');
  shell.config.silent = true;
  shell.mkdir('pre-commit-hook-temp');
  shell.cd('pre-commit-hook-temp');
  shell.exec('git init');
  shell.exec('git config commit.gpgSign false');
  shell.exec('git config core.autocrlf false');
  shell.exec('git commit --allow-empty -m"root-commit"');
}

function setup() {
  setupTempGitRepo();
  writePackageJson('1.0.0');
}

function clearCapturedSpyCalls() {
  consoleInfoSpy.mockClear();
  consoleWarnSpy.mockClear();
  consoleErrorSpy.mockClear();
}

function resetShell() {
  shell.cd('../');
  shell.rm('-rf', 'pre-commit-hook-temp');
}

function reset() {
  resetShell();

  clearCapturedSpyCalls();
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
  const logType = spy === consoleInfoSpy ? 'info' : 'warn';
  const desiredLog = getLog(expectedLog, spy);
  if (desiredLog) {
    expect(desiredLog).toMatch(expectedLog);
  } else {
    expect(`no ${logType} Log printed matching`).toMatch(expectedLog);
  }
}

describe('precommit hook', function () {
  beforeEach(function () {
    setup();
  });

  afterEach(function () {
    reset();
  });

  it('should run the precommit hook when provided via .versionrc.json (#371)', async function () {
    fs.writeFileSync(
      '.versionrc.json',
      JSON.stringify({
        scripts: { precommit: 'node scripts/precommit' },
      }),
      'utf-8',
    );

    writeHook('precommit');
    fs.writeFileSync(
      'CHANGELOG.md',
      'legacy header format<a name="1.0.0">\n',
      'utf-8',
    );
    mock({ bump: 'minor' });
    await exec('');
    verifyLogPrinted('precommit ran', consoleWarnSpy);
  });

  it('should run the precommit hook when provided', async function () {
    writePackageJson('1.0.0', {
      'commit-and-tag-version': {
        scripts: { precommit: 'node scripts/precommit' },
      },
    });
    writeHook('precommit');
    fs.writeFileSync(
      'CHANGELOG.md',
      'legacy header format<a name="1.0.0">\n',
      'utf-8',
    );

    mock({ bump: 'minor' });
    await exec('--patch');
    verifyLogPrinted('precommit ran', consoleWarnSpy);
  });

  it('should run the precommit hook and throw error when precommit fails', async function () {
    writePackageJson('1.0.0', {
      'commit-and-tag-version': {
        scripts: { precommit: 'node scripts/precommit' },
      },
    });
    writeHook('precommit', true);
    fs.writeFileSync(
      'CHANGELOG.md',
      'legacy header format<a name="1.0.0">\n',
      'utf-8',
    );

    mock({ bump: 'minor' });
    let errorMessage = '';
    try {
      await exec('--patch');
    } catch (e) {
      errorMessage = e.message;
    }
    expect(errorMessage).toMatch('precommit-failure');
  });

  it('should allow an alternate commit message to be provided by precommit script', async function () {
    writePackageJson('1.0.0', {
      'commit-and-tag-version': {
        scripts: { precommit: 'node scripts/precommit' },
      },
    });
    writeHook('precommit', false, 'console.log("releasing %s delivers #222")');
    fs.writeFileSync(
      'CHANGELOG.md',
      'legacy header format<a name="1.0.0">\n',
      'utf-8',
    );

    mock({ bump: 'minor' });
    await exec('--patch');
    expect(shell.exec('git log --oneline -n1').stdout).toMatch(/delivers #222/);
  });
});
