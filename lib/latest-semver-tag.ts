import gitSemverTags from 'git-semver-tags';
import semver from 'semver';

export default async function latestSemverTags(tagPrefix?: string) {
  return new Promise<string>((resolve, reject) => {
    gitSemverTags({ tagPrefix }, (err, tags) => {
      if (err) {
        reject(err);
      } else if (tags.length) {
        const mapped = tags
          // Respect tagPrefix
          .map(tag => tag.replace(new RegExp('^' + tagPrefix), ''))
          // ensure that the largest semver tag is at the head.
          .map(tag => semver.clean(tag) || '');

        mapped.sort(semver.rcompare)
        const version = mapped[0];
        if (version) resolve(version);
      }

      resolve('1.0.0');
    })
  })
}
