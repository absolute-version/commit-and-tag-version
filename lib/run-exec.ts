import { exec as processExec } from 'child_process';
import { promisify } from 'util';
import printError from './print-error';
import { Config } from './opts/types';

const exec = promisify(processExec);

export default async function runExec(config: Config, cmd: string) {
  if (config.dryRun) return
  try {
    const { stderr, stdout } = await exec(cmd)
    // If exec returns content in stderr, but no error, print it as a warning
    if (stderr) printError(config, stderr, { level: 'warn', color: 'yellow' })
    return stdout
  } catch (error: any) {
    // If exec returns an error, print it and exit with return code 1
    printError(config, error.stderr || error.message);
    throw error;
  }
}
