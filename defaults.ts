import { PrettyPrint } from "./type-helpers";
import { Config } from './lib/opts/types';
import spec from './lib/opts/spec';

const defaults: Config = {
  infile: "CHANGELOG.md",
  firstRelease: false,
  sign: false,
  noVerify: false,
  commitAll: false,
  silent: false,
  tagPrefix: "v",
  releaseCount: 1,
  scripts: {},
  skip: {},
  dryRun: false,
  tagForce: false,
  gitTagFallback: true,
  preset: require.resolve("conventional-changelog-conventionalcommits"),
  // npmPublishHint: undefined,
  /**
   * Sets the default for `header` (provided by the spec) for backwards
   * compatibility. This should be removed in the next major version.
   */
  header:
    "# Changelog\n\nAll notable changes to this project will be documented in this file. See [commit-and-tag-version](https://github.com/absolute-version/commit-and-tag-version) for commit guidelines.\n",
  packageFiles: ["package.json", "bower.json", "manifest.json"],
  bumpFiles: [
    "package.json",
    "bower.json",
    "manifest.json",
    "package-lock.json",
    "npm-shrinkwrap.json",
  ],
  types: spec.types.default,
  preMajor: spec.preMajor.default,
  commitUrlFormat: spec.commitUrlFormat.default,
  compareUrlFormat: spec.compareUrlFormat.default,
  issueUrlFormat: spec.issueUrlFormat.default,
  userUrlFormat: spec.userUrlFormat.default,
  releaseCommitMessageFormat: spec.releaseCommitMessageFormat.default,
  issuePrefixes: spec.issuePrefixes.default,
  verbose: false,
};

// type Defaults = PrettyPrint<
//   typeof defaults &
//     Readonly<{
//       [key in keyof typeof specSchema.properties]: typeof specSchema.properties[key]["default"];
//     }>
// >;

export default defaults;
