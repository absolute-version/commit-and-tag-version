const shell = require('shelljs');
const fs = require('fs');

function exec(opt) {
  const cli = require('../command');
  opt = cli.parse(`commit-and-tag-version ${opt} --silent`);
  opt.skip = { commit: true, tag: true };
  return require('../index')(opt);
}

function setupTempGitRepo() {
  shell.rm('-rf', 'preset-temp');
  shell.config.silent = true;
  shell.mkdir('preset-temp');
  shell.cd('preset-temp');
  shell.exec('git init');
  shell.exec('git config commit.gpgSign false');
  shell.exec('git config core.autocrlf false');
  shell.exec('git commit --allow-empty -m "initial commit"');
  shell.exec('git commit --allow-empty -m "feat: A feature commit."');
  shell.exec('git commit --allow-empty -m "perf: A performance change."');
  shell.exec('git commit --allow-empty -m "chore: A chore commit."');
  shell.exec('git commit --allow-empty -m "ci: A ci commit."');
  shell.exec('git commit --allow-empty -m "custom: A custom commit."');
}

function resetShell() {
  shell.cd('../');
  shell.rm('-rf', 'preset-temp');
}

describe('presets', function () {
  beforeEach(function () {
    setupTempGitRepo();
  });

  afterEach(function () {
    resetShell();
  });

  it('Conventional Commits (default)', async function () {
    await exec();
    const content = fs.readFileSync('CHANGELOG.md', 'utf-8');
    expect(content).toContain('### Features');
    expect(content).not.toContain('### Performance Improvements');
    expect(content).not.toContain('### Custom');
  });

  it('Angular', async function () {
    await exec('--preset angular');
    const content = fs.readFileSync('CHANGELOG.md', 'utf-8');
    expect(content).toContain('### Features');
    expect(content).toContain('### Performance Improvements');
    expect(content).not.toContain('### Custom');
  });
});
