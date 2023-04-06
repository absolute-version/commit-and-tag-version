import { promisify } from 'util'
import printError from '@lib/print-error'
import { execFile as originalExecFile } from 'child_process'

const execFile = promisify(originalExecFile)

export default async function (args, cmd, cmdArgs) {
  if (args.dryRun) return
  try {
    const { stderr, stdout } = await execFile(cmd, cmdArgs)
    // If execFile returns content in stderr, but no error, print it as a warning
    if (stderr) printError(args, stderr, { level: 'warn', color: 'yellow' })
    return stdout
  } catch (error) {
    // If execFile returns an error, print it and exit with return code 1
    printError(args, error.stderr || error.message)
    throw error
  }
}
