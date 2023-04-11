/**
 * modified from <https://github.com/egoist/detect-package-manager/blob/main/src/index.ts>
 * the original code is licensed under MIT
 * modified to support only detecting lock file and not detecting global package manager
 */

import { promises as fs } from 'fs';
import { resolve } from 'path';

/**
 * Check if a path exists
 */
async function pathExists (p: string) {
  try {
    await fs.access(p)
    return true
  } catch {
    return false
  }
}

function getTypeofLockFile (cwd = '.') {
  return Promise.all([
    pathExists(resolve(cwd, 'yarn.lock')),
    pathExists(resolve(cwd, 'package-lock.json')),
    pathExists(resolve(cwd, 'pnpm-lock.yaml'))
  ]).then(([isYarn, isNpm, isPnpm]) => {
    let value = null

    if (isYarn) {
      value = 'yarn'
    } else if (isPnpm) {
      value = 'pnpm'
    } else if (isNpm) {
      value = 'npm'
    }

    return value
  })
}

const detectPMByLockFile = async (cwd: string) => {
  const type = await getTypeofLockFile(cwd)
  if (type) {
    return type
  }

  return 'npm'
}

export default detectPMByLockFile;
