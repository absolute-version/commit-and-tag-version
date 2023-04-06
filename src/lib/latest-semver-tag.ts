import gitSemverTags from 'git-semver-tags'
import semver from 'semver'

export default async function (tagPrefix = undefined) {
  return await new Promise((resolve, reject) => {
    gitSemverTags({ tagPrefix }, function (err, tags) {
      if (err) {
        reject(err)
        return
      } else if (!tags.length) {
        resolve('1.0.0')
        return
      }
      // Respect tagPrefix
      tags = tags.map((tag) => tag.replace(new RegExp('^' + tagPrefix), ''))
      // ensure that the largest semver tag is at the head.
      tags = tags.map((tag) => {
        return semver.clean(tag)
      })
      tags.sort(semver.rcompare)
      resolve(tags[0])
    })
  })
}
