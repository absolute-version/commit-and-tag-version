const REPLACER = /version: "(.*)"/

export function readVersion(contents) {
  return REPLACER.exec(contents)[1]
}

export function writeVersion(contents, version) {
  return contents.replace(REPLACER.exec(contents)[0], `version: "${version}"`)
}
