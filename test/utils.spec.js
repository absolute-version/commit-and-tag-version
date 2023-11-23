const { promises: fsp } = require('fs');

let mockFs;

const setLockFile = (lockFile) => {
  if (mockFs) {
    mockFs.mockRestore();
  }
  mockFs = jest.spyOn(fsp, 'access').mockImplementation(async (path) => {
    if (lockFile && path.endsWith(lockFile)) {
      return Promise.resolve();
    }
    return Promise.reject(new Error('Invalid lockfile'));
  });
};

describe('utils', function () {
  it('detectPMByLockFile should work', async function () {
    const { detectPMByLockFile } = require('../lib/detect-package-manager');

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
