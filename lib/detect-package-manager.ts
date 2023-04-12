/**
 * modified from <https://github.com/egoist/detect-package-manager/blob/main/src/index.ts>
 * the original code is licensed under MIT
 * modified to support only detecting lock file and not detecting global package manager
 */

import { access } from 'fs/promises';
import { resolve } from 'path';

/**
 * Check if a path exists
 */
async function pathExists(p: string) {
  try {
    await access(p)
    return true
  } catch {
    return false
  }
}

async function getTypeofLockFile(cwd: string) {
  const yarnCheck = pathExists(resolve(cwd, 'yarn.lock'));
  const npmCheck = pathExists(resolve(cwd, 'package-lock.json'));
  const pnpmCheck = pathExists(resolve(cwd, 'pnpm-lock.yaml'));

  const isYarn = await yarnCheck;
  const isNpm = await npmCheck;
  const isPnpm = await pnpmCheck;
  if (isYarn) return 'yarn';
  if (isNpm) return 'npm';
  if (isPnpm) return 'pnpm';

  return '';
}

export default async function detectPMByLockFile(cwd = '.') {
  const type = await getTypeofLockFile(cwd)
  if (type) {
    return type
  }
  return 'npm'
}
