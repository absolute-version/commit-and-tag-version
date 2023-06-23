import Bump from '../lifecycles/bump';
import chalk from 'chalk';
import checkpoint from '../checkpoint';
import figures from 'figures';
import formatCommitMessage from '../format-commit-message';
import runExecFile from '../run-execFile';
import runLifecycleScript from '../run-lifecycle-script';
import { Config, Hook } from '../opts/types';
import detectPMByLockFile from '../detect-package-manager'

export default async function tag(newVersion: string, pkgPrivate: boolean, config: Config) {
  if (config.skip.tag) return
  await runLifecycleScript(config, Hook.pretag)
  await execTag(newVersion, pkgPrivate, config)
  await runLifecycleScript(config, Hook.posttag)
}

async function detectPublishHint () {
  const npmClientName = await detectPMByLockFile()
  const publishCommand = 'publish'
  return `${npmClientName} ${publishCommand}`
}

async function execTag (newVersion: string, pkgPrivate: boolean, config: Config) {
  const tagOption = []
  if (config.sign) {
    tagOption.push('-s')
  } else {
    tagOption.push('-a')
  }
  if (config.tagForce) {
    tagOption.push('-f')
  }
  checkpoint(config, 'tagging release %s%s', [config.tagPrefix, newVersion])
  await runExecFile(config, 'git', ['tag', ...tagOption, config.tagPrefix + newVersion, '-m', `${formatCommitMessage(config.releaseCommitMessageFormat, newVersion)}`])
  const currentBranch = await runExecFile(config, 'git', ['rev-parse', '--abbrev-ref', 'HEAD'])
  let message = 'git push --follow-tags origin ' + currentBranch?.trim()
  if (pkgPrivate !== true && Bump.getUpdatedConfigs()['package.json']) {
    const npmPublishHint = config.npmPublishHint || await detectPublishHint()
    message += ` && ${npmPublishHint}`
    if (config.prerelease !== undefined) {
      if (config.prerelease === '') {
        message += ' --tag prerelease'
      } else {
        message += ' --tag ' + config.prerelease
      }
    }
  }

  checkpoint(config, 'Run `%s` to publish', [message], chalk.blue(figures.info))
}
