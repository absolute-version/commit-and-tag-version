const versionRegex = /<Version>(.*)<\/Version>/;

export function readVersion(contents) {
  const matches = versionRegex.exec(contents);
  if (matches === null || matches.length !== 2) {
    throw new Error(
      'Failed to read the Version field in your csproj file - is it present?',
    );
  }
  return matches[1];
}

export function writeVersion(contents, version) {
  return contents.replace(versionRegex, `<Version>${version}</Version>`);
}
