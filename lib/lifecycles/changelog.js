import chalk from 'chalk';
import { ConventionalChangelog } from 'conventional-changelog';
import fs from 'fs';
import checkpoint from '../checkpoint.js';
import presetLoader from '../preset-loader.js';
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

async function outputChangelog(args, newVersion) {
  createIfMissing(args);
  const header = args.header;

  const oldContent =
    args.dryRun || args.releaseCount === 0
      ? ''
      : fs.readFileSync(args.infile, 'utf-8');

  const oldContentBody = extractChangelogBody(oldContent);

  const changelogFrontMatter = extractFrontMatter(oldContent);

  const generator = new ConventionalChangelog()
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
    .commits({ merges: null, path: args.path }, args.parserOpts)
    .writer(args.writerOpts || {});

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
        (content + oldContentBody).replace(/\n+$/, '\n'),
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
