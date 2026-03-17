const gitSemverTags = require('git-semver-tags');
const conventionalChangelog = require('conventional-changelog');
const conventionalRecommendedBump = require('conventional-recommended-bump');
const gitRawCommits = require('git-raw-commits');

const { Readable } = require('stream');

jest.mock('conventional-changelog');
jest.mock('conventional-recommended-bump');
jest.mock('git-semver-tags');
jest.mock('git-raw-commits');

const mockGitSemverTags = ({ tags = [] }) => {
  gitSemverTags.mockImplementation((opts, cb) => {
    if (tags instanceof Error) cb(tags);
    else cb(null, tags);
  });
};

/**
 * @param { { commits: string[] } }
 * a commit should look like  `<rawBody>\n\n-hash-\n<hash>\n`
 */
const mockGitRawCommits = ({ commits = [] }) => {
  gitRawCommits.mockImplementation(() => {
    return new Readable({
      read() {
        commits.forEach((c) => this.push(c));
        this.push(null);
      },
    });
  });
};

const mockConventionalChangelog = ({ changelog }) => {
  conventionalChangelog.mockImplementation(
    (opt) =>
      new Readable({
        read(_size) {
          const next = changelog.shift();
          if (next instanceof Error) {
            this.destroy(next);
          } else if (typeof next === 'function') {
            this.push(next(opt));
          } else {
            this.push(next ? Buffer.from(next, 'utf8') : null);
          }
        },
      }),
  );
};

const mockRecommendedBump = ({ bump }) => {
  conventionalRecommendedBump.mockImplementation((opt, parserOpts, cb) => {
    if (typeof bump === 'function') bump(opt, parserOpts, cb);
    else if (bump instanceof Error) cb(bump);
    else cb(null, bump ? { releaseType: bump } : {});
  });
};

module.exports = {
  mockGitSemverTags,
  mockGitRawCommits,
  mockConventionalChangelog,
  mockRecommendedBump,
};
