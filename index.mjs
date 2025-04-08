import { readFileSync } from 'fs';
import { resolve } from 'path';
import bump from './lib/lifecycles/bump.mjs';
import changelog, { START_OF_LAST_RELEASE_PATTERN } from './lib/lifecycles/changelog.mjs';
import commit from './lib/lifecycles/commit.mjs';
import latestSemverTag from './lib/latest-semver-tag.mjs';
import printError from './lib/print-error.mjs';
import tag from './lib/lifecycles/tag.mjs';
import { resolveUpdaterObjectFromArgument } from './lib/updaters/index.mjs';

export default async function standardVersion(argv) {
  const defaults = (await import('./defaults.mjs')).default;
  /**
   * `--message` (`-m`) support will be removed in the next major version.
   */
  const message = argv.m || argv.message;
  if (message) {
    /**
     * The `--message` flag uses `%s` for version substitutions, we swap this
     * for the substitution defined in the config-spec for future-proofing upstream
     * handling.
     */
    argv.releaseCommitMessageFormat = message.replace(/%s/g, '{{currentTag}}');
    if (!argv.silent) {
      console.warn(
        '[commit-and-tag-version]: --message (-m) will be removed in the next major release. Use --releaseCommitMessageFormat.',
      );
    }
  }

  if (argv.changelogHeader) {
    argv.header = argv.changelogHeader;
    if (!argv.silent) {
      console.warn(
        '[commit-and-tag-version]: --changelogHeader will be removed in the next major release. Use --header.',
      );
    }
  }

  if (
    argv.header &&
    argv.header.search(START_OF_LAST_RELEASE_PATTERN) !== -1
  ) {
    throw Error(
      `custom changelog header must not match ${START_OF_LAST_RELEASE_PATTERN}`,
    );
  }

  /**
   * If an argument for `packageFiles` provided, we include it as a "default" `bumpFile`.
   */
  if (argv.packageFiles) {
    defaults.bumpFiles = defaults.bumpFiles.concat(argv.packageFiles);
  }

  const args = Object.assign({}, defaults, argv);
  let pkg;
  for (const packageFile of args.packageFiles) {
    const updater = await resolveUpdaterObjectFromArgument(packageFile);
    if (!updater) return;
    const pkgPath = resolve(process.cwd(), updater.filename);
    try {
      const contents = readFileSync(pkgPath, 'utf8');
      pkg = {
        version: updater.updater.readVersion(contents),
        private:
          typeof updater.updater.isPrivate === 'function'
            ? updater.updater.isPrivate(contents)
            : false,
      };
      break;
      // eslint-disable-next-line no-unused-vars
    } catch (err) {
      /* This probably shouldn't be empty? */
    }
  }
  try {
    let version;
    if (pkg?.version) {
      version = pkg.version;
    } else if (args.gitTagFallback) {
      version = await latestSemverTag(args.tagPrefix);
    } else {
      throw new Error('no package file found');
    }

    const newVersion = await bump(args, version);
    await changelog(args, newVersion);
    await commit(args, newVersion);
    await tag(newVersion, pkg ? pkg.private : false, args);
  } catch (err) {
    printError(args, err.message);
    throw err;
  }
}
