import spec from "conventional-changelog-config-spec/versions/2.1.0/schema.json";
import { PrettyPrint } from "./type-helpers";

const defaults = {
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
  npmPublishHint: undefined,
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
} as const;

type Defaults = PrettyPrint<
  typeof defaults &
    Readonly<{
      [key in keyof typeof spec.properties]: typeof spec.properties[key]["default"];
    }>
>;

/**
 * Merge in defaults provided by the spec
 */
Object.keys(spec.properties).forEach((propertyKey) => {
  const property = spec.properties[propertyKey as keyof typeof spec.properties];
  // @ts-expect-error - We used a const assertion to infer literal types for intellisense, so TS thinks defaults is readonly.
  defaults[propertyKey] = property.default;
});

export default defaults as Defaults;
