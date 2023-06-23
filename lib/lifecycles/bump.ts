import chalk from 'chalk'
import checkpoint from '../checkpoint'
import semver from 'semver'
import conventionalRecommendedBump from 'conventional-recommended-bump'
import figures from 'figures'
import fs from 'fs'
import DotGitignore from 'dotgitignore'
import path from 'path'

import runLifecycleScript from '../run-lifecycle-script'
import writeFile from '../write-file'
import { resolveUpdaterObjectFromArgument } from '../updaters'
import { Config, Hook, Release } from '../opts/types'

let configsToUpdate: Record<string, boolean> = {};

interface BumpResults {
  version: string;
  newVersion: string;
  releaseAs: Release;
}

async function Bump(config: Config, version: string) {
  // reset the cache of updated config files each
  // time we perform the version bump step.
  configsToUpdate = {}

  if (config.skip.bump) return version;

  const results: BumpResults = {
    version,
    newVersion: version,
    releaseAs: config.releaseAs || 'minor',
  };

  await runLifecycleScript(config, Hook.prerelease);

  const stdout = await runLifecycleScript(config, Hook.prebump);
  if (stdout && stdout.trim().length) results.releaseAs = stdout.trim() as Release;

  const expectedReleaseType = await getExpectedReleaseType(config);

  if (!expectedReleaseType) {
    throw new Error('Unable to determine expected release type')
  }

  if (!config.firstRelease) {
    const releaseType = getReleaseType(
      config.prerelease,
      expectedReleaseType,
      version
    );
    // Removed this as semver.valid() as used will always return null
    // const releaseTypeAsVersion =
    //   releaseType.startsWith('pre')
    //     ? semver.valid(expectedReleaseType + '-' + config.prerelease + '.0')
    //     : semver.valid(releaseType);

    results.newVersion = semver.inc(version, releaseType, !!config.prerelease) || version;

    updateConfigs(config, results.newVersion);
  } else {
    checkpoint(
      config,
      'skip version bump on first release',
      [],
      chalk.red(figures.cross)
    )
  }
  await runLifecycleScript(config, Hook.postbump);
  return results.newVersion
}

Bump.getUpdatedConfigs = function () {
  return configsToUpdate
}

function getReleaseType(
  prerelease: string | boolean | undefined,
  expectedReleaseType: Release,
  currentVersion: string,
): semver.ReleaseType {
  if (prerelease) {
    if (isInPrerelease(currentVersion)) {
      const currentActiveType = getCurrentActiveType(currentVersion);
      if (
        shouldContinuePrerelease(currentVersion, expectedReleaseType) ||
        (currentActiveType && getTypePriority(currentActiveType) >
          getTypePriority(expectedReleaseType))
      ) {
        return 'prerelease'
      }
    }

    return `pre${expectedReleaseType}`;
  } else {
    return expectedReleaseType
  }
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
function shouldContinuePrerelease (version: string, expectType: semver.ReleaseType) {
  return getCurrentActiveType(version) === expectType;
}

function isInPrerelease (version: string) {
  return Array.isArray(semver.prerelease(version))
}

const TypeList: Release[] = ['patch', 'minor', 'major'];

/**
 * extract the in-pre-release type in target version
 */
function getCurrentActiveType(version: string): Release | undefined {
  const parsed = semver.parse(version);
  if ((parsed?.patch ?? 0) > 0) return 'patch';
  if ((parsed?.minor ?? 0) > 0) return 'minor';
  if ((parsed?.patch ?? 0) > 0) return 'patch';

  return undefined;
}

/**
 * calculate the priority of release type,
 * major - 2, minor - 1, patch - 0
 */
function getTypePriority(type: Release) {
  return TypeList.indexOf(type);
}

async function getExpectedReleaseType(config: Config): Promise<Release | undefined> {
  return await new Promise<Release | undefined>((resolve, reject) => {
    if (config.releaseAs) {
      resolve(config.releaseAs);
    } else {
      // const presetOptions = presetLoader(config)
      // if (typeof presetOptions === 'object') {
      //   if (semver.lt(currentVersion, '1.0.0')) presetOptions['preMajor'] = true
      // }
      const bumpOptions: conventionalRecommendedBump.Options = {
        preset: config.preset,
        path: config.path,
        tagPrefix: config.tagPrefix,
        lernaPackage: config.lernaPackage,
      };

      // Is this needed?
      // if (config.issuePrefixes) {
      //   bumpOptions.config = {
      //     parserOpts: {
      //       issuePrefixes: config.issuePrefixes,
      //     },
      //   };
      // }
      conventionalRecommendedBump(
        bumpOptions,
        function (err, release) {
          if (err) {
            reject(err);
          } else {
            resolve(release.releaseType);
          }
        }
      )
    }
  })
}

/**
 * attempt to update the version number in provided `bumpFiles`
 * @param config config object
 * @param newVersion version number to update to.
 * @return void
 */
function updateConfigs(config: Config, newVersion: string) {
  const dotgit = DotGitignore()
  config.bumpFiles.forEach(function (bumpFile) {
    const updater = resolveUpdaterObjectFromArgument(bumpFile)

    if (!updater) return;
    if (dotgit.ignore(updater.filename)) return;

    try {
      const configPath = path.resolve(process.cwd(), updater.filename)
      const stat = fs.lstatSync(configPath)

      if (!stat.isFile()) return;

      const contents = fs.readFileSync(configPath, 'utf8')
      const newContents = updater.updater.writeVersion(contents, newVersion)
      const realNewVersion = updater.updater.readVersion(newContents)

      checkpoint(
        config,
        'bumping version in ' + updater.filename + ' from %s to %s',
        [updater.updater.readVersion(contents), realNewVersion]
      )

      writeFile(config, configPath, newContents)

      // flag any config files that we modify the version # for
      // as having been updated.
      configsToUpdate[updater.filename] = true
    } catch (err: any) {
      if (err.code !== 'ENOENT') console.warn(err.message);
    }
  })
}

export default Bump;
