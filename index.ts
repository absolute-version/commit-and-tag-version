import fs from 'fs';
import path from 'path';

import Bump from './lib/lifecycles/bump';
import changelog from './lib/lifecycles/changelog';
import commit from './lib/lifecycles/commit';
import latestSemverTag from './lib/latest-semver-tag';
import printError from './lib/print-error';
import tag from './lib/lifecycles/tag';
import { resolveUpdaterObjectFromArgument } from './lib/updaters';
import { getMergedConfig } from './lib/opts';
import { BumpFile, Config } from './lib/opts/types';

interface PackageInfo {
  version: string;
  private: boolean;
}

export default async function standardVersion(argv: any) {
  const config = await getMergedConfig(argv);

  if (
    config.header &&
    config.header.search(changelog.START_OF_LAST_RELEASE_PATTERN) !== -1
  ) {
    throw Error(
      `custom changelog header must not match ${changelog.START_OF_LAST_RELEASE_PATTERN}`
    );
  }

  try {
    const info = await getPackageInfo(config);
    const newVersion = await Bump(config, info.version);

    await changelog(config, newVersion);
    await commit(config, newVersion);
    await tag(newVersion, info.private, config);
  } catch (err: any) {
    printError(config, err.message)
    throw err;
  }
}

async function getPackageInfo(config: Config): Promise<PackageInfo> {
  const pkg = getPackage(config.packageFiles);

  if (pkg) return pkg;

  if (config.gitTagFallback) {
    const version = await latestSemverTag(config.tagPrefix);
    return {
      version,
      private: false,
    }
  }

  throw new Error('no package file found')
}

function getPackage(packageFiles: BumpFile[]) {
  for (const packageFile of packageFiles) {
    const updater = resolveUpdaterObjectFromArgument(packageFile)
    if (!updater) continue;
    const pkgPath = path.resolve(process.cwd(), updater.filename)
    try {
      const contents = fs.readFileSync(pkgPath, 'utf8')
      return {
        version: updater.updater.readVersion(contents),
        private: updater.updater.isPrivate(contents),
      };
    } catch (err) {}
  }
  return undefined;
}
