/** @type {import('chalk').default} */
const chalk = /** @type {any} */(require('chalk'))
const checkpoint = require('./checkpoint')
const figures = require('figures')
const runExec = require('./run-exec')

/** @typedef {import('semver').ReleaseType} ReleaseType */

/**
 *
 * @param {RuntimeConfig} args
 * @param {string} hookName
 * @returns {Promise<void> | Promise<ReleaseType> | Promise<undefined>}
 */
module.exports = function (args, hookName) {
  const scripts = args.scripts
  if (!scripts || !scripts[hookName]) return Promise.resolve()
  const command = scripts[hookName]
  checkpoint(args, 'Running lifecycle script "%s"', [hookName])
  checkpoint(args, '- execute command: "%s"', [command], chalk.blue(figures.info))
  return runExec(args, command)
}
