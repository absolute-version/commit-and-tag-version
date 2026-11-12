import fs from 'fs';
import os from 'os';
import path from 'path';
import { getConfiguration, mergeConfiguration } from '../lib/configuration.js';

describe('mergeConfiguration', function () {
  it('shallow-merges nested plain objects and replaces other values', function () {
    expect(
      mergeConfiguration(
        {
          tagPrefix: 'v',
          skip: { tag: true, changelog: false },
          scripts: { prerelease: './a.sh' },
          bumpFiles: ['package.json'],
        },
        {
          tagPrefix: 'pkg@v',
          skip: { commit: true },
          scripts: { postbump: './b.sh' },
          bumpFiles: ['Cargo.toml'],
        },
      ),
    ).toEqual({
      tagPrefix: 'pkg@v',
      skip: { tag: true, changelog: false, commit: true },
      scripts: { prerelease: './a.sh', postbump: './b.sh' },
      bumpFiles: ['Cargo.toml'],
    });
  });
});

describe('getConfiguration', function () {
  let tmpDir;
  let previousCwd;

  beforeEach(function () {
    previousCwd = process.cwd();
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'cats-config-'));
    process.chdir(tmpDir);
  });

  afterEach(function () {
    process.chdir(previousCwd);
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  it('returns an empty object when no config file is present', function () {
    expect(getConfiguration()).toEqual({});
  });

  it('loads a single explicit config path', function () {
    fs.mkdirSync('shared');
    fs.writeFileSync(
      'shared/.versionrc.json',
      JSON.stringify({ tagPrefix: 'shared@v', skip: { tag: true } }),
    );

    expect(getConfiguration('shared/.versionrc.json')).toEqual({
      tagPrefix: 'shared@v',
      skip: { tag: true },
    });
  });

  it('merges multiple explicit config paths (later overrides earlier)', function () {
    fs.mkdirSync('shared');
    fs.mkdirSync('pkg');
    fs.writeFileSync(
      'shared/.versionrc.json',
      JSON.stringify({
        skip: { tag: true },
        scripts: { prerelease: './shared.sh' },
        tagPrefix: 'v',
      }),
    );
    fs.writeFileSync(
      'pkg/.versionrc.json',
      JSON.stringify({
        path: '.',
        tagPrefix: 'mypackage@v',
        scripts: { postbump: './pkg.sh' },
      }),
    );

    expect(
      getConfiguration(['shared/.versionrc.json', 'pkg/.versionrc.json']),
    ).toEqual({
      skip: { tag: true },
      scripts: { prerelease: './shared.sh', postbump: './pkg.sh' },
      tagPrefix: 'mypackage@v',
      path: '.',
    });
  });

  it('treats an empty array like an omitted --config (auto-discover)', function () {
    fs.writeFileSync(
      '.versionrc.json',
      JSON.stringify({ issueUrlFormat: 'https://example.test/{{id}}' }),
    );
    expect(getConfiguration([])).toEqual({
      issueUrlFormat: 'https://example.test/{{id}}',
    });
  });

  it('treats yargs array default [null] like an omitted --config', function () {
    fs.writeFileSync(
      '.versionrc.json',
      JSON.stringify({ issueUrlFormat: 'https://example.test/{{id}}' }),
    );
    expect(getConfiguration([null])).toEqual({
      issueUrlFormat: 'https://example.test/{{id}}',
    });
  });

  it('throws when an explicit config path cannot be found', function () {
    expect(() => getConfiguration('missing/.versionrc.json')).toThrow(
      /Configuration file `missing\/\.versionrc\.json` was not found/,
    );
  });
});
