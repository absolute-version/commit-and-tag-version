import path from 'path'
import { bumpFiles as JSON_BUMP_FILES } from '@/defaults'
// TODO: change resolution of updaters to use dynamic imports or tuple destructuring
const updatersByType = {
  json: require('./types/json'),
  'plain-text': require('./types/plain-text'),
  gradle: require('./types/gradle')
}
const PLAIN_TEXT_BUMP_FILES = ['VERSION.txt', 'version.txt']

function getUpdaterByType(type) {
  const updater = updatersByType[type]
  if (!updater) {
    throw Error(`Unable to locate updater for provided type (${type}).`)
  }
  return updater
}

function getUpdaterByFilename(filename) {
  if (JSON_BUMP_FILES.includes(path.basename(filename))) {
    return getUpdaterByType('json')
  }
  if (PLAIN_TEXT_BUMP_FILES.includes(filename)) {
    return getUpdaterByType('plain-text')
  }
  if (/build.gradle/.test(filename)) {
    return getUpdaterByType('gradle')
  }
  throw Error(
    `Unsupported file (${filename}) provided for bumping.\n Please specify the updater \`type\` or use a custom \`updater\`.`
  )
}

function getCustomUpdaterFromPath(updater) {
  if (typeof updater === 'string') {
    return require(path.resolve(process.cwd(), updater))
  }
  if (
    typeof updater.readVersion === 'function' &&
    typeof updater.writeVersion === 'function'
  ) {
    return updater
  }
  throw new Error(
    'Updater must be a string path or an object with readVersion and writeVersion methods'
  )
}

/**
 * Simple check to determine if the object provided is a compatible updater.
 */
function isValidUpdater(obj) {
  return (
    obj &&
    typeof obj.readVersion === 'function' &&
    typeof obj.writeVersion === 'function'
  )
}

export function resolveUpdaterObjectFromArgument(arg) {
  /**
   * If an Object was not provided, we assume it's the path/filename
   * of the updater.
   */
  let updater = arg
  if (isValidUpdater(updater)) {
    return updater
  }
  if (typeof updater !== 'object') {
    updater = {
      filename: arg
    }
  }

  if (!isValidUpdater(updater.updater)) {
    try {
      if (typeof updater.updater === 'string') {
        updater.updater = getCustomUpdaterFromPath(updater.updater)
      } else if (updater.type) {
        updater.updater = getUpdaterByType(updater.type)
      } else {
        updater.updater = getUpdaterByFilename(updater.filename)
      }
    } catch (err) {
      if (err.code !== 'ENOENT')
        console.warn(
          `Unable to obtain updater for: ${JSON.stringify(arg)}\n - Error: ${
            err.message
          }\n - Skipping...`
        )
    }
  }
  /**
   * We weren't able to resolve an updater for the argument.
   */
  if (!isValidUpdater(updater.updater)) {
    return false
  }

  return updater
}
