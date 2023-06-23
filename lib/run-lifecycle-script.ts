import chalk from 'chalk';
import checkpoint from './checkpoint';
import figures from 'figures';
import runExec from './run-exec';
import { Config, Hook } from './opts/types';

export default async function runLifecycleScript(config: Config, hookName: Hook) {
  const scripts = config.scripts
  if (!scripts || !scripts[hookName]) return Promise.resolve()
  const command = scripts[hookName];
  if (command) {
    checkpoint(config, 'Running lifecycle script "%s"', [hookName])
    checkpoint(config, '- execute command: "%s"', [command], chalk.blue(figures.info))
    return runExec(config, command)
  }
  return undefined;
}
