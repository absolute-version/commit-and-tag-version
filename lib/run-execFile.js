const { promisify } = require('util')
const printError = require('./print-error')

const execFile = promisify(require('child_process').execFile)

/**
 * @param {RuntimeConfig} args
 * @param {string} cmd
 * @param {string[]} cmdArgs
 * @returns {Promise<string | undefined>}
 */
module.exports = async function (args, cmd, cmdArgs) {
  if (args.dryRun) return
  try {
    const { stderr, stdout } = await execFile(cmd, cmdArgs)
    // If execFile returns content in stderr, but no error, print it as a warning
    if (stderr) printError(args, stderr, { level: 'warn', color: 'yellow' })
    return stdout
  } catch (/** @type {any} */error) {
    // If execFile returns an error, print it and exit with return code 1
    printError(args, error.stderr || error.message)
    throw error
  }
}
