import shell from 'shelljs';
import fs from 'fs';

const repoUrl = 'https://github.com/example/changelog-context';

async function exec(opt) {
  vi.resetModules();
  const { default: cli } = await import('../command');
  opt = cli.parse(`commit-and-tag-version ${opt} --silent`);
  opt.skip = { commit: true, tag: true };
  const { default: standardVersion } = await import('../index');
  return standardVersion(opt);
}

function setupTempGitRepo(versionrc) {
  shell.rm('-rf', 'changelog-context-temp');
  shell.config.silent = true;
  shell.mkdir('changelog-context-temp');
  shell.cd('changelog-context-temp');
  shell.exec('git init');
  shell.exec('git config commit.gpgSign false');
  shell.exec('git config core.autocrlf false');
  fs.writeFileSync(
    'package.json',
    JSON.stringify({
      name: 'changelog-context',
      version: '1.0.0',
      repository: { type: 'git', url: `${repoUrl}.git` },
    }),
    'utf-8',
  );
  if (versionrc) {
    fs.writeFileSync('.versionrc', JSON.stringify(versionrc), 'utf-8');
  }
  shell.exec('git add -A');
  shell.exec('git commit -m "chore: initial commit"');
  shell.exec('git tag v1.0.0');
  shell.exec('git commit --allow-empty -m "feat: A feature commit."');
}

function resetShell() {
  shell.cd('../');
  shell.rm('-rf', 'changelog-context-temp');
}

describe('changelog context', function () {
  afterEach(function () {
    resetShell();
  });

  it('links the compare range and commit hashes by default', async function () {
    setupTempGitRepo();

    await exec();

    const content = fs.readFileSync('CHANGELOG.md', 'utf-8');
    expect(content).toContain(`${repoUrl}/compare/v1.0.0...v1.1.0`);
    expect(content).toMatch(new RegExp(`${repoUrl}/commit/[0-9a-f]{40}`));
  });

  it('applies the configured context to the changelog', async function () {
    setupTempGitRepo({
      context: { linkCompare: false, linkReferences: false },
    });

    await exec();

    const content = fs.readFileSync('CHANGELOG.md', 'utf-8');
    expect(content).toContain('## 1.1.0');
    expect(content).toContain('### Features');
    expect(content).toContain('A feature commit.');
    expect(content).not.toContain(`${repoUrl}/compare/`);
    expect(content).not.toContain(`${repoUrl}/commit/`);
  });
});
