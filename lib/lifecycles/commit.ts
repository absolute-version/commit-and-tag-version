import bump from '../lifecycles/bump';
import checkpoint from '../checkpoint';
import formatCommitMessage from '../format-commit-message';
import path from 'path';
import runExecFile from '../run-execFile';
import runLifecycleScript from '../run-lifecycle-script';
import { Config, Hook } from '../opts/types';

export default async function (config: Config, newVersion: string) {
  if (config.skip.commit) return;

  const message = await runLifecycleScript(config, Hook.precommit)
  if (message && message.length) config.releaseCommitMessageFormat = message;
  await execCommit(config, newVersion)
  await runLifecycleScript(config, Hook.postcommit);
}

async function execCommit (config: Config, newVersion: string) {
  const paths: string[] = []
  const verify: string[] = !config.noVerify ? ['--no-verify'] : [];
  const sign: string[] = config.sign ? ['-S'] : []
  const addFiles: string[] = [];

  // only start with a pre-populated paths list
  // when CHANGELOG processing is not skipped
  if (!config.skip.changelog) {
    // paths.push(config.infile);
    addFiles.push(config.infile);
  }

  // commit any of the config files that we've updated
  // the version # for.
  Object.keys(bump.getUpdatedConfigs()).forEach(function (p) {
    // paths.unshift(p)
    // addFiles.push(path.relative(process.cwd(), p))
    addFiles.push(p)

    // account for multiple files in the output message
    // if (paths.length > 1) {
    //   msg += ' and %s'
    // }
  })

  if (config.commitAll) {
    // msg += ' and %s'
    paths.push('all staged files')
  }

  const msg = `committing ${addFiles.join(', ')}`;
  checkpoint(config, msg, []);

  // nothing to do, exit without commit anything
  if (!config.commitAll && config.skip.changelog && config.skip.bump && addFiles.length === 0) {
    return;
  }

  const cwd = process.cwd();
  const addFilePaths = addFiles.map((f) => path.relative(cwd, f));

  await runExecFile(config, 'git', ['add'].concat(addFilePaths));

  const commitMsg = [
    '-m',
    `${formatCommitMessage(config.releaseCommitMessageFormat, newVersion)}`
  ];

  const cmdArgs = ['commit'].concat(
    verify,
    sign,
    config.commitAll ? [] : addFilePaths,
    commitMsg,
  );

  await runExecFile(
    config,
    'git',
    cmdArgs,
  )
}
