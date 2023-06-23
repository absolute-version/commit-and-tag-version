import chalk from 'chalk';
import checkpoint from '../checkpoint';
import conventionalChangelog from 'conventional-changelog';
import fs from 'fs';
import runLifecycleScript from '../run-lifecycle-script';
import writeFile from '../write-file';
import { Config, Hook } from '../opts/types';

const START_OF_LAST_RELEASE_PATTERN = /(^#+ \[?[0-9]+\.[0-9]+\.[0-9]+|<a name=)/m

export default async function Changelog (config: Config, newVersion: string) {
  if (config.skip.changelog) return;

  await runLifecycleScript(config, Hook.prechangelog);
  await outputChangelog(config, newVersion);
  await runLifecycleScript(config, Hook.postchangelog);
}

Changelog.START_OF_LAST_RELEASE_PATTERN = START_OF_LAST_RELEASE_PATTERN

function outputChangelog(config: Config, newVersion: string) {
  return new Promise<void>((resolve, reject) => {
    createIfMissing(config)
    const header = config.header

    let oldContent = config.dryRun || config.releaseCount === 0 ? '' : fs.readFileSync(config.infile, 'utf-8')
    const oldContentStart = oldContent.search(START_OF_LAST_RELEASE_PATTERN)
    // find the position of the last release and remove header:
    if (oldContentStart !== -1) {
      oldContent = oldContent.substring(oldContentStart)
    }
    let content = ''
    const context = { version: newVersion }
    const changelogStream = conventionalChangelog(
      {
        debug: config.verbose ? console.info.bind(console, 'conventional-changelog') : undefined,
        preset: config.preset, // presetLoader(config),
        tagPrefix: config.tagPrefix,

        releaseCount: config.releaseCount,
        config: {
          parserOpts: {
            issuePrefixes: config.issuePrefixes,
          },
        },
      },
      context,
      {
        merges: null,
        path: config.path,
        showSignature: false,

      },
    ).on('error', function (err) {
      return reject(err)
    });

    changelogStream.on('data', function (buffer) {
      content += buffer.toString()
    })

    changelogStream.on('end', function () {
      checkpoint(config, 'outputting changes to %s', [config.infile])
      if (config.dryRun) console.info(`\n---\n${chalk.gray(content.trim())}\n---\n`)
      else writeFile(config, config.infile, header + '\n' + (content + oldContent).replace(/\n+$/, '\n'))
      return resolve()
    })
  })
}

function createIfMissing(config: Config) {
  try {
    fs.accessSync(config.infile, fs.constants.F_OK)
  } catch (err: any) {
    if (err.code === 'ENOENT') {
      checkpoint(config, 'created %s', [config.infile])
      // TODO: what is outputUnreleased used for?
      // config.outputUnreleased = true
      writeFile(config, config.infile, '\n');
    }
  }
}
