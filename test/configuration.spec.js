import fs from 'fs';
import os from 'os';
import path from 'path';
import { getConfiguration, mergeConfiguration } from '../lib/configuration.js';

describe('mergeConfiguration', function () {
  it.each([
    ['tag-prefix', 'tagPrefix'],
    ['tagPrefix', 'tag-prefix'],
  ])('normalizes %s and %s before merging', function (firstKey, lastKey) {
    expect(
      mergeConfiguration(
        { [firstKey]: 'shared@v', 'bump-files': ['package.json'] },
        { [lastKey]: 'pkg@v', bumpFiles: ['Cargo.toml'] },
      ),
    ).toEqual({ tagPrefix: 'pkg@v', bumpFiles: ['Cargo.toml'] });
  });

  it('preserves nested keys and replaces types rather than combining them', function () {
    expect(
      mergeConfiguration(
        {
          types: [{ type: 'feat', section: 'Features' }],
          scripts: { 'custom-hook': './shared.sh' },
        },
        {
          types: [{ type: 'fix', section: 'Fixes' }],
          scripts: { postbump: './pkg.sh' },
        },
      ),
    ).toEqual({
      types: [{ type: 'fix', section: 'Fixes' }],
      scripts: { 'custom-hook': './shared.sh', postbump: './pkg.sh' },
    });
  });

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

  it('warns and returns an empty config when an explicit path cannot be found', function () {
    fs.writeFileSync(
      '.versionrc.json',
      JSON.stringify({ tagPrefix: 'default@v' }),
    );
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    try {
      expect(getConfiguration('missing/.versionrc.json')).toEqual({});
      expect(warn).toHaveBeenCalledExactlyOnceWith(
        '[commit-and-tag-version] Configuration file `missing/.versionrc.json` was not found.',
      );
    } finally {
      warn.mockRestore();
    }
  });

  it.each([0, 1, 2])(
    'skips a missing config at index %i and loads the others',
    function (index) {
      fs.writeFileSync(
        'first.json',
        JSON.stringify({ tagPrefix: 'first@v', skip: { tag: true } }),
      );
      fs.writeFileSync(
        'last.json',
        JSON.stringify({ tagPrefix: 'last@v', skip: { commit: true } }),
      );
      const files = ['first.json', 'last.json'];
      files.splice(index, 0, 'missing.json');
      const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
      try {
        expect(getConfiguration(files)).toEqual({
          tagPrefix: 'last@v',
          skip: { tag: true, commit: true },
        });
        expect(warn).toHaveBeenCalledExactlyOnceWith(
          '[commit-and-tag-version] Configuration file `missing.json` was not found.',
        );
      } finally {
        warn.mockRestore();
      }
    },
  );
});
