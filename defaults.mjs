import spec from 'conventional-changelog-config-spec';

let preset = import.meta.resolve('conventional-changelog-conventionalcommits');

// Workaround for limitation on `node:path.isAbsolute()` (can't handle file:// on absolute path)
preset = preset.replace("file://", "")

// Workaround specific to Windows (removes etra slash at the beginning of absolute path)
preset = preset.replace(/^(\/)([A-Z]:\/.*)$/, "$2")

const defaults = {
  infile: 'CHANGELOG.md',
  firstRelease: false,
  sign: false,
  signoff: false,
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
  preset: preset,
  npmPublishHint: undefined,
};

/**
 * Merge in defaults provided by the spec
 */
Object.keys(spec.properties).forEach((propertyKey) => {
  const property = spec.properties[propertyKey];
  defaults[propertyKey] = property.default;
});

/**
 * Sets the default for `header` (provided by the spec) for backwards
 * compatibility. This should be removed in the next major version.
 */
defaults.header =
  '# Changelog\n\nAll notable changes to this project will be documented in this file. See [commit-and-tag-version](https://github.com/absolute-version/commit-and-tag-version) for commit guidelines.\n';

defaults.packageFiles = ['package.json', 'bower.json', 'manifest.json'];

defaults.bumpFiles = defaults.packageFiles.concat([
  'package-lock.json',
  'npm-shrinkwrap.json',
]);

export default defaults;
