export function readVersion(contents) {
  return Number.parseInt(contents)
}

export function writeVersion(contents, version) {
  return this.readVersion(contents) + 1
}
