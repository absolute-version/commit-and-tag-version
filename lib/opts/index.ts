import fs from 'fs';
import path from "path";
import { getConfiguration } from "../configuration";
import { isin } from "../../type-helpers";
import { Config, FileConfig, LegacyConfig, SkipLifecycleSteps, Task } from './types';
import defaults from '../../defaults';

/** The configuration options that are not supported by standard-version (as of version 9.5.0). */
const catVOnlyFeatures = [
  "npmPublishHint",
  "releaseCount",
  "tagForce",
];

async function loadPackageJson(cwd?: string): Promise<any> {
  const searchDir = cwd ?? process.cwd();
  const pkgPath = path.join(searchDir, 'package.json');
  if (fs.existsSync(pkgPath)) {
    return await import(pkgPath);
  }
  return {};
}

export async function getMergedConfig(argv: any, cwd?: string): Promise<Config> {
  // const searchDir = cwd ?? process.cwd();
  const pkgJson = await loadPackageJson(cwd); // await import(path.join(searchDir, "package.json"));
  console.log(pkgJson['commit-and-tag-version']);
  const legacyConf = convertLegacy(pkgJson["standard-version"] ?? {});
  const modernConf: FileConfig = pkgJson["commit-and-tag-version"] ?? {};
  const cliConf = convertCliConfig(argv);
  const configFromFile = await getConfiguration();

  // console.log('legacyConf', legacyConf);
  // console.log('modernConf', modernConf);
  // console.log('cliConf', cliConf);
  // console.log('configFromFile', configFromFile);

  // Check for legacy config properties that will be overwritten
  Object.keys(legacyConf).forEach((key) => {
    if (isin(modernConf, key as any)) {
      console.warn(
        `"standard-version"."${key}" in package.json is being overridden by "commit-and-tag-version"."${key}". in package.json`
      );
    }
  });

  const merged: FileConfig = {
    ...legacyConf,
    ...modernConf,
    ...configFromFile,
    ...cliConf,
  };
  const defaultConfig = { ...defaults };

  /**
   * If an argument for `packageFiles` provided,
   * we include it as a "default" `bumpFile`.
   */
  if (merged.packageFiles) {
    defaultConfig.bumpFiles = Array.from(new Set([
      ...(merged.bumpFiles || []),
      ...merged.packageFiles,
    ]));
  }

  return {
    ...defaultConfig,
    ...merged,
  };
}

const deprecatedOptions: Record<string, keyof FileConfig> = {
  message: 'releaseCommitMessageFormat',
  changelogHeader: 'header',
};

function resolveKey(key: string): keyof FileConfig {
  const deprecatedKey = deprecatedOptions[key];
  if (deprecatedKey) {
    console.warn(`The ${key} option is deprecated and will be removed in the next major version.  Use ${deprecatedKey} instead.`);
    return deprecatedKey;
  }
  return key as keyof FileConfig;
}

/**
 * Converts LegacyConfig to modern FileConfig by changing deprecated keys
 * in LegacyConfig to the modern equivalent
 */
function convertLegacy(legacyConf: LegacyConfig): FileConfig {
  const config: FileConfig = {};
  Object.keys(legacyConf).forEach((k) => {
    if (catVOnlyFeatures.includes(k)) {
      console.warn(
        `The "${k}" option is a feature of commit-and-tag-version, and is not supported by standard-version.${"\n"}Please move this option to the 'commit-and-tag-version' key.${"\n"}In a future version, this will throw an error.`
      );
    }
    const legacyKey = k as keyof LegacyConfig;
    const legacyValue = legacyConf[legacyKey] as any;
    const modernKey = resolveKey(legacyKey);
    config[modernKey] = legacyValue;
  });

  return config;
}

function resolveCliValue(argv: any, key: string): any {
  if (key === 'skip') {
    return convertCliSkip(argv.skip || []);
  }
  return argv[key];
}

function convertCliConfig(argv: any): FileConfig {
  const config: FileConfig = {};
  Object.keys(argv).forEach((key) => {
    const value = resolveCliValue(argv, key);
    const modernKey = resolveKey(key);
    config[modernKey] = value;
  });

  return config;
}

function convertCliSkip(arg: Task[]) {
  const skipOptions: SkipLifecycleSteps = {};
  arg.forEach((a) => {
    skipOptions[a] = true;
  });
  return skipOptions;
}
