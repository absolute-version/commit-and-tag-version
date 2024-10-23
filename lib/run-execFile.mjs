import childProcess from "child_process";
import { promisify } from 'util';
import printError from './print-error.mjs';

const execFile = promisify(childProcess.execFile);

export default async function (args, cmd, cmdArgs) {
  if (args.dryRun) return;
  try {
    const { stderr, stdout } = await execFile(cmd, cmdArgs);
    // If execFile returns content in stderr, but no error, print it as a warning
    if (stderr) printError(args, stderr, { level: 'warn', color: 'yellow' });
    return stdout;
  } catch (error) {
    // If execFile returns an error, print it and exit with return code 1
    printError(args, error.stderr || error.message);
    throw error;
  }
}
