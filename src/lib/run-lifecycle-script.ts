import chalk from 'chalk'
import checkpoint from '@lib/checkpoint'
import figures from 'figures'
import runExec from '@lib/run-exec'

export default async function (args, hookName) {
  const scripts = args.scripts
  if (!scripts || !scripts[hookName]) {
    await Promise.resolve()
    return
  }
  const command = scripts[hookName]
  checkpoint(args, 'Running lifecycle script "%s"', [hookName])
  checkpoint(
    args,
    '- execute command: "%s"',
    [command],
    chalk.blue(figures.info)
  )
  return await runExec(args, command)
}
