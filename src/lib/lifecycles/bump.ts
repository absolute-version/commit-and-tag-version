'use strict'

import chalk from 'chalk'
import checkpoint from '@lib/checkpoint'
import conventionalRecommendedBump from 'conventional-recommended-bump'
import figures from 'figures'
import fs from 'fs'
import DotGitignore from 'dotgitignore'
import path from 'path'
import presetLoader from '@lib/preset-loader'
import runLifecycleScript from '@lib/run-lifecycle-script'
import semver from 'semver'
import writeFile from '@lib/write-file'
import { resolveUpdaterObjectFromArgument } from '@lib/updaters'
let configsToUpdate = {}

export async function Bump(args, version) {
  // reset the cache of updated config files each
  // time we perform the version bump step.
  configsToUpdate = {}

  if (args.skip.bump) return version
  let newVersion = version
  await runLifecycleScript(args, 'prerelease')
  const stdout = await runLifecycleScript(args, 'prebump')
  if (stdout && stdout.trim().length) args.releaseAs = stdout.trim()
  const release = await bumpVersion(args.releaseAs, version, args)
  if (!args.firstRelease) {
    const releaseType = getReleaseType(
      args.prerelease,
      release.releaseType,
      version
    )
    const releaseTypeAsVersion =
      releaseType === 'pre' + release.releaseType
        ? semver.valid(release.releaseType + '-' + args.prerelease + '.0')
        : semver.valid(releaseType)

    newVersion =
      releaseTypeAsVersion || semver.inc(version, releaseType, args.prerelease)
    updateConfigs(args, newVersion)
  } else {
    checkpoint(
      args,
      'skip version bump on first release',
      [],
      chalk.red(figures.cross)
    )
  }
  await runLifecycleScript(args, 'postbump')
  return newVersion
}

Bump.getUpdatedConfigs = function () {
  return configsToUpdate
}

function getReleaseType(prerelease, expectedReleaseType, currentVersion) {
  if (isString(prerelease)) {
    if (isInPrerelease(currentVersion)) {
      if (
        shouldContinuePrerelease(currentVersion, expectedReleaseType) ||
        getTypePriority(getCurrentActiveType(currentVersion)) >
          getTypePriority(expectedReleaseType)
      ) {
        return 'prerelease'
      }
    }

    return 'pre' + expectedReleaseType
  } else {
    return expectedReleaseType
  }
}

function isString(val) {
  return typeof val === 'string'
}

/**
 * if a version is currently in pre-release state,
 * and if it current in-pre-release type is same as expect type,
 * it should continue the pre-release with the same type
 *
 * @param version
 * @param expectType
 * @return {boolean}
 */
function shouldContinuePrerelease(version, expectType) {
  return getCurrentActiveType(version) === expectType
}

function isInPrerelease(version) {
  return Array.isArray(semver.prerelease(version))
}

const TypeList = ['major', 'minor', 'patch'].reverse()

/**
 * extract the in-pre-release type in target version
 *
 * @param version
 * @return {string}
 */
function getCurrentActiveType(version) {
  const typelist = TypeList
  for (let i = 0; i < typelist.length; i++) {
    if (semver[typelist[i]](version)) {
      return typelist[i]
    }
  }
}

/**
 * calculate the priority of release type,
 * major - 2, minor - 1, patch - 0
 *
 * @param type
 * @return {number}
 */
function getTypePriority(type) {
  return TypeList.indexOf(type)
}

async function bumpVersion(releaseAs, currentVersion, args) {
  return await new Promise((resolve, reject) => {
    if (releaseAs) {
      resolve({
        releaseType: releaseAs
      })
    } else {
      const presetOptions = presetLoader(args)
      if (typeof presetOptions === 'object') {
        if (semver.lt(currentVersion, '1.0.0')) presetOptions.preMajor = true
      }
      conventionalRecommendedBump(
        {
          debug:
            args.verbose &&
            console.info.bind(console, 'conventional-recommended-bump'),
          preset: presetOptions,
          path: args.path,
          tagPrefix: args.tagPrefix,
          lernaPackage: args.lernaPackage
        },
        function (err, release) {
          if (err) {
            reject(err)
          } else {
            resolve(release)
          }
        }
      )
    }
  })
}

/**
 * attempt to update the version number in provided `bumpFiles`
 * @param args config object
 * @param newVersion version number to update to.
 * @return void
 */
function updateConfigs(args, newVersion) {
  const dotgit = DotGitignore()
  args.bumpFiles.forEach(function (bumpFile) {
    const updater = resolveUpdaterObjectFromArgument(bumpFile)
    if (!updater) {
      return
    }
    const configPath = path.resolve(process.cwd(), updater.filename)
    try {
      if (dotgit.ignore(updater.filename)) return
      const stat = fs.lstatSync(configPath)

      if (!stat.isFile()) return
      const contents = fs.readFileSync(configPath, 'utf8')
      const newContents = updater.updater.writeVersion(contents, newVersion)
      const realNewVersion = updater.updater.readVersion(newContents)
      checkpoint(
        args,
        'bumping version in ' + updater.filename + ' from %s to %s',
        [updater.updater.readVersion(contents), realNewVersion]
      )
      writeFile(args, configPath, newContents)
      // flag any config files that we modify the version # for
      // as having been updated.
      configsToUpdate[updater.filename] = true
    } catch (err) {
      if (err.code !== 'ENOENT') console.warn(err.message)
    }
  })
}

export default Bump
