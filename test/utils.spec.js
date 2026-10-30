import { promises as fsp } from 'fs';
import { detectPMByLockFile } from '../lib/detect-package-manager';
import {
  getParserOpts,
  getWriterOpts,
  getGitRawCommitsOpts,
} from '../lib/preset-loader.js';

let mockFs;

const setLockFile = (lockFile) => {
  if (mockFs) {
    mockFs.mockRestore();
  }
  mockFs = vi.spyOn(fsp, 'access').mockImplementation(async (path) => {
    if (lockFile && path.endsWith(lockFile)) {
      return Promise.resolve();
    }
    return Promise.reject(new Error('Invalid lockfile'));
  });
};

describe('utils', function () {
  it('detectPMByLockFile should work', async function () {
    let pm = await detectPMByLockFile();
    expect(pm).toEqual('npm');

    setLockFile('yarn.lock');
    pm = await detectPMByLockFile();
    expect(pm).toEqual('yarn');

    setLockFile('package-lock.json');
    pm = await detectPMByLockFile();
    expect(pm).toEqual('npm');

    setLockFile('pnpm-lock.yaml');
    pm = await detectPMByLockFile();
    expect(pm).toEqual('pnpm');
  });
});

describe('preset-loader option aliases', function () {
  it('getGitRawCommitsOpts merges commits and prefers gitRawCommitsOpts', function () {
    expect(getGitRawCommitsOpts({})).toBeUndefined();
    expect(
      getGitRawCommitsOpts({ commits: { format: 'from-commits' } }),
    ).toEqual({ format: 'from-commits' });
    expect(
      getGitRawCommitsOpts({
        gitRawCommitsOpts: { format: 'legacy' },
      }),
    ).toEqual({ format: 'legacy' });
    expect(
      getGitRawCommitsOpts({
        commits: { format: 'new', reverse: true },
        gitRawCommitsOpts: { format: 'legacy' },
      }),
    ).toEqual({ format: 'legacy', reverse: true });
  });

  it('getParserOpts / getWriterOpts prefer *Opts over modern aliases', function () {
    expect(
      getParserOpts({
        parser: { noteKeywords: ['A'] },
        parserOpts: { noteKeywords: ['B'] },
      }),
    ).toEqual({ noteKeywords: ['B'] });
    expect(
      getWriterOpts({
        writer: { commitsSort: false },
        writerOpts: { commitsSort: true },
      }),
    ).toEqual({ commitsSort: true });
  });
});
