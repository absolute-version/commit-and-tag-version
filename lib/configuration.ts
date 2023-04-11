import path from 'path'
import findUp from 'find-up'
import { readFileSync } from 'fs'
import { FileConfig } from './opts/types'

const CONFIGURATION_FILES = [
  '.versionrc',
  '.versionrc.json',
  '.versionrc.cjs',
  '.versionrc.js'
] as const;

export async function getConfiguration(): Promise<FileConfig> {
  const configPath = findUp.sync(CONFIGURATION_FILES)
  if (!configPath) {
    return {}
  }
  const config = await readConfigFile(configPath);

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
async function readConfigFile(configPath: string): Promise<FileConfig> {
  const ext = path.extname(configPath);
  if (ext === '.js' || ext === '.cjs') {
    const jsConfiguration = require(configPath);
    if (typeof jsConfiguration === 'function') {
      return jsConfiguration();
    }
    return jsConfiguration;
  }
  return JSON.parse(readFileSync(configPath, 'utf-8'));
}
