const versionRegex = /^version\s+=\s+['"]([\d.]+)['"]/m

/**
 * @param {string} contents
 * @returns {string}
 */
module.exports.readVersion = function (contents) {
  const matches = versionRegex.exec(contents)
  if (matches === null) {
    throw new Error('Failed to read the version field in your gradle file - is it present?')
  }

  return matches[1]
}

/**
 * @param {string} contents
 * @param {string} version
 * @returns {string}
 */
module.exports.writeVersion = function (contents, version) {
  return contents.replace(versionRegex, () => {
    return `version = "${version}"`
  })
}
