const versionExtractRegex = /version[" ]*=[ ]*["'](.*)["']/i;

const getVersionIndex = function (lines) {
  let version;
  const lineNumber = lines.findIndex((line) => {
    const versionMatcher = line.match(versionExtractRegex);
    // if version not found in lines provided, return false
    if (versionMatcher == null) {
      return false;
    }
    version = versionMatcher[1];
    return true;
  });
  return { version, lineNumber };
};

module.exports.readVersion = function (contents) {
  const lines = contents.split('\n');
  const versionIndex = getVersionIndex(lines);
  return versionIndex.version;
};

module.exports.writeVersion = function (contents, version) {
  const lines = contents.split('\n');
  const versionIndex = getVersionIndex(lines);
  const versionLine = lines[versionIndex.lineNumber];
  const newVersionLine = versionLine.replace(versionIndex.version, version);
  lines[versionIndex.lineNumber] = newVersionLine;
  return lines.join('\n');
};
