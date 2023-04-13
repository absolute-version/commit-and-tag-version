import formatCommitMessage from '../lib/format-commit-message';

const should = require('chai').should()

describe('format-commit-message', function () {
  it('works for no {{currentTag}}', function () {
    formatCommitMessage('chore(release): 1.0.0', '1.0.0').should.equal(
      'chore(release): 1.0.0'
    )
  })
  it('works for one {{currentTag}}', function () {
    formatCommitMessage('chore(release): {{currentTag}}', '1.0.0').should.equal(
      'chore(release): 1.0.0'
    )
  })
  it('works for two {{currentTag}}', function () {
    formatCommitMessage(
      'chore(release): {{currentTag}} \n\n* CHANGELOG: https://github.com/absolute-version/commit-and-tag-version/blob/v{{currentTag}}/CHANGELOG.md',
      '1.0.0'
    ).should.equal(
      'chore(release): 1.0.0 \n\n* CHANGELOG: https://github.com/absolute-version/commit-and-tag-version/blob/v1.0.0/CHANGELOG.md'
    )
  })
});
