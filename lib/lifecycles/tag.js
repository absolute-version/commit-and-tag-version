const bump = require('../lifecycles/bump')
/** @type {import('chalk').default} */
const chalk = /** @type {any} */(require('chalk'))
const checkpoint = require('../checkpoint')
const figures = require('figures')
const formatCommitMessage = require('../format-commit-message')
const runExecFile = require('../run-execFile')
const runLifecycleScript = require('../run-lifecycle-script')
const { detectPMByLockFile } = require('../detect-package-manager')

/**
 * @param {RuntimeConfig} args
 * @param {boolean} pkgPrivate
 * @param {string} newVersion
 * @returns {Promise<void>}
 */
module.exports = async function (newVersion, pkgPrivate, args) {
  if (args.skip.tag) return
  await runLifecycleScript(args, 'pretag')
  await execTag(newVersion, pkgPrivate, args)
  await runLifecycleScript(args, 'posttag')
}

/**
 * @returns {Promise<string>}
 */
async function detectPublishHint () {
  const npmClientName = await detectPMByLockFile()
  const publishCommand = 'publish'
  return `${npmClientName} ${publishCommand}`
}

/**
 * @param {string} newVersion
 * @param {boolean} pkgPrivate
 * @param {RuntimeConfig} args
 * @returns {Promise<void>}
 */
async function execTag (newVersion, pkgPrivate, args) {
  const tagOption = []
  if (args.sign) {
    tagOption.push('-s')
  } else {
    tagOption.push('-a')
  }
  if (args.tagForce) {
    tagOption.push('-f')
  }
  checkpoint(args, 'tagging release %s%s', [args.tagPrefix, newVersion])
  await runExecFile(args, 'git', ['tag', ...tagOption, args.tagPrefix + newVersion, '-m', `${formatCommitMessage(args.releaseCommitMessageFormat, newVersion)}`])
  const currentBranch = await runExecFile('', 'git', ['rev-parse', '--abbrev-ref', 'HEAD'])
  let message = 'git push --follow-tags origin ' + currentBranch.trim()
  if (pkgPrivate !== true && bump.getUpdatedConfigs()['package.json']) {
    const npmPublishHint = args.npmPublishHint || await detectPublishHint()
    message += ` && ${npmPublishHint}`
    if (args.prerelease !== undefined) {
      if (args.prerelease === '') {
        message += ' --tag prerelease'
      } else {
        message += ' --tag ' + args.prerelease
      }
    }
  }

  checkpoint(args, 'Run `%s` to publish', [message], chalk.blue(figures.info))
}
