const gitSemverTags = require('git-semver-tags');
const semver = require('semver');

module.exports = function ({ tagPrefix, prerelease }) {
  return new Promise((resolve, reject) => {
    gitSemverTags({ tagPrefix }, function (err, tags) {
      if (err) return reject(err);
      else if (!tags.length) return resolve('1.0.0');
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
      return resolve(tags[0]);
    });
  });
};
