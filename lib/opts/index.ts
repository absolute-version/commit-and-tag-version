import { getConfiguration as getConfigFile } from "../configuration";
import { isin } from "../../type-helpers";
import type { PrettyPrint } from "../../type-helpers";

type Release = "minor" | "major" | "patch";
type Task = "changelog" | "commit" | "tag";
type Hook =
  | "prerelease"
  | "prebump"
  | "postbump"
  | "prechangelog"
  | "postchangelog"
  | "precommit"
  | "postcommit"
  | "pretag"
  | "posttag";

type TypePrefixes = Array<
  (
    | { section: string; hidden?: boolean | undefined }
    | { hidden: true; section?: string | undefined }
  ) & { type: string }
>;

type ConfigFiles = Array<
  | string
  | { filename: string; type: "json" | "gradle" | "plain-text" }
  | { filename: string; updater: string }
>;

/**
 * __THIS SHOULD NOT CHANGE.__
 * @deprecated
 *
 * The configuration options for `standard-version` as of version 9.5 (The last version prior to the fork; deprecated).
 */
export type SVConfig = {
  packageFiles: ConfigFiles;
  bumpFiles: ConfigFiles;
  releaseAs: Release;
  prerelease: string | boolean;
  infile: string;
  message: string;
  firstRelease: boolean;
  sign: boolean;
  noVerify: boolean;
  commitAll: boolean;
  silent: boolean;
  tagPrefix: string;
  scripts: Record<Hook, string>;
  skip: Record<Task, string>;
  dryRun: boolean;
  gitTagFallback: boolean;
  path: string;
  changelogHeader: string;
  preset: string;
  lernaPackage: string;
  header: string;
  types: TypePrefixes;
  preMajor: boolean;
  commitUrlFormat: string;
  compareUrlFormat: string;
  issueUrlFormat: string;
  userUrlFormat: string;
  releaseCommitMessageFormat: string;
  issuePrefixes: string[];
};

/**
 * The configuration object for commit-and-tag-version, which is a superset of the conventional-changelog-config-spec (as of version 2.1.0)
 * This may or may not maintain backwards compatibility with standard-version (as of version 9.5.0).
 */
export type CatVConfig = PrettyPrint<
  SVConfig & {
    npmPublishHint: string;
    releaseCount: number;
    tagForce: boolean;
  }
>;

/** The configuration options that are not supported by standard-version (as of version 9.5.0). */
const catVOnlyFeatures = [
  "npmPublishHint",
  "releaseCount",
  "tagForce",
] as const satisfies ReadonlyArray<Exclude<keyof CatVConfig, keyof SVConfig>>;

export const getMergedConfig = async (
  cwd?: string
): Promise<Partial<CatVConfig>> => {
  const dir = cwd ?? process.cwd();
  const json = (await import("path")).join(dir, "package.json");
  const svConfig: SVConfig = (await import(json))["standard-version"];
  const catvConfig: CatVConfig = (await import(json))["commit-and-tag-version"];

  const config: Partial<CatVConfig> = {};

  if (svConfig) {
    for (const key in svConfig) {
      // @ts-expect-error - We know this key SHOULD NOT be in svConfig, but we're going to allow it and warn the user
      if (catVOnlyFeatures.includes(key)) {
        console.warn(
          `The "${key}" option is a feature of commit-and-tag-version, and is not supported by standard-version.${"\n"}Please move this option to the 'commit-and-tag-version' key.${"\n"}In a future version, this will throw an error.`
        );
      }
      if (isin(catvConfig, key)) {
        console.warn(
          `"standard-version"."${key}" in package.json is being overridden by "commit-and-tag-version"."${key}". in package.json`
        );
      }
      // @ts-expect-error - We know better than TS here. This is valid.
      config[key] = svConfig[key];
    }
  }
  for (const key in catvConfig) {
    // @ts-expect-error - We know better than TS here. This is valid.
    config[key] = catvConfig[key];
  }

  const config2 = await getConfigFile();
  return { ...config, ...config2 };
};