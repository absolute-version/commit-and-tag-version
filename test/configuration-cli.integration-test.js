import fs from 'fs';
import os from 'os';
import path from 'path';
import { spawnSync } from 'child_process';

const commandUrl = new URL('../command.js', import.meta.url).href;

// Parse real CLI options in a fresh process, without running any release steps.
function parseConfiguration(cwd, args = []) {
  const result = spawnSync(
    process.execPath,
    [
      '--input-type=module',
      '--eval',
      `import cli from ${JSON.stringify(commandUrl)}; console.log(JSON.stringify(cli.argv));`,
      '--',
      'commit-and-tag-version',
      ...args,
    ],
    { cwd, encoding: 'utf8' },
  );
  expect(result.error).toBeUndefined();
  expect(result.status).toBe(0);
  return { options: JSON.parse(result.stdout), stderr: result.stderr };
}

describe('configuration CLI precedence', function () {
  let tmpDir;

  beforeEach(function () {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'cats-config-cli-'));
  });

  afterEach(function () {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  function writeConfig(file, config) {
    fs.writeFileSync(path.join(tmpDir, file), JSON.stringify(config));
  }

  it.each([
    ['kebab.json', 'camel.json', 'camel@v'],
    ['camel.json', 'kebab.json', 'kebab@v'],
  ])('uses the later file for -c %s -c %s', function (first, last, expected) {
    writeConfig('kebab.json', { 'tag-prefix': 'kebab@v' });
    writeConfig('camel.json', { tagPrefix: 'camel@v' });
    const { options, stderr } = parseConfiguration(tmpDir, [
      '-c',
      first,
      '-c',
      last,
    ]);
    expect(options.tagPrefix).toBe(expected);
    expect(options['tag-prefix']).toBe(expected);
    expect(stderr).toBe('');
  });

  it.each(['--tag-prefix', '--tagPrefix', '-t'])(
    'keeps %s above both config-file styles',
    function (flag) {
      writeConfig('first.json', { 'tag-prefix': 'shared@v' });
      writeConfig('last.json', { tagPrefix: 'pkg@v' });
      const { options, stderr } = parseConfiguration(tmpDir, [
        '-c',
        'first.json',
        '--config',
        'last.json',
        flag,
        'cli@v',
      ]);
      expect(options.tagPrefix).toBe('cli@v');
      expect(options['tag-prefix']).toBe('cli@v');
      expect(stderr).toBe('');
    },
  );

  it('warns for a missing file and still parses the remaining configs', function () {
    writeConfig('first.json', {
      'tag-prefix': 'shared@v',
      skip: { tag: true },
    });
    writeConfig('last.json', { tagPrefix: 'pkg@v', skip: { commit: true } });
    const { options, stderr } = parseConfiguration(tmpDir, [
      '-c',
      'first.json',
      '-c',
      'missing.json',
      '-c',
      'last.json',
    ]);
    expect(options.tagPrefix).toBe('pkg@v');
    expect(options.skip).toEqual({ tag: true, commit: true });
    expect(stderr.trim()).toBe(
      '[commit-and-tag-version] Configuration file `missing.json` was not found.',
    );
  });

  it('replaces array aliases while shallow-merging nested objects', function () {
    writeConfig('first.json', {
      'bump-files': ['package.json'],
      types: [{ type: 'feat', section: 'Features' }],
      scripts: { prerelease: './shared.sh' },
    });
    writeConfig('last.json', {
      bumpFiles: ['Cargo.toml'],
      types: [{ type: 'fix', section: 'Fixes' }],
      scripts: { postbump: './pkg.sh' },
    });
    const { options } = parseConfiguration(tmpDir, [
      '-c',
      'first.json',
      '-c',
      'last.json',
    ]);
    expect(options.bumpFiles).toEqual(['Cargo.toml']);
    expect(options.types).toEqual([{ type: 'fix', section: 'Fixes' }]);
    expect(options.scripts).toEqual({
      prerelease: './shared.sh',
      postbump: './pkg.sh',
    });
  });

  it('still supports a single explicit config', function () {
    writeConfig('single.json', { 'tag-prefix': 'single@v' });
    const { options, stderr } = parseConfiguration(tmpDir, [
      '--config',
      'single.json',
    ]);
    expect(options.tagPrefix).toBe('single@v');
    expect(stderr).toBe('');
  });

  it('still auto-discovers a default config without --config', function () {
    writeConfig('.versionrc.json', { 'tag-prefix': 'default@v' });
    const { options, stderr } = parseConfiguration(tmpDir);
    expect(options.tagPrefix).toBe('default@v');
    expect(stderr).toBe('');
  });
});
