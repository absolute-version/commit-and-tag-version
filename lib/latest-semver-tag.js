import { ConventionalGitClient } from '@conventional-changelog/git-client';
import semver from 'semver';

export default async function ({ tagPrefix, prerelease }) {
  const gitClient = new ConventionalGitClient(process.cwd());
  let tags = [];
  for await (const tag of gitClient.getSemverTags({ prefix: tagPrefix })) {
    tags.push(tag);
  }
  if (!tags.length) return '1.0.0';
  // Respect tagPrefix
  tags = tags.map((tag) => tag.replace(new RegExp('^' + tagPrefix), ''));
  if (prerelease) {
    // ignore any other prelease tags
    tags = tags.filter((tag) => {
      if (!semver.valid(tag)) return false;
      if (!semver.prerelease(tag)) {
        // include all non-prerelease versions
        return true;
      }
      // check if the name of the prerelease matches the one we are looking for
      if (semver.prerelease(tag)[0] === prerelease) {
        return true;
      }
      return false;
    });
  }
  // ensure that the largest semver tag is at the head.
  tags = tags.map((tag) => {
    return semver.clean(tag);
  });
  tags.sort(semver.rcompare);
  return tags[0];
}
