import stringifyPackage from '@lib/stringify-package'
import detectIndent from 'detect-indent'
import detectNewline from 'detect-newline'

export function readVersion(contents) {
  return JSON.parse(contents).version
}

export function writeVersion(contents, version) {
  const json = JSON.parse(contents)
  const indent = detectIndent(contents).indent
  const newline = detectNewline(contents)
  json.version = version

  if (json.packages && json.packages['']) {
    // package-lock v2 stores version there too
    json.packages[''].version = version
  }

  return stringifyPackage(json, indent, newline)
}

export function isPrivate(contents) {
  return JSON.parse(contents).private
}
