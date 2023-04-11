import { Config as SpecConfig } from "conventional-changelog-config-spec";
import type { PrettyPrint } from "../../type-helpers";

export type Release = "minor" | "major" | "patch";

export enum Task {
  bump = 'bump',
  changelog = 'changelog',
  commit = 'commit',
  tag = 'tag',
}

export enum Hook {
  prerelease = 'prerelease',
  prebump = 'prebump',
  postbump = 'postbump',
  prechangelog = 'prechangelog',
  postchangelog = 'postchangelog',
  precommit = 'precommit',
  postcommit = 'postcommit',
  pretag = 'pretag',
  posttag = 'posttag',
}

export type LifecycleHookScripts = {
  [key in Hook]?: string;
}

export type SkipLifecycleSteps = {
  [key in Task]?: boolean;
}


type TypePrefixes = SpecConfig.Type[];

export type BumpFile =
  | string
  | { filename: string; type: "json" | "gradle" | "plain-text" }
  | { filename: string; updater: string };

/**
 * __THIS SHOULD NOT CHANGE.__
 * @deprecated
 *
 * The configuration options for `standard-version` as of version 9.5
 * (The last version prior to the fork; deprecated).
 * All properties are optional as none are required to br provided by the user.
 */
export interface LegacyConfig {
  packageFiles?: BumpFile[];
  bumpFiles?: BumpFile[];
  releaseAs?: Release;
  prerelease?: string | boolean;
  infile?: string;
  message?: string;
  firstRelease?: boolean;
  sign?: boolean;
  noVerify?: boolean;
  commitAll?: boolean;
  silent?: boolean;
  tagPrefix?: string;
  scripts?: LifecycleHookScripts;
  skip?: SkipLifecycleSteps;
  dryRun?: boolean;
  gitTagFallback?: boolean;
  path?: string;
  changelogHeader?: string;
  preset?: string;
  lernaPackage?: string;
  header?: string;
  types?: TypePrefixes;
  preMajor?: boolean;
  commitUrlFormat?: string;
  compareUrlFormat?: string;
  issueUrlFormat?: string;
  userUrlFormat?: string;
  releaseCommitMessageFormat?: string;
  issuePrefixes?: string[];
  verbose?: boolean;
};

/**
 * Configuration object read from files
 * All properties are optional as none are required to br provided by the user.
 * This does not inherit from or extend {@link LegacyConfig} to provide
 * a distinct delineation between the old and new
 */
export interface FileConfig {
  packageFiles?: BumpFile[];
  bumpFiles?: BumpFile[];
  releaseAs?: Release;
  prerelease?: string | boolean;
  infile?: string;
  firstRelease?: boolean;
  sign?: boolean;
  noVerify?: boolean;
  commitAll?: boolean;
  silent?: boolean;
  tagPrefix?: string;
  releaseCount?: number;
  tagForce?: boolean;
  scripts?: LifecycleHookScripts;
  skip?: SkipLifecycleSteps;
  dryRun?: boolean;
  gitTagFallback?: boolean;
  path?: string;
  preset?: string;
  lernaPackage?: string;
  header?: string;
  types?: TypePrefixes;
  preMajor?: boolean;
  commitUrlFormat?: string;
  compareUrlFormat?: string;
  issueUrlFormat?: string;
  userUrlFormat?: string;
  releaseCommitMessageFormat?: string;
  issuePrefixes?: string[];
  npmPublishHint?: string;
  verbose?: boolean;
};

export interface CliConfig {
  packageFiles?: BumpFile[];
  bumpFiles?: BumpFile[];
  releaseAs?: Release;
  prerelease?: string | boolean;
  infile?: string;
  message?: string;
  firstRelease?: boolean;
  sign?: boolean;
  noVerify?: boolean;
  commitAll?: boolean;
  silent?: boolean;
  tagPrefix?: string;
  releaseCount?: number;
  tagForce?: boolean;
  scripts?: LifecycleHookScripts;
  skip?: SkipLifecycleSteps;
  dryRun?: boolean;
  gitTagFallback?: boolean;
  path?: string;
  preset?: string;
  lernaPackage?: string;
  header?: string;
  types?: TypePrefixes;
  preMajor?: boolean;
  commitUrlFormat?: string;
  compareUrlFormat?: string;
  issueUrlFormat?: string;
  userUrlFormat?: string;
  releaseCommitMessageFormat?: string;
  issuePrefixes?: string[];
  npmPublishHint?: string;
  verbose?: boolean;
}

/**
 * The configuration object for commit-and-tag-version,
 * which is a superset of the conventional-changelog-config-spec
 * (as of version 2.1.0)
 * This may or may not maintain backwards compatibility with
 * standard-version (as of version 9.5.0).
 *
 * This overrides properties in {@link FileConfig} that are required
 * for the code to run properly, eliminating some checks to see
 * if an option was specified.
 *
 * All options read from package.json or a config file are merged
 * with the default config options.
 */
interface Configuration extends FileConfig {
  packageFiles: BumpFile[];
  bumpFiles: BumpFile[];
  infile: string;
  firstRelease: boolean;
  sign: boolean;
  noVerify: boolean;
  commitAll: boolean;
  silent: boolean;
  tagPrefix: string;
  releaseCount: number;
  tagForce: boolean;
  scripts: LifecycleHookScripts;
  skip: SkipLifecycleSteps;
  dryRun: boolean;
  gitTagFallback: boolean;
  preset: string;
  header: string;
  types: TypePrefixes;
  preMajor: boolean;
  commitUrlFormat: string;
  compareUrlFormat: string;
  issueUrlFormat: string;
  userUrlFormat: string;
  releaseCommitMessageFormat: string;
  issuePrefixes: string[];
  verbose: boolean;
}

/** The primary config type to use throughout the code base */
export type Config = PrettyPrint<Configuration>;
