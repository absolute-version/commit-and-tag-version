/* global describe it afterEach */
import fs from 'fs'
import { afterEachTestIdDir, beforeEachTestIdDir, exec, git, removeTmpDir, useTmpDir, writePackageJson } from './test-utils'

const should = require('chai').should();

describe('cli', function () {
  before(() => {
    useTmpDir();
  });

  after(() => {
    removeTmpDir();
  });

  beforeEach(function () {
    beforeEachTestIdDir(this.currentTest!.id);
  });
  afterEach(function (done) {
    afterEachTestIdDir(this.currentTest!.id);
    done();
  });

  describe('CHANGELOG.md does not exist', function () {
    it('populates changelog with commits since last tag by default', async function () {
      git.init();
      git.commitMsg('fix: A superb fix');
      await exec();
      const content = fs.readFileSync('CHANGELOG.md', 'utf-8')
      content.should.match(/A superb fix/)
    })

    it('includes all commits if --first-release is true', async function () {
      git.init();
      git.commitType('initial');
      git.commitType('fix')
      git.commitType('feat')

      await exec({ cliArgs: '--first-release' });
      const content = fs.readFileSync('CHANGELOG.md', 'utf-8')
      content.should.match(/A superb bug fix/);
      content.should.match(/A feature commit/);
    })

    it('skipping changelog will not create a changelog file', async function () {
      writePackageJson('1.1.0');
      git.init();
      git.commitType('feat');
      git.tag('1.1.0');
      git.commitMsg('fix: A superb fix');
      await exec({ cliArgs: '--skip changelog' });
      try {
        fs.readFileSync('CHANGELOG.md', 'utf-8')
        throw new Error('File should not exist')
      } catch (err: any) {
        err.code.should.equal('ENOENT')
      }
    })
  })

  // describe('CHANGELOG.md exists', function () {
  //   it('appends the new release above the last release, removing the old header (legacy format)', async function () {
  //     mock({
  //       bump: 'patch',
  //       changelog: 'release 1.0.1\n',
  //       fs: { 'CHANGELOG.md': 'legacy header format<a name="1.0.0">\n' },
  //       tags: ['v1.0.0']
  //     })
  //     await exec()
  //     const content = fs.readFileSync('CHANGELOG.md', 'utf-8')
  //     content.should.match(/1\.0\.1/)
  //     content.should.not.match(/legacy header format/)
  //   })

  //   it('appends the new release above the last release, removing the old header (new format)', async function () {
  //     const { header } = require('../defaults')
  //     const changelog1 =
  //       '### [1.0.1](/compare/v1.0.0...v1.0.1) (YYYY-MM-DD)\n\n\n### Bug Fixes\n\n* patch release ABCDEFXY\n'
  //     mock({ bump: 'patch', changelog: changelog1, tags: ['v1.0.0'] })
  //     await exec()
  //     let content = fs.readFileSync('CHANGELOG.md', 'utf-8')
  //     content.should.equal(header + '\n' + changelog1)

  //     const changelog2 =
  //       '### [1.0.2](/compare/v1.0.1...v1.0.2) (YYYY-MM-DD)\n\n\n### Bug Fixes\n\n* another patch release ABCDEFXY\n'
  //     unmock()
  //     mock({
  //       bump: 'patch',
  //       changelog: changelog2,
  //       fs: { 'CHANGELOG.md': content },
  //       tags: ['v1.0.0', 'v1.0.1']
  //     })
  //     await exec()
  //     content = fs.readFileSync('CHANGELOG.md', 'utf-8')
  //     content.should.equal(header + '\n' + changelog2 + changelog1)
  //   })

  //   it('[DEPRECATED] (--changelogHeader) allows for a custom changelog header', async function () {
  //     const header = '# Pork Chop Log'
  //     mock({
  //       bump: 'minor',
  //       changelog: header + '\n',
  //       fs: { 'CHANGELOG.md': '' }
  //     })
  //     await exec(`--changelogHeader="${header}"`)
  //     const content = fs.readFileSync('CHANGELOG.md', 'utf-8')
  //     content.should.match(new RegExp(header))
  //   })

  //   it('[DEPRECATED] (--changelogHeader) exits with error if changelog header matches last version search regex', async function () {
  //     mock({ bump: 'minor', fs: { 'CHANGELOG.md': '' } })
  //     try {
  //       await exec('--changelogHeader="## 3.0.2"')
  //       throw new Error('That should not have worked')
  //     } catch (error) {
  //       error.message.should.match(/custom changelog header must not match/)
  //     }
  //   })
  // })

  // describe('lifecycle scripts', () => {
  //   describe('prerelease hook', function () {
  //     it('should run the prerelease hook when provided', async function () {
  //       const flush = mock({
  //         bump: 'minor',
  //         fs: { 'CHANGELOG.md': 'legacy header format<a name="1.0.0">\n' }
  //       })

  //       await exec({
  //         scripts: {
  //           prerelease: "node -e \"console.error('prerelease' + ' ran')\""
  //         }
  //       })
  //       const { stderr } = flush()
  //       stderr.join('\n').should.match(/prerelease ran/)
  //     })

  //     it('should abort if the hook returns a non-zero exit code', async function () {
  //       mock({
  //         bump: 'minor',
  //         fs: { 'CHANGELOG.md': 'legacy header format<a name="1.0.0">\n' }
  //       })

  //       try {
  //         await exec({
  //           scripts: {
  //             prerelease: "node -e \"throw new Error('prerelease' + ' fail')\""
  //           }
  //         })
  //         /* istanbul ignore next */
  //         throw new Error('Unexpected success')
  //       } catch (error) {
  //         error.message.should.match(/prerelease fail/)
  //       }
  //     })
  //   })

  //   describe('prebump hook', function () {
  //     it('should allow prebump hook to return an alternate version #', async function () {
  //       const flush = mock({
  //         bump: 'minor',
  //         fs: { 'CHANGELOG.md': 'legacy header format<a name="1.0.0">\n' }
  //       })

  //       await exec({
  //         scripts: {
  //           prebump: "node -e \"console.log(Array.of(9, 9, 9).join('.'))\""
  //         }
  //       })
  //       const { stdout } = flush()
  //       stdout.join('').should.match(/9\.9\.9/)
  //     })
  //   })

  //   describe('postbump hook', function () {
  //     it('should run the postbump hook when provided', async function () {
  //       const flush = mock({
  //         bump: 'minor',
  //         fs: { 'CHANGELOG.md': 'legacy header format<a name="1.0.0">\n' }
  //       })

  //       await exec({
  //         scripts: {
  //           postbump: "node -e \"console.error('postbump' + ' ran')\""
  //         }
  //       })
  //       const { stderr } = flush()
  //       stderr.join('\n').should.match(/postbump ran/)
  //     })

  //     it('should run the postbump and exit with error when postbump fails', async function () {
  //       mock({
  //         bump: 'minor',
  //         fs: { 'CHANGELOG.md': 'legacy header format<a name="1.0.0">\n' }
  //       })

  //       try {
  //         await exec({
  //           scripts: {
  //             postbump: "node -e \"throw new Error('postbump' + ' fail')\""
  //           }
  //         })
  //         await exec('--patch')
  //         /* istanbul ignore next */
  //         throw new Error('Unexpected success')
  //       } catch (error) {
  //         error.message.should.match(/postbump fail/)
  //       }
  //     })
  //   })
  // })

  // describe('manual-release', function () {
  //   describe('release-types', function () {
  //     const regularTypes = ['major', 'minor', 'patch']
  //     const nextVersion = { major: '2.0.0', minor: '1.1.0', patch: '1.0.1' }

  //     regularTypes.forEach(function (type) {
  //       it('creates a ' + type + ' release', async function () {
  //         mock({
  //           bump: 'patch',
  //           fs: { 'CHANGELOG.md': 'legacy header format<a name="1.0.0">\n' }
  //         })
  //         await exec('--release-as ' + type)
  //         getPackageVersion().should.equal(nextVersion[type])
  //       })
  //     })

  //     // this is for pre-releases
  //     regularTypes.forEach(function (type) {
  //       it('creates a pre' + type + ' release', async function () {
  //         mock({
  //           bump: 'patch',
  //           fs: { 'CHANGELOG.md': 'legacy header format<a name="1.0.0">\n' }
  //         })
  //         await exec('--release-as ' + type + ' --prerelease ' + type)
  //         getPackageVersion().should.equal(`${nextVersion[type]}-${type}.0`)
  //       })
  //     })
  //   })

  //   describe('release-as-exact', function () {
  //     it('releases as v100.0.0', async function () {
  //       mock({
  //         bump: 'patch',
  //         fs: { 'CHANGELOG.md': 'legacy header format<a name="1.0.0">\n' }
  //       })
  //       await exec('--release-as v100.0.0')
  //       getPackageVersion().should.equal('100.0.0')
  //     })

  //     it('releases as 200.0.0-amazing', async function () {
  //       mock({
  //         bump: 'patch',
  //         fs: { 'CHANGELOG.md': 'legacy header format<a name="1.0.0">\n' }
  //       })
  //       await exec('--release-as 200.0.0-amazing')
  //       getPackageVersion().should.equal('200.0.0-amazing')
  //     })

  //     it('releases as 100.0.0 with prerelease amazing', async function () {
  //       mock({
  //         bump: 'patch',
  //         fs: { 'CHANGELOG.md': 'legacy header format<a name="1.0.0">\n' },
  //         pkg: {
  //           version: '1.0.0'
  //         }
  //       })
  //       await exec('--release-as 100.0.0 --prerelease amazing')
  //       should.equal(getPackageVersion(), '100.0.0-amazing.0')
  //     })

  //     it('release 100.0.0 with prerelease amazing bumps build', async function () {
  //       mock({
  //         bump: 'patch',
  //         fs: { 'CHANGELOG.md': 'legacy header format<a name="100.0.0-amazing.0">\n' },
  //         pkg: {
  //           version: '100.0.0-amazing.0'
  //         }
  //       })
  //       await exec('--release-as 100.0.0 --prerelease amazing')
  //       should.equal(getPackageVersion(), '100.0.0-amazing.1')
  //     })

  //     it('release 100.0.0-amazing.0 with prerelease amazing bumps build', async function () {
  //       mock({
  //         bump: 'patch',
  //         fs: { 'CHANGELOG.md': 'legacy header format<a name="100.0.0-amazing.0">\n' },
  //         pkg: {
  //           version: '100.0.0-amazing.0'
  //         }
  //       })
  //       await exec('--release-as 100.0.0-amazing.0 --prerelease amazing')
  //       should.equal(getPackageVersion(), '100.0.0-amazing.1')
  //     })
  //   })

  //   it('creates a prerelease with a new minor version after two prerelease patches', async function () {
  //     let releaseType = 'patch'
  //     const bump = (_, cb) => cb(null, { releaseType })
  //     mock({
  //       bump,
  //       fs: { 'CHANGELOG.md': 'legacy header format<a name="1.0.0">\n' }
  //     })

  //     await exec('--release-as patch --prerelease dev')
  //     getPackageVersion().should.equal('1.0.1-dev.0')

  //     await exec('--prerelease dev')
  //     getPackageVersion().should.equal('1.0.1-dev.1')

  //     releaseType = 'minor'
  //     await exec('--release-as minor --prerelease dev')
  //     getPackageVersion().should.equal('1.1.0-dev.0')

  //     await exec('--release-as minor --prerelease dev')
  //     getPackageVersion().should.equal('1.1.0-dev.1')

  //     await exec('--prerelease dev')
  //     getPackageVersion().should.equal('1.1.0-dev.2')
  //   })
  // })

  // it('appends line feed at end of package.json', async function () {
  //   mock({ bump: 'patch' })
  //   await exec()
  //   const pkgJson = fs.readFileSync('package.json', 'utf-8')
  //   pkgJson.should.equal('{\n  "version": "1.0.1"\n}\n')
  // })

  // it('preserves indentation of tabs in package.json', async function () {
  //   mock({
  //     bump: 'patch',
  //     fs: { 'package.json': '{\n\t"version": "1.0.0"\n}\n' }
  //   })
  //   await exec()
  //   const pkgJson = fs.readFileSync('package.json', 'utf-8')
  //   pkgJson.should.equal('{\n\t"version": "1.0.1"\n}\n')
  // })

  // it('preserves indentation of spaces in package.json', async function () {
  //   mock({
  //     bump: 'patch',
  //     fs: { 'package.json': '{\n    "version": "1.0.0"\n}\n' }
  //   })
  //   await exec()
  //   const pkgJson = fs.readFileSync('package.json', 'utf-8')
  //   pkgJson.should.equal('{\n    "version": "1.0.1"\n}\n')
  // })

  // it('preserves carriage return + line feed in package.json', async function () {
  //   mock({
  //     bump: 'patch',
  //     fs: { 'package.json': '{\r\n  "version": "1.0.0"\r\n}\r\n' }
  //   })
  //   await exec()
  //   const pkgJson = fs.readFileSync('package.json', 'utf-8')
  //   pkgJson.should.equal('{\r\n  "version": "1.0.1"\r\n}\r\n')
  // })

  // it('does not print output when the --silent flag is passed', async function () {
  //   const flush = mock()
  //   await exec('--silent')
  //   flush().should.eql({ stdout: [], stderr: [] })
  // })
})
