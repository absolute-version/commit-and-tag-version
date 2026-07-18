import { promises as fsp } from 'fs';
import { detectPMByLockFile } from '../lib/detect-package-manager';

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
