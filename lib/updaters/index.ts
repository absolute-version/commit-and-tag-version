import path from 'path';
import defaults from '../../defaults';
import jsonUpdater from './types/json';
import plainTextUpdater from './types/plain-text';
import gradleUpdater from './types/gradle';
import { BumpFile } from 'lib/opts/types';

interface Updater {
  readVersion(contents: string): string;
  writeVersion(contents: string, version: string): any;
  isPrivate?: (contents: string) => boolean;
}

interface VersionUpdater {
  filename: string;
  updater: Required<Updater>;
}

type UpdaterType = 'json' | 'plain-text' | 'gradle';

const JSON_BUMP_FILES = defaults.bumpFiles;
const PLAIN_TEXT_BUMP_FILES = ['VERSION.txt', 'version.txt']

const updatersByType: Record<UpdaterType, Updater> = {
  json: jsonUpdater,
  'plain-text': plainTextUpdater,
  gradle: gradleUpdater,
};

function getUpdaterByType(type: UpdaterType, filename: string): VersionUpdater {
  const updater = updatersByType[type];
  if (!updater) {
    throw Error(`Unable to locate updater for provided type (${type}).`)
  }
  return {
    filename,
    updater: {
      isPrivate: () => false,
      ...updater,
    },
  };
}

function getUpdaterTypeFromFilename(filename: string) {
  if (JSON_BUMP_FILES.includes(path.basename(filename))) {
    return 'json';
  }
  if (PLAIN_TEXT_BUMP_FILES.includes(filename)) {
    return 'plain-text';
  }
  if (/build.gradle/.test(filename)) {
    return 'gradle';
  }
  throw Error(
    `Unsupported file (${filename}) provided for bumping.\n Please specify the updater \`type\` or use a custom \`updater\`.`
  )
}

function getUpdaterFromFile(updater: string, filename: string): VersionUpdater {
  const type = getUpdaterTypeFromFilename(updater);
  return getUpdaterByType(type, filename);
}

function getCustomUpdaterFromPath(filename: string): VersionUpdater {
  const updater = require(path.resolve(process.cwd(), filename));
  /**
   * TODO: This doesn't seem right. If just a string is provided, we use
   * that as the loader, but don't know what file to read/write to!
   */
  if (isValidUpdater(updater)) {
    return {
      filename,
      updater: {
        isPrivate: () => false,
        ...updater,
      },
    };
  }

  throw new Error('Updater must be a string path or an object with readVersion and writeVersion methods')
}

/**
 * Simple check to determine if the object provided is a compatible updater.
 */
function isValidUpdater(obj: any): obj is Updater {
  return (
    obj &&
    typeof obj.readVersion === 'function' &&
    typeof obj.writeVersion === 'function'
  )
}

export function resolveUpdaterObjectFromArgument(arg: BumpFile): VersionUpdater | undefined {
  /**
   * If an Object was not provided, we assume it's the path/filename
   * of the updater.
   */
  try {
    if (typeof arg === 'string') {
      return getCustomUpdaterFromPath(arg);
    } else if ('type' in arg) {
      return getUpdaterByType(arg.type, arg.filename);
    } else {
      return getUpdaterFromFile(arg.filename, arg.updater);
    }
  } catch (err: any) {
    if (err.code !== 'ENOENT') console.warn(`Unable to obtain updater for: ${JSON.stringify(arg)}\n - Error: ${err.message}\n - Skipping...`)
  }
  /**
   * We weren't able to resolve an updater for the argument.
   */
  return undefined;
}
