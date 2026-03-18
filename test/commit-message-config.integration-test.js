import shell from 'shelljs';
import fs from 'fs';

const mockers = vi.hoisted(() => require('./mocks/vitest-mocks').setup());
vi.mock('conventional-changelog', () => ({
  default: mockers.conventionalChangelog,
}));
vi.mock('conventional-recommended-bump', () => ({
  default: mockers.conventionalRecommendedBump,
}));
vi.mock('git-semver-tags', () => ({ default: mockers.gitSemverTags }));
vi.mock('git-raw-commits', () => ({ default: mockers.gitRawCommits }));

vi.spyOn(console, 'info').mockImplementation(() => {});
vi.spyOn(console, 'warn').mockImplementation(() => {});

async function exec(opt = '') {
  vi.resetModules();
  const { default: cli } = await import('../command');
  if (typeof opt === 'string') {
    opt = cli.parse(`commit-and-tag-version ${opt}`);
  }
  const { default: standardVersion } = await import('../index');
  return standardVersion(opt);
}

/**
 * Mock external conventional-changelog modules
 *
 * bump: 'major' | 'minor' | 'patch' | Error | (opt, parserOpts, cb) => { cb(err) | cb(null, { releaseType }) }
 * changelog?: string | Error | Array<string | Error | (opt) => string | null>
 * tags?: string[] | Error
 */
function mock({ bump, changelog, tags }) {
  if (bump === undefined) throw new Error('bump must be defined for mock()');

  mockers.mockRecommendedBump({ bump });

  if (!Array.isArray(changelog)) changelog = [changelog];
  mockers.mockConventionalChangelog({ changelog });

  mockers.mockGitSemverTags({ tags });
}

function writePackageJson(version, option) {
  const pkg = Object.assign({}, option, { version });
  fs.writeFileSync('package.json', JSON.stringify(pkg), 'utf-8');
}

function setupTempGitRepo() {
  shell.rm('-rf', 'commit-message-config-temp');
  shell.config.silent = true;
  shell.mkdir('commit-message-config-temp');
  shell.cd('commit-message-config-temp');
  shell.exec('git init');
  shell.exec('git config commit.gpgSign false');
  shell.exec('git config core.autocrlf false');
  shell.exec('git commit --allow-empty -m"root-commit"');
}

function setup() {
  setupTempGitRepo();
  writePackageJson('1.0.0');
}

function reset() {
  shell.cd('../');
  shell.rm('-rf', 'commit-message-config-temp');
}

describe('configuration', function () {
  beforeEach(function () {
    setup();
  });

  afterEach(function () {
    reset();
  });

  it('.versionrc : releaseCommitMessageFormat', async function () {
    fs.writeFileSync(
      '.versionrc',
      JSON.stringify({
        releaseCommitMessageFormat:
          'This commit represents release: {{currentTag}}',
      }),
      'utf-8',
    );
    mock({ bump: 'minor' });
    await exec('');
    expect(shell.exec('git log --oneline -n1').stdout).toMatch(
      'This commit represents release: 1.1.0',
    );
  });

  it('--releaseCommitMessageFormat', async function () {
    mock({ bump: 'minor' });
    await exec('--releaseCommitMessageFormat="{{currentTag}} is the version."');
    expect(shell.exec('git log --oneline -n1').stdout).toContain(
      '1.1.0 is the version.',
    );
  });

  it('[LEGACY] supports --message (and single %s replacement)', async function () {
    mock({ bump: 'minor' });
    await exec('--message="V:%s"');
    expect(shell.exec('git log --oneline -n1').stdout).toContain('V:1.1.0');
  });

  it('[LEGACY] supports -m (and multiple %s replacements)', async function () {
    mock({ bump: 'minor' });
    await exec('--message="V:%s is the %s."');
    expect(shell.exec('git log --oneline -n1').stdout).toContain(
      'V:1.1.0 is the 1.1.0.',
    );
  });
});
