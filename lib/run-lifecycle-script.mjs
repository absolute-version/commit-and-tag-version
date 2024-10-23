import chalk from 'chalk';
import figures from 'figures';
import runExec from './run-exec.mjs';
import checkpoint from './checkpoint.mjs';

export default function (args, hookName) {
  const scripts = args.scripts;
  if (!scripts || !scripts[hookName]) return Promise.resolve();
  const command = scripts[hookName];
  checkpoint(args, 'Running lifecycle script "%s"', [hookName]);
  checkpoint(
    args,
    '- execute command: "%s"',
    [command],
    chalk.blue(figures.info),
  );
  return runExec(args, command);
}
