const gitSemverTags = require('git-semver-tags');
const conventionalChangelog = require('conventional-changelog');
const conventionalRecommendedBump = require('conventional-recommended-bump');

const { Readable } = require('stream');

jest.mock('conventional-changelog');
jest.mock('conventional-recommended-bump');
jest.mock('git-semver-tags');

const mockGitSemverTags = ({ tags = [] }) => {
  gitSemverTags.mockImplementation((opts, cb) => {
    if (tags instanceof Error) cb(tags);
    else cb(null, tags);
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
  mockConventionalChangelog,
  mockRecommendedBump,
};
