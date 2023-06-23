import stringifyPackage from '../../stringify-package';
import detectIndent from 'detect-indent';
import detectNewline from 'detect-newline';

export default {
  readVersion(contents: string) {
    return JSON.parse(contents).version
  },
  writeVersion(contents: string, version: string) {
    const json = JSON.parse(contents)
    const indent = detectIndent(contents).indent
    const newline = detectNewline(contents)
    json.version = version

    if (json.packages && json.packages['']) {
      // package-lock v2 stores version there too
      json.packages[''].version = version
    }

    return stringifyPackage(json, indent, newline)
  },
  isPrivate(contents: string) {
    return JSON.parse(contents).private
},
};
