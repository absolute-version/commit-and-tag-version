import { ConventionalGitClient } from '@conventional-changelog/git-client';
import chalk from 'chalk';
import { ConventionalChangelog } from 'conventional-changelog';
import fs from 'fs';
import semver from 'semver';
import checkpoint from '../checkpoint.js';
import presetLoader, {
  getParserOpts,
  getWriterOpts,
} from '../preset-loader.js';
import runLifecycleScript from '../run-lifecycle-script.js';
import writeFile from '../write-file.js';

const START_OF_LAST_RELEASE_PATTERN =
  /(^#+ \[?[0-9]+\.[0-9]+\.[0-9]+|<a name=)/m;

async function Changelog(args, newVersion) {
  if (args.skip.changelog) return;
  await runLifecycleScript(args, 'prechangelog');
  await outputChangelog(args, newVersion);
  await runLifecycleScript(args, 'postchangelog');
}

Changelog.START_OF_LAST_RELEASE_PATTERN = START_OF_LAST_RELEASE_PATTERN;

export default Changelog;

/**
 * Front matter is only extracted and therefore retained in final output where Changelog "header" begins with #Changelog,
 * e.g. meets Standard-Version (last release) or commit-and-tag-version(current) format
 */
function extractFrontMatter(oldContent) {
  const headerStart = oldContent.indexOf('# Changelog');
  return headerStart !== -1 || headerStart !== 0
    ? oldContent.substring(0, headerStart)
    : '';
}

/**
 * find the position of the last release and remove header
 */
function extractChangelogBody(oldContent) {
  const oldContentStart = oldContent.search(START_OF_LAST_RELEASE_PATTERN);
  return oldContentStart !== -1
    ? oldContent.substring(oldContentStart)
    : oldContent;
}

/**
 * The prerelease identifier of a version: 'alpha' for 1.0.0-alpha.1, '' for an
 * unnamed prerelease such as 1.0.0-0, and null for a stable version.
 */
function prereleaseChannel(version) {
  const prerelease = semver.prerelease(version);
  if (!prerelease) return null;
  return typeof prerelease[0] === 'string' ? prerelease[0] : '';
}

/**
 * Whether an earlier release ends the changelog section of the version being
 * released. Stable releases always do. Prereleases only do for a later
 * prerelease with the same identifier, so that:
 * - a stable release, or the first prerelease with a new identifier, covers
 *   everything since the last stable release, including changes that only
 *   appeared in other prereleases (#310)
 * - a continued prerelease only covers changes since the previous prerelease
 *   with that identifier, rather than repeating them every time (#349)
 */
function isReleaseBoundary(version, newVersion) {
  if (!semver.valid(version)) return false;
  const channel = prereleaseChannel(version);
  return channel === null || channel === prereleaseChannel(newVersion);
}

/**
 * Git client that only reports the tags which are release boundaries for the
 * version being released, so the changelog's commit range, section splits
 * and compare links all agree on where the previous release was.
 */
class ReleaseBoundaryGitClient extends ConventionalGitClient {
  constructor(cwd, newVersion) {
    super(cwd);
    this.newVersion = newVersion;
  }

  async *getSemverTags(params = {}) {
    for await (const tag of super.getSemverTags(params)) {
      if (isReleaseBoundary(tag.replace(params.prefix, ''), this.newVersion)) {
        yield tag;
      }
    }
  }
}

async function outputChangelog(args, newVersion) {
  createIfMissing(args);
  const header = args.header;

  const oldContent =
    args.dryRun || args.releaseCount === 0
      ? ''
      : fs.readFileSync(args.infile, 'utf-8');

  const oldContentBody = extractChangelogBody(oldContent);

  const changelogFrontMatter = extractFrontMatter(oldContent);

  const generator = new ConventionalChangelog(
    new ReleaseBoundaryGitClient(process.cwd(), newVersion),
  )
    .readPackage()
    .loadPreset(presetLoader(args))
    .tags({ prefix: args.tagPrefix })
    .options({
      releaseCount: args.releaseCount,
      ...(args.verbose
        ? {
            debug: console.info.bind(console, 'conventional-changelog'),
          }
        : {}),
    })
    .context({ version: newVersion })
    .commits({ merges: null, path: args.path }, getParserOpts(args))
    .writer({
      // Split sections at the same tags the commit range is built from, so
      // commits released in other prereleases stay in this release's section
      // rather than being regenerated under that prerelease's heading.
      generateOn: (commit) => isReleaseBoundary(commit.version, newVersion),
      ...(getWriterOpts(args) || {}),
    });

  let content = '';
  for await (const chunk of generator.write()) {
    content += chunk;
  }

  checkpoint(args, 'outputting changes to %s', [args.infile]);
  if (args.dryRun) console.info(`\n---\n${chalk.gray(content.trim())}\n---\n`);
  else
    writeFile(
      args,
      args.infile,
      changelogFrontMatter +
        header +
        '\n' +
        (content + '\n' + oldContentBody).replace(/\n+$/, '\n'),
    );
}

function createIfMissing(args) {
  try {
    fs.accessSync(args.infile, fs.constants.F_OK);
  } catch (err) {
    if (err.code === 'ENOENT') {
      checkpoint(args, 'created %s', [args.infile]);
      args.outputUnreleased = true;
      writeFile(args, args.infile, '\n');
    }
  }
}
