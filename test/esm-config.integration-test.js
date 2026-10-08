import shell from 'shelljs';
import fs from 'fs';
import { execFileSync, spawnSync } from 'child_process';
import { fileURLToPath } from 'url';

const CLI = fileURLToPath(new URL('../bin/cli.js', import.meta.url));

/**
 * These tests spawn the real CLI in a child process instead of using the usual
 * in-process harness. That is deliberate: `getConfiguration` loads ESM config
 * files through Node's `require(esm)` (available since 22.12), and under vitest
 * that require is intercepted by the module runner, which throws a Babel
 * SyntaxError on ESM sources — a failure mode that does not exist in
 * production. Only a child process observes the real behavior.
 */

function setupTestDirectory() {
  shell.rm('-rf', 'esm-config-temp');
  shell.config.silent = true;
  shell.mkdir('esm-config-temp');
  shell.cd('esm-config-temp');
  shell.exec('git init');
  shell.exec('git config commit.gpgSign false');
  shell.exec('git config core.autocrlf false');
  shell.exec('git commit --allow-empty -m"root-commit"');
}

function resetShell() {
  shell.cd('../');
  shell.rm('-rf', 'esm-config-temp');
}

function runCli() {
  return execFileSync(process.execPath, [CLI, '--dry-run'], {
    encoding: 'utf-8',
  });
}

describe('ESM config files', function () {
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

  it('reads an ES module config-object from .versionrc.js', function () {
    fs.writeFileSync(
      '.versionrc.js',
      'export default { tagPrefix: "custom-" }',
      'utf-8',
    );

    const output = runCli();
    expect(output).toContain('tagging release custom-1.0.1');
  });

  it('renders a custom writer function imported by an ES module config', function () {
    fs.writeFileSync(
      '.versionrc.js',
      `import { words } from '@conventional-changelog/template'

function commitPartial(_context, commit) {
  return words(commit.subject || commit.header, commit.shortHash)
}

export default {
  writerOpts: {
    commitPartial,
  },
}`,
      'utf-8',
    );
    shell.exec('git commit --allow-empty -m"fix: render custom writer"');

    const result = spawnSync(process.execPath, [CLI, '--dry-run'], {
      encoding: 'utf-8',
    });
    const output = `${result.stdout}${result.stderr}`;

    expect(result.status).toBe(0);
    expect(output).toContain('render custom writer');
    expect(output).not.toContain('commitPartial is not a function');
  });

  it('uses the parser and writer options of a preset used as the config', function () {
    // conventional-changelog >= 7 presets return `parser` and `writer`
    // instead of `parserOpts` and `writerOpts` (#328).
    fs.writeFileSync(
      '.versionrc.js',
      `import createPreset from 'conventional-changelog-conventionalcommits'

export default function () {
  return createPreset({
    types: [{ type: 'feat', section: 'Shiny Features' }],
  })
}`,
      'utf-8',
    );
    shell.exec('git commit --allow-empty -m"feat: add a shiny thing"');

    const output = runCli();
    expect(output).toContain('Shiny Features');
    expect(output).toContain('add a shiny thing');
  });

  it('accepts `parser` options in place of `parserOpts`', function () {
    fs.writeFileSync(
      '.versionrc.js',
      "export default { parser: { noteKeywords: ['HEADS-UP'] } }",
      'utf-8',
    );
    shell.exec(
      'git commit --allow-empty -m"fix: rename an option" -m"HEADS-UP: the old name is gone"',
    );

    const output = runCli();
    expect(output).toContain(
      'bumping version in package.json from 1.0.0 to 2.0.0',
    );
  });

  it('reads an ES module config from .versionrc.mjs', function () {
    fs.writeFileSync(
      '.versionrc.mjs',
      'export default { tagPrefix: "custom-" }',
      'utf-8',
    );

    const output = runCli();
    expect(output).toContain('tagging release custom-1.0.1');
  });

  it('evaluates an ES module config-function', function () {
    fs.writeFileSync(
      '.versionrc.mjs',
      'export default function () { return { tagPrefix: "custom-" }; }',
      'utf-8',
    );

    const output = runCli();
    expect(output).toContain('tagging release custom-1.0.1');
  });

  it('applies the same configuration when written as CommonJS', function () {
    fs.writeFileSync(
      '.versionrc.js',
      'module.exports = { tagPrefix: "custom-" }',
      'utf-8',
    );

    const output = runCli();
    expect(output).toContain('tagging release custom-1.0.1');
  });
});
