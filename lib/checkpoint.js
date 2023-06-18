/** @type {import('chalk').default} */
const chalk = /** @type {any} */(require('chalk'))
const figures = require('figures')
const util = require('util')

/**
 * @param {RuntimeConfig} argv
 * @param {string} msg
 * @param {string[]} args
 * @param {string} [figure]
 * @returns {void}
 */
module.exports = function (argv, msg, args, figure) {
  const defaultFigure = argv.dryRun ? chalk.yellow(figures.tick) : chalk.green(figures.tick)
  if (!argv.silent) {
    console.info((figure || defaultFigure) + ' ' + util.format.apply(util, [msg].concat(args.map(function (arg) {
      return chalk.bold(arg)
    }))))
  }
}
