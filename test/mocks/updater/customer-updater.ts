const REPLACER = /version: "(.*)"/

module.exports.readVersion = function (contents: string) {
  const version = REPLACER.exec(contents);
  return version ? version[1] : '';
}

module.exports.writeVersion = function (contents: string, version: string) {
  return contents.replace(
    REPLACER,
    `version: "${version}"`,
  )
}
