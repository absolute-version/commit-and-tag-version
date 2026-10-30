import path from 'path';
import { createRequire } from 'module';
import fs from 'fs';
import findUp from 'find-up';

const require = createRequire(import.meta.url);

const CONFIGURATION_FILES = [
  '.versionrc',
  '.versionrc.cjs',
  '.versionrc.mjs',
  '.versionrc.json',
  '.versionrc.js',
];

/**
 * Deep-merge plain objects one level for nested config maps (e.g. `skip`,
 * `scripts`). Arrays and non-objects are replaced by the override value.
 * Later configs win on key conflicts.
 * @param {Record<string, unknown>} base
 * @param {Record<string, unknown>} override
 * @returns {Record<string, unknown>}
 */
export function mergeConfiguration(base, override) {
  const result = { ...base };
  for (const [key, value] of Object.entries(override)) {
    const existing = base[key];
    if (
      value != null &&
      typeof value === 'object' &&
      !Array.isArray(value) &&
      existing != null &&
      typeof existing === 'object' &&
      !Array.isArray(existing)
    ) {
      result[key] = { ...existing, ...value };
    } else {
      result[key] = value;
    }
  }
  return result;
}

/**
 * Load a single configuration file from an absolute path.
 * @param {string} configPath
 * @returns {Record<string, unknown>}
 */
function loadConfigurationFromPath(configPath) {
  let config;
  const ext = path.extname(configPath);
  if (ext === '.js' || ext === '.cjs' || ext === '.mjs') {
    let jsConfiguration = require(configPath);
    // ES modules arrive as a namespace wrapper (via Node's `require(esm)`,
    // available since 22.12); the configuration is its default export.
    if (
      jsConfiguration != null &&
      (jsConfiguration.__esModule ||
        jsConfiguration[Symbol.toStringTag] === 'Module')
    ) {
      jsConfiguration = jsConfiguration.default;
    }
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
  if (typeof config !== 'object' || config === null || Array.isArray(config)) {
    throw Error(
      `[commit-and-tag-version] Invalid configuration in ${configPath} provided. Expected an object but found ${typeof config}.`,
    );
  }

  return config;
}

/**
 * Resolve `--config` / `-c` values to a list of paths to load, or `null` to
 * fall back to discovering a default `.versionrc*` via find-up.
 * @param {string | string[] | undefined | null} configFile
 * @returns {string[] | null}
 */
function normalizeConfigFiles(configFile) {
  if (configFile == null) {
    return null;
  }
  const files = (Array.isArray(configFile) ? configFile : [configFile]).filter(
    (file) => typeof file === 'string' && file.length > 0,
  );
  return files.length > 0 ? files : null;
}

/**
 * @param {string | string[] | undefined | null} configFile
 * @returns {Record<string, unknown>}
 */
export function getConfiguration(configFile) {
  const explicitFiles = normalizeConfigFiles(configFile);

  // Auto-discover a single default config when `--config` was not passed.
  if (explicitFiles == null) {
    const configPath = findUp.sync(CONFIGURATION_FILES);
    if (!configPath) {
      return {};
    }
    return loadConfigurationFromPath(configPath);
  }

  // One or more explicit `--config` paths: load in order and merge (later wins).
  let config = {};
  for (const file of explicitFiles) {
    const configPath = findUp.sync(file);
    if (!configPath) {
      throw Error(
        `[commit-and-tag-version] Configuration file \`${file}\` was not found.`,
      );
    }
    config = mergeConfiguration(config, loadConfigurationFromPath(configPath));
  }
  return config;
}
