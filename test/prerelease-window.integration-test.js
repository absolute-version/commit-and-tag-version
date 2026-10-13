import shell from 'shelljs';
import fs from 'fs';
import { execFileSync } from 'child_process';
import { fileURLToPath } from 'url';

const CLI = fileURLToPath(new URL('../bin/cli.js', import.meta.url));

/**
 * Regression tests for #310: the bump recommendation and the changelog were
 * generated from commits since the most recent tag of any kind, while the
 * "current version" resolution ignores prereleases with other identifiers.
 * Commits released only in a prerelease fell between the two windows and were
 * counted by neither. These tests spawn the real CLI in a real git repository
 * because the in-process harness mocks the git client's raw commit stream
 * without honouring the `from` range, so it cannot observe the bug.
 */

function setupTestDirectory() {
  shell.rm('-rf', 'prerelease-window-temp');
  shell.config.silent = true;
  shell.mkdir('prerelease-window-temp');
  shell.cd('prerelease-window-temp');
  shell.exec('git init');
  shell.exec('git config commit.gpgSign false');
  shell.exec('git config core.autocrlf false');
  shell.exec('git config user.email "test@example.com"');
  shell.exec('git config user.name "Test"');
  shell.exec('git commit --allow-empty -m"root-commit"');
}

function resetShell() {
  shell.cd('../');
  shell.rm('-rf', 'prerelease-window-temp');
}

function runCli(...args) {
  return execFileSync(process.execPath, [CLI, ...args], {
    encoding: 'utf-8',
  });
}

function commit(message) {
  shell.exec(`git commit --allow-empty -m"${message}"`);
}

function tags() {
  return shell.exec('git tag').stdout.split('\n').filter(Boolean);
}

/**
 * Extract one release's section from CHANGELOG.md. Version headings look like
 * `## 1.1.0 (2026-01-01)` or `# [1.1.0](compare-url) (2026-01-01)` depending
 * on whether a repository URL is known, so match both forms and cut at the
 * next version heading.
 */
function changelogSection(version) {
  const changelog = fs.readFileSync('CHANGELOG.md', 'utf-8');
  const escaped = version.replace(/[.[\]]/g, '\\$&');
  const start = changelog.search(new RegExp(`^#+ \\[?${escaped}[\\] ]`, 'm'));
  expect(start, `no changelog section for ${version}`).toBeGreaterThan(-1);
  const rest = changelog.slice(start);
  const headingEnd = rest.indexOf('\n') + 1;
  const next = rest.slice(headingEnd).search(/^#+ \[?[0-9]/m);
  return next === -1 ? rest : rest.slice(0, headingEnd + next);
}

describe('prerelease bump and changelog windows (#310)', function () {
  beforeEach(function () {
    setupTestDirectory();
    runCli('--first-release');
  });

  afterEach(function () {
    resetShell();
  });

  it('bumps from the last stable release when switching prerelease identifiers', function () {
    commit('feat: add feat');
    runCli('--prerelease', 'dev');
    expect(tags()).toContain('v1.1.0-dev.0');

    commit('fix: add fix');
    runCli('--prerelease', 'rc');

    // Before the fix the feat was invisible: only the fix commit (since the
    // dev tag) was considered, recommending a prepatch from v1.0.0.
    expect(tags()).toContain('v1.1.0-rc.0');
    expect(tags()).not.toContain('v1.0.1-rc.0');
  });

  it('includes changes from earlier prereleases in a new prerelease changelog', function () {
    commit('feat: add feat');
    runCli('--prerelease', 'dev');
    commit('fix: add fix');
    runCli('--prerelease', 'rc');

    const rcSection = changelogSection('1.1.0-rc.0');
    expect(rcSection).toContain('add feat');
    expect(rcSection).toContain('add fix');
  });

  it('graduates a prerelease with --noBumpWhenEmptyChanges', function () {
    commit('feat: add feat');
    runCli('--prerelease', 'rc');
    expect(tags()).toContain('v1.1.0-rc.0');

    // Before the fix no commits were found since the rc tag, so the CLI
    // refused to bump at all.
    runCli('--noBumpWhenEmptyChanges');
    expect(tags()).toContain('v1.1.0');
    expect(changelogSection('1.1.0')).toContain('add feat');
  });

  it('continues a prerelease with the same identifier', function () {
    commit('feat: add feat');
    runCli('--prerelease', 'dev');
    commit('fix: add fix');
    runCli('--prerelease', 'dev');
    expect(tags()).toContain('v1.1.0-dev.1');

    // Only the changes since the previous prerelease with this identifier
    // are listed; the feat is already in the dev.0 section (#349).
    const devSection = changelogSection('1.1.0-dev.1');
    expect(devSection).not.toContain('add feat');
    expect(devSection).toContain('add fix');
    expect(devSection).toContain('v1.1.0-dev.0...v1.1.0-dev.1');
    expect(changelogSection('1.1.0-dev.0')).toContain('add feat');
  });

  it('lists each change once across continued prereleases and again in the stable release', function () {
    commit('feat: add a');
    runCli('--prerelease', 'alpha');
    commit('feat: add b');
    runCli('--prerelease', 'alpha');
    commit('fix: correct c');
    runCli('--prerelease', 'alpha');

    const prereleases = fs
      .readFileSync('CHANGELOG.md', 'utf-8')
      .split(/^#+ \[?1\.0\.0[\] ]/m)[0];
    expect(prereleases.match(/add a/g)).toHaveLength(1);
    expect(prereleases.match(/add b/g)).toHaveLength(1);
    expect(prereleases.match(/correct c/g)).toHaveLength(1);

    runCli();
    const stableSection = changelogSection('1.1.0');
    expect(stableSection).toContain('add a');
    expect(stableSection).toContain('add b');
    expect(stableSection).toContain('correct c');
    expect(stableSection).toContain('v1.0.0...v1.1.0');
  });

  it('covers other prereleases when returning to an earlier identifier', function () {
    commit('feat: add feat');
    runCli('--prerelease', 'dev');
    commit('fix: add fix');
    runCli('--prerelease', 'rc');
    commit('fix: second fix');
    runCli('--prerelease', 'dev');

    const devSection = changelogSection('1.1.0-dev.1');
    expect(devSection).not.toContain('add feat');
    expect(devSection).toContain('add fix');
    expect(devSection).toContain('second fix');
  });

  it('escalates a continued prerelease when a bigger change lands', function () {
    commit('fix: add fix');
    runCli('--prerelease', 'rc');
    expect(tags()).toContain('v1.0.1-rc.0');

    commit('feat: add feat');
    runCli('--prerelease', 'rc');
    expect(tags()).toContain('v1.1.0-rc.0');
  });
});
