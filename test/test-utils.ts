import shell from 'shelljs'
import fs from 'fs'
import { cmdParser } from '../command'
import { FileConfig, Task } from '../lib/opts/types'
import cli from '../index';

export function writePackageJson(version: string, option?: any) {
  const pkg = Object.assign({}, option || {}, { version })
  fs.writeFileSync('package.json', JSON.stringify(pkg), 'utf-8')
}

export function getPackageVersion () {
  return JSON.parse(fs.readFileSync('package.json', 'utf-8')).version
}

export function useTmpDir() {
  shell.rm('-rf', 'tmp')
  shell.config.silent = true
  shell.mkdir('tmp')
  shell.cd('tmp')
}

export function removeTmpDir() {
  shell.cd('../')
  shell.rm('-rf', 'tmp')
}

export function beforeEachTestIdDir(testId: string) {
  shell.mkdir(testId);
  shell.cd(testId);
}

export function afterEachTestIdDir(testId: string) {
  shell.cd('../');
  shell.rm('-rf', testId);
}

export function ensureArray<T>(target: T | T[]): T[] {
  return Array.isArray(target) ? target : [target];
}

type ArgV = ReturnType<typeof cmdParser.parseSync>;

export function getArgv({ cliArgs, overrides }: ExecParams = {}): ArgV {
  const options = ensureArray(cliArgs || []).join(' ');
  const argv = cmdParser.parseSync(`commit-and-tag-version ${options} --silent`)
  return {
    ...argv,
    ...(overrides || {}),
  };
}

interface ExecParams {
  cliArgs?: string | string[] | undefined;
  overrides?: Partial<ArgV> | undefined;
}

export function exec({ cliArgs, overrides }: ExecParams = {}) {
  const argv = getArgv({ cliArgs, overrides });
  return cli(argv);
}

type CommitType =
  | 'initial'
  | 'feat'
  | 'perf'
  | 'chore'
  | 'ci'
  | 'custom'
  | 'fix';

const messages: Record<CommitType, string> = {
  initial: 'initial commit',
  feat: 'feat: A feature commit',
  perf: 'perf: A performance commit',
  chore: 'chore: A chore commit',
  ci: 'ci: A ci commit',
  custom: 'custom: A custom commit',
  fix: 'fix: A superb bug fix',
}

export const git = {
  init(...types: CommitType[]) {
    shell.exec('git init')
    shell.exec('git config commit.gpgSign false')
    shell.exec('git config core.autocrlf false')
    git.commitType(...types);
  },
  commitType(...types: CommitType[]) {
    types.forEach((t) => {
      git.commitMsg(messages[t]);
    });
  },
  commitMsg(msg: string) {
    shell.exec(`git commit --allow-empty -m "${msg}"`);
  },
  tag(version: string) {
    shell.exec(`git tag v${version}`);
  },
};
