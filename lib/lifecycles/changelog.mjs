import { readFileSync, accessSync, F_OK } from 'fs';
import chalk from 'chalk';
const gray = chalk.gray;
import checkpoint from '../checkpoint.mjs';
import conventionalChangelog from 'conventional-changelog';
import presetLoader from '../preset-loader.mjs';
import runLifecycleScript from '../run-lifecycle-script.mjs';
import writeFile from '../write-file.mjs';

export const START_OF_LAST_RELEASE_PATTERN =
  /(^#+ \[?[0-9]+\.[0-9]+\.[0-9]+|<a name=)/m;

async function Changelog(args, newVersion) {
  if (args.skip.changelog) return;
  await runLifecycleScript(args, 'prechangelog');
  await outputChangelog(args, newVersion);
  await runLifecycleScript(args, 'postchangelog');
}

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

function outputChangelog(args, newVersion) {
  return new Promise((resolve, reject) => {
    createIfMissing(args);
    const header = args.header;

    const oldContent =
      args.dryRun || args.releaseCount === 0
        ? ''
        : readFileSync(args.infile, 'utf-8');

    const oldContentBody = extractChangelogBody(oldContent);

    const changelogFrontMatter = extractFrontMatter(oldContent);

    let content = '';
    const context = { version: newVersion };
    const changelogStream = conventionalChangelog(
      {
        preset: presetLoader(args),
        tagPrefix: args.tagPrefix,
        releaseCount: args.releaseCount,
        ...(args.verbose
          ? {
            debug: console.info.bind(
              console,
              'conventional-recommended-bump',
            ),
          }
          : {}),
      },
      context,
      { merges: null, path: args.path, showSignature: false },
      args.parserOpts,
      args.writerOpts,
    ).on('error', function (err) {
      return reject(err);
    });

    changelogStream.on('data', function (buffer) {
      content += buffer.toString();
    });

    changelogStream.on('end', function () {
      checkpoint(args, 'outputting changes to %s', [args.infile]);
      if (args.dryRun)
        console.info(`\n---\n${gray(content.trim())}\n---\n`);
      else
        writeFile(
          args,
          args.infile,
          changelogFrontMatter +
          header +
          '\n' +
          (content + oldContentBody).replace(/\n+$/, '\n'),
        );
      return resolve();
    });
  });
}

function createIfMissing(args) {
  try {
    accessSync(args.infile, F_OK);
  } catch (err) {
    if (err.code === 'ENOENT') {
      checkpoint(args, 'created %s', [args.infile]);
      args.outputUnreleased = true;
      writeFile(args, args.infile, '\n');
    }
  }
}
