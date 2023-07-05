import { getConfiguration as getConfigFromFile } from "../configuration";
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
export type LegacyConfig =
  | {
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
    }
  | undefined;

/**
 * The configuration object for commit-and-tag-version, which is a superset of the conventional-changelog-config-spec (as of version 2.1.0)
 * This may or may not maintain backwards compatibility with standard-version (as of version 9.5.0).
 */
export type Config =
  | PrettyPrint<
      LegacyConfig & {
        npmPublishHint: string;
        releaseCount: number;
        tagForce: boolean;
      }
    >
  | undefined;

/** The configuration options that are not supported by standard-version (as of version 9.5.0). */
const catVOnlyFeatures = [
  "npmPublishHint",
  "releaseCount",
  "tagForce",
] as const satisfies ReadonlyArray<
  Exclude<keyof Exclude<Config, undefined>, keyof LegacyConfig>
>;

export const getMergedConfig = async (
  cwd?: string
): Promise<Partial<Config>> => {
  const searchDir = cwd ?? process.cwd();
  const pkgJson = (await import("path")).join(searchDir, "package.json");
  const legacyConf: LegacyConfig = (await import(pkgJson))["standard-version"];
  const modernConf: Config = (await import(pkgJson))["commit-and-tag-version"];

  Object.keys(legacyConf ?? {}).forEach((key) => {
    if (catVOnlyFeatures.includes(key as any)) {
      console.warn(
        `The "${key}" option is a feature of commit-and-tag-version, and is not supported by standard-version.${"\n"}Please move this option to the 'commit-and-tag-version' key.${"\n"}In a future version, this will throw an error.`
      );
    }
    if (modernConf && isin(modernConf, key as any)) {
      console.warn(
        `"standard-version"."${key}" in package.json is being overridden by "commit-and-tag-version"."${key}". in package.json`
      );
    }
  });

  const configFromFile = await getConfigFromFile();
  return {
    ...(legacyConf ?? {}),
    ...(modernConf ?? {}),
    ...(configFromFile ?? {}),
  };
};
