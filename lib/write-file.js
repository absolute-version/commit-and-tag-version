const fs = require('fs')

/**
 * @param {RuntimeConfig} args
 * @param {string} filePath
 * @param {string} content
 * @returns {void}
 */
module.exports = function (args, filePath, content) {
  if (args.dryRun) return
  fs.writeFileSync(filePath, content, 'utf8')
}
