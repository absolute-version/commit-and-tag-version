import spec from 'conventional-changelog-config-spec'
import { createRequire } from 'node:module'
import type { Config } from '@typings/index'

/**
 *
 * @param preset the name of the preset to resolve
 * @returns
 */
const presetResolver = async (preset: string): Promise<string> => {
  const resolve =
    import.meta.resolve !== undefined
      ? import.meta.resolve
      : createRequire(import.meta.url).resolve

  return await resolve(preset)
}

const defaults: Config = {
  infile: 'CHANGELOG.md',
  firstRelease: false,
  sign: false,
  noVerify: false,
  commitAll: false,
  silent: false,
  tagPrefix: 'v',
  releaseCount: 1,
  scripts: {},
  skip: {},
  dryRun: false,
  tagForce: false,
  gitTagFallback: true,
  preset: presetResolver('conventional-changelog-conventionalcommits'),
  npmPublishHint: undefined
} satisfies Config

/**
 * Merge in defaults provided by the spec
 *  with the defaults provided by this package.
 */
Object.assign(defaults, spec)

/**
 * Sets the default for `header` (provided by the spec) for backwards
 * compatibility. This should be removed in the next major version.
 */
defaults.header =
  '# Changelog\n\nAll notable changes to this project will be documented in this file. See [commit-and-tag-version](https://github.com/absolute-version/commit-and-tag-version) for commit guidelines.\n'

defaults.packageFiles = ['package.json', 'bower.json', 'manifest.json']

defaults.bumpFiles = defaults.packageFiles.concat([
  'package-lock.json',
  'npm-shrinkwrap.json'
])
export default defaults
