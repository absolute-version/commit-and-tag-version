const versionRegex = /^version\s+=\s+['"]([\d.]+)['"]/m

export default {
  readVersion(contents: string) {
    const matches = versionRegex.exec(contents)
    if (matches === null || !matches[1]) {
      throw new Error('Failed to read the version field in your gradle file - is it present?')
    }

    return matches[1];
  },
  writeVersion(contents: string, version: string) {
    return contents.replace(versionRegex, () => `version = "${version}"`);
  },
};
