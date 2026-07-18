import path from 'path';
import { createRequire } from 'module';
import fs from 'fs';
import findUp from 'find-up';

const require = createRequire(import.meta.url);

const CONFIGURATION_FILES = [
  '.versionrc',
  '.versionrc.cjs',
  '.versionrc.json',
  '.versionrc.js',
];

export function getConfiguration(configFile) {
  let config = {};

  // If the user has provided a configuration file via the `--config` argument, we use that.
  const configurationFiles = configFile ?? CONFIGURATION_FILES;

  const configPath = findUp.sync(configurationFiles);
  if (!configPath) {
    return config;
  }
  const ext = path.extname(configPath);
  if (ext === '.js' || ext === '.cjs') {
    const jsConfiguration = require(configPath);
    if (typeof jsConfiguration === 'function') {
      config = jsConfiguration();
    } else {
      config = jsConfiguration;
    }
  } else {
    config = JSON.parse(fs.readFileSync(configPath));
  }

  /**
   * @todo we could eventually have deeper validation of the configuration (using `ajv`) and
   * provide a more helpful error.
   */
  if (typeof config !== 'object') {
    throw Error(
      `[commit-and-tag-version] Invalid configuration in ${configPath} provided. Expected an object but found ${typeof config}.`,
    );
  }

  return config;
}
