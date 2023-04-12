module.exports.readVersion = function (contents: string) {
  return Number.parseInt(contents)
}

module.exports.writeVersion = function (contents: string, _version: string) {
  return this.readVersion(contents) + 1
}
