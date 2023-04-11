import { execFile as processExecFile } from 'child_process';
import { Config } from './opts/types';

import { promisify } from 'util';
import printError from './print-error';

const execFile = promisify(processExecFile);

export default async function runExecFile(config: Config, file: string, cmdArgs?: string[]) {
  if (config.dryRun) return
  try {
    const { stderr, stdout } = await execFile(file, cmdArgs);
    // If execFile returns content in stderr, but no error, print it as a warning
    if (stderr) printError(config, stderr, { level: 'warn', color: 'yellow' });
    return stdout;
  } catch (error: any) {
    // If execFile returns an error, print it and exit with return code 1
    printError(config, error.stderr || error.message);
    throw error;
  }
}
