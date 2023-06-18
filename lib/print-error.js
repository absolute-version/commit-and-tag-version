/** @type {import('chalk').default} */
const chalk = /** @type {any} */(require('chalk'))

/**
 * @typedef {'red' | 'blue' | 'green' | 'yellow' | 'cyan' | 'magenta' | 'black' | 'white' | 'gray' | 'grey' | 'redBright' | 'greenBright' | 'yellowBright' | 'blueBright' | 'magentaBright' | 'cyanBright' | 'whiteBright' | 'bgBlack' | 'bgRed' | 'bgGreen' | 'bgYellow' | 'bgBlue' | 'bgMagenta' | 'bgCyan' | 'bgWhite' | 'bgBlackBright' | 'bgRedBright' | 'bgGreenBright' | 'bgYellowBright' | 'bgBlueBright' | 'bgMagentaBright' | 'bgCyanBright' | 'bgWhiteBright'} Color
 * @typedef {'error' | 'warn' | 'info' | 'log' | 'debug'} LogLevel
 */

/**
 * @param {RuntimeConfig} args
 * @param {string} msg
 * @param {{ level: LogLevel, color: Color }} [opts]
 * @returns {void}
 */
module.exports = function (args, msg, opts) {
  if (!args.silent) {
    opts = Object.assign({
      level: 'error',
      color: 'red'
    }, opts)

    console[opts.level](chalk[opts.color](msg))
  }
}
