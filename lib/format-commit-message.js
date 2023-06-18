/**
 * @param {string} rawMsg
 * @param {string} newVersion
 * @returns {string}
 */
module.exports = function (rawMsg, newVersion) {
  const message = String(rawMsg)
  return message.replace(/{{currentTag}}/g, newVersion)
}
