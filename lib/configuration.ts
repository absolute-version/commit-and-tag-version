import fs from 'fs';
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

export async function getConfiguration(cwd?: string): Promise<FileConfig> {
  const currentDir = cwd || process.cwd();
  const configFile = getConfigFile(cwd || process.cwd()); // findUp.sync(CONFIGURATION_FILES)
  if (!configFile) {
    return {}
  }

  const config = await readConfigFile(configFile, currentDir);
  console.log(currentDir, configFile, typeof config, config);
  const contents = fs.readFileSync(configFile, 'utf-8');
  // console.log(contents);
  /**
   * @todo we could eventually have deeper validation of the configuration (using `ajv`) and
   * provide a more helpful error.
   */
  if (typeof config !== 'object') {
    throw new Error(
      `[commit-and-tag-version] Invalid configuration in ${configFile} provided. Expected an object but found ${typeof config}.`
    )
  }

  return config
}

function getConfigFile(cwd: string) {
  return CONFIGURATION_FILES.find((file) => fs.existsSync(path.join(cwd, file)));
}

async function readConfigFile(configFile: string, cwd: string): Promise<FileConfig> {
  const configPath = path.resolve(cwd, configFile);
  console.log('configPath', configPath)

  const ext = path.extname(configFile);
  if (ext === '.js' || ext === '.cjs') {
    const jsConfiguration = require(configPath);
    if (typeof jsConfiguration === 'function') {
      console.log(jsConfiguration());
      return jsConfiguration();
    }
    console.log(jsConfiguration);
    return jsConfiguration;
  }
  return JSON.parse(readFileSync(configPath, 'utf-8'));
}
