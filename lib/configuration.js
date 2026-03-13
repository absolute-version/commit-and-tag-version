const path = require('path');
const findUp = require('find-up');
const { readFileSync } = require('fs');

const CONFIGURATION_FILES = [
  '.versionrc',
  '.versionrc.cjs',
  '.versionrc.json',
  '.versionrc.js',
];

module.exports.getConfiguration = function (configFile) {
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
    config = JSON.parse(readFileSync(configPath));
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
};
