const { promisify } = require('util')
const printError = require('./print-error')

const exec = promisify(require('child_process').exec)

/**
 * @param {RuntimeConfig} args
 * @param {string} cmd
 * @return {Promise<string | undefined>}
 */
module.exports = async function (args, cmd) {
  if (args.dryRun) return
  try {
    const { stderr, stdout } = await exec(cmd)
    // If exec returns content in stderr, but no error, print it as a warning
    if (stderr) printError(args, stderr, { level: 'warn', color: 'yellow' })
    return stdout
  } catch (/** @type {any} */error) {
    // If exec returns an error, print it and exit with return code 1
    printError(args, error.stderr || error.message)
    throw error
  }
}
