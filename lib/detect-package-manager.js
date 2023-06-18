/**
 * modified from <https://github.com/egoist/detect-package-manager/blob/main/src/index.ts>
 * the original code is licensed under MIT
 * modified to support only detecting lock file and not detecting global package manager
 */

const { promises: fs } = require('fs')
const { resolve } = require('path')

/**
 * Check if a path exists
 * @param {string} p
 * @returns {Promise<boolean>}
 */
async function pathExists (p) {
  try {
    await fs.access(p)
    return true
  } catch {
    return false
  }
}
/**
 * @param {string} cwd
 * @returns {Promise<string | null>}
 */
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

/**
 * @param {string} [cwd]
 * @returns {Promise<string>}
 */
const detectPMByLockFile = async (cwd) => {
  const type = await getTypeofLockFile(cwd)
  if (type) {
    return type
  }

  return 'npm'
}

module.exports = {
  detectPMByLockFile
}
