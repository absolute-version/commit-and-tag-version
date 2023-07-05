import path from 'path'
import findUp from 'find-up'
import { readFileSync } from 'fs'
import { Config } from './opts'

const CONFIGURATION_FILES = [
  '.versionrc',
  '.versionrc.json',
  '.versionrc.cjs',
  '.versionrc.js'
] as const;

export async function getConfiguration () {
  let config: Partial<Config> = {}
  const configPath = findUp.sync(CONFIGURATION_FILES)
  if (!configPath) {
    return config
  }
  const ext = path.extname(configPath)
  if (ext === '.js' || ext === '.cjs') {
    const jsConfiguration = await import(configPath)
    if (typeof jsConfiguration === 'function') {
      config = jsConfiguration()
    } else {
      config = jsConfiguration
    }
  } else {
    config = JSON.parse(readFileSync(configPath, 'utf-8'))
  }

  /**
   * @todo we could eventually have deeper validation of the configuration (using `ajv`) and
   * provide a more helpful error.
   */
  if (typeof config !== 'object') {
    throw Error(
      `[commit-and-tag-version] Invalid configuration in ${configPath} provided. Expected an object but found ${typeof config}.`
    )
  }

  return config
}
