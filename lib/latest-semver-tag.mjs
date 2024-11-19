import gitSemverTags from 'git-semver-tags';
import { clean, rcompare } from 'semver';

export default function (tagPrefix = undefined) {
  return new Promise((resolve, reject) => {
    gitSemverTags({ tagPrefix }, function (err, tags) {
      if (err) return reject(err);
      else if (!tags.length) return resolve('1.0.0');
      // Respect tagPrefix
      tags = tags.map((tag) => tag.replace(new RegExp('^' + tagPrefix), ''));
      // ensure that the largest semver tag is at the head.
      tags = tags.map((tag) => {
        return clean(tag);
      });
      tags.sort(rcompare);
      return resolve(tags[0]);
    });
  });
}
