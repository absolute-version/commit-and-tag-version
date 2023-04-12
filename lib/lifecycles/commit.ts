import bump from '../lifecycles/bump';
import checkpoint from '../checkpoint';
import formatCommitMessage from '../format-commit-message';
import path from 'path';
import runExecFile from '../run-execFile';
import runLifecycleScript from '../run-lifecycle-script';
import { Config, Hook } from '../opts/types';

export default async function (config: Config, newVersion: string) {
  if (config.skip.commit) return;

  const message = await runLifecycleScript(config, Hook.precommit)
  if (message && message.length) config.releaseCommitMessageFormat = message;
  await execCommit(config, newVersion)
  await runLifecycleScript(config, Hook.postcommit);
}

async function execCommit (config: Config, newVersion: string) {
  let msg = 'committing %s'
  let paths: string[] = []
  const verify: string[] = !config.noVerify ? ['--no-verify'] : [];
  const sign: string[] = config.sign ? ['-S'] : []
  const toAdd: string[] = [];

  // only start with a pre-populated paths list when CHANGELOG processing is not skipped
  if (!config.skip.changelog) {
    paths = [config.infile]
    toAdd.push(config.infile)
  }

  // commit any of the config files that we've updated
  // the version # for.
  Object.keys(bump.getUpdatedConfigs()).forEach(function (p) {
    paths.unshift(p)
    toAdd.push(path.relative(process.cwd(), p))

    // account for multiple files in the output message
    if (paths.length > 1) {
      msg += ' and %s'
    }
  })

  if (config.commitAll) {
    msg += ' and %s'
    paths.push('all staged files')
  }

  checkpoint(config, msg, paths)

  // nothing to do, exit without commit anything
  if (!config.commitAll && config.skip.changelog && config.skip.bump && toAdd.length === 0) {
    return
  }

  await runExecFile(config, 'git', ['add'].concat(toAdd))
  await runExecFile(
    config,
    'git',
    [
      'commit'
    ].concat(
      verify,
      sign,
      config.commitAll ? [] : toAdd,
      [
        '-m',
        `${formatCommitMessage(config.releaseCommitMessageFormat, newVersion)}`
      ]
    )
  )
}
