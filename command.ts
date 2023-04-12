/*
I haven't been able to find API docs for yargs that explain the runtime semantics thoroughly enough to describe the types,
and the types give do not appear to agree with the usage below. This leads me to believe the types are either incorrect or incomplete,
and adding types to Yargs is outside of scope.

As a compromise, `argv` is manually typed, and the type must be updated as changes are made below. There is a
[separate isssue](https://github.com/absolute-version/commit-and-tag-version/issues/31) for refactoring the API to bring the CLI
options to parity with the JSON options, which would likely involve breaking changes.
*/

import yargs from 'yargs/yargs';
import { Task } from './lib/opts/types';
import spec from './lib/opts/spec';

export const cmdParser = yargs(process.argv.slice(2))
  .scriptName('commit-and-tag-version')
  .usage('Usage: $0 [options]')
  .help('help').alias('help', 'h')
  .alias('version', 'v')
  .options({
    verbose: {
      boolean: true,
    },
    packageFiles: {
      // default: defaults.packageFiles,
      array: true,
      string: true,
      requiresArg: true,
    },
    bumpFiles: {
      array: true,
      string: true,
      requiresArg: true,
    },
    releaseAs: {
      alias: 'r',
      describe: 'Specify the release type manually (like npm version <major|minor|patch>)',
      requiresArg: true,
      string: true,
    },
    prerelease: {
      alias: 'p',
      string: true,
      describe: 'Make a pre-release with optional option value to specify a tag id',
    },
    infile: {
      alias: 'i',
      describe: 'Read the CHANGELOG from this file',
      // default: defaults.infile,
    },
    releaseCommitMessageFormat: {
      alias: 'm',
      describe: 'Commit message, replaces %s with new version',
      string: true,
      // default: spec.releaseCommitMessageFormat.default,
    },
    message: {
      describe: 'This option will be removed in the next major version',
      string: true,
      deprecated: 'Use --releaseCommitMessageFormat',
    },
    firstRelease: {
      alias: 'f',
      describe: 'Is this the first release?',
      boolean: true,
      // default: defaults.firstRelease
    },
    sign: {
      alias: 's',
      describe: 'Should the git commit and tag be signed?',
      boolean: true,
      // default: defaults.sign
    },
    noVerify: {
      alias: 'n',
      describe:
        'Bypass pre-commit or commit-msg git hooks during the commit phase',
      boolean: true,
      // default: defaults.noVerify
    },
    commitAll: {
      alias: 'a',
      describe:
        'Commit all staged changes, not just files affected by commit-and-tag-version',
      boolean: true,
      // default: defaults.commitAll
    },
    silent: {
      alias: ['s', 'q', 'quiet'],
      describe: "Don't print logs and errors",
      boolean: true,
      // default: defaults.silent
    },
    tagPrefix: {
      alias: 't',
      describe: 'Set a custom prefix for the git tag to be created',
      string: true,
      // default: defaults.tagPrefix
    },
    releaseCount: {
      describe: 'How many releases of changelog you want to generate. It counts from the upcoming release. Useful when you forgot to generate any previous changelog. Set to 0 to regenerate all.',
      number: true,
      // default: defaults.releaseCount
    },
    tagForce: {
      describe: 'Allow tag replacement',
      boolean: true,
      // default: defaults.tagForce
    },
    scripts: {
      describe: 'Provide scripts to execute for lifecycle events (prebump, precommit, etc.,)',
      // default: defaults.scripts
    },
    skip: {
      array: true,
      string: true,
      describe: 'Map of steps in the release process that should be skipped',
      choices: Object.values(Task),

      // default: defaults.skip
    },
    dryRun: {
      boolean: true,
      // default: defaults.dryRun,
      describe: 'See the commands that running commit-and-tag-version would run'
    },
    gitTagFallback: {
      boolean: true,
      // default: defaults.gitTagFallback,
      describe: 'Fallback to git tags for version, if no meta-information file is found (e.g., package.json)'
    },
    path: {
      string: true,
      describe: 'Only populate commits made under this path'
    },
    changelogHeader: {
      string: true,
      describe: 'This option will be removed in the next major version',
      deprecated: 'Use --header'
    },
    preset: {
      string: true,
      // default: defaults.preset,
      describe: 'Commit message guideline preset'
    },
    lernaPackage: {
      alias: 'lerna-package',
      string: true,
      describe: 'Name of the package from which the tags will be extracted'
    },
    npmPublishHint: {
      string: true,
      // default: defaults.npmPublishHint,
      describe: 'Customized publishing hint'
    },
    header: {
      alias: 'h',
      string: true,
      // default: defaults.header,
      describe: 'Use a custom header when generating and updating changelog',
    },
    types: {
      alias: 'type',
      array: true,
      // default: defaults.types,
      describe: spec.types.description
    },
    preMajor: {
      boolean: true,
      // default: defaults.dryRun,
      describe: spec.preMajor.description,
    },
    commitUrlFormat: {
      string: true,
      describe: spec.commitUrlFormat.description,
    },
    issueUrlFormat: {
      string: true,
      describe: spec.issueUrlFormat.description,
    },
    userUrlFormat: {
      string: true,
      describe: spec.userUrlFormat.description,
    },
    issuePrefixes: {
      array: true,
      string: true,
      describe: spec.issuePrefixes.description,
    },
  })
  // .check((argv) => {
  //   if (argv.scripts && (typeof argv.scripts !== 'object' || Array.isArray(argv.scripts))) {
  //     throw Error('scripts must be an object')
  //   } else if (argv.skip && (typeof argv.skip !== 'object' || Array.isArray(argv.skip))) {
  //     throw Error('skip must be an object')
  //   } else {
  //     return true
  //   }
  // })
  .example('$0', 'Update changelog and tag release')
  .example(
    '$0 -m "%s: see changelog for details"',
    'Update changelog and tag release with custom commit message'
  )
  // .pkgConf('standard-version')
  // .pkgConf('commit-and-tag-version')
  // .config(getConfiguration())
  .wrap(97);

// type YargsOptionsType = 'array' | 'count' | 'boolean' | 'number' | 'string' | undefined;

// function convertSpecPropertyType(type: JSONSchema7TypeName): YargsOptionsType {
//   if (type === 'integer') return 'number';
//   if (type === 'null') return undefined;
//   if (type === 'object') return 'array';
//   return type;
// }

// Object.keys(spec).forEach((propertyKey) => {
//   const propName = propertyKey as keyof typeof spec;
//   const property = spec[propName];
//   console.log('propertyKey:', propertyKey);

//   cmdParser.option(propertyKey, {
//     type: convertSpecPropertyType(property.type),
//     describe: property.description,
//     // default: defaults[propName] ? defaults[propName] : property.default,
//     // group: 'Preset Configuration:',
//   });
// });
const argv = cmdParser.parseSync();

export default argv;
