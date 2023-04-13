/* global describe it afterEach */
import shell from 'shelljs'
import fs from 'fs'
import { resolve } from 'path'
import { Readable } from 'stream'
import mockFS from 'mock-fs'
import mockery from 'mockery'
import stdMocks from 'std-mocks'
import stripAnsi from 'strip-ansi'
import { cmdParser } from '../command';

const should = require('chai').should()

function exec (opt = '', git) {
  if (typeof opt === 'string') {
    opt = cmdParser.parseSync(`commit-and-tag-version ${opt}`)
  }
  if (!git) opt.skip = Object.assign({}, opt.skip, { commit: true, tag: true })
  return standardVersion(opt)
}

function getPackageVersion () {
  return JSON.parse(fs.readFileSync('package.json', 'utf-8')).version
}

/**
 * Mock external conventional-changelog modules
 *
 * Mocks should be unregistered in test cleanup by calling unmock()
 *
 * bump?: 'major' | 'minor' | 'patch' | Error | (opt, cb) => { cb(err) | cb(null, { releaseType }) }
 * changelog?: string | Error | Array<string | Error | (opt) => string | null>
 * execFile?: ({ dryRun, silent }, cmd, cmdArgs) => Promise<string>
 * fs?: { [string]: string | Buffer | any }
 * pkg?: { [string]: any }
 * tags?: string[] | Error
 */
function mock ({ bump, changelog, execFile, fs, pkg, tags } = {}) {
  mockery.enable({ warnOnUnregistered: false, useCleanCache: true })

  mockery.registerMock('conventional-recommended-bump', function (opt, cb) {
    if (typeof bump === 'function') bump(opt, cb)
    else if (bump instanceof Error) cb(bump)
    else cb(null, bump ? { releaseType: bump } : {})
  })

  if (!Array.isArray(changelog)) changelog = [changelog]
  mockery.registerMock(
    'conventional-changelog',
    (opt) =>
      new Readable({
        read (_size) {
          const next = changelog.shift()
          if (next instanceof Error) {
            this.destroy(next)
          } else if (typeof next === 'function') {
            this.push(next(opt))
          } else {
            this.push(next ? Buffer.from(next, 'utf8') : null)
          }
        }
      })
  )

  mockery.registerMock('git-semver-tags', function (cb) {
    if (tags instanceof Error) cb(tags)
    else cb(null, tags | [])
  })

  if (typeof execFile === 'function') {
    // called from commit & tag lifecycle methods
    mockery.registerMock('../run-execFile', execFile)
  }

  // needs to be set after mockery, but before mock-fs
  standardVersion = require('../index')

  fs = Object.assign({}, fs)
  if (pkg) {
    fs['package.json'] = JSON.stringify(pkg)
  } else if (pkg === undefined && !fs['package.json']) {
    fs['package.json'] = JSON.stringify({ version: '1.0.0' })
  }
  mockFS(fs)

  stdMocks.use()
  return () => stdMocks.flush()
}

function unmock () {
  mockery.deregisterAll()
  mockery.disable()
  mockFS.restore()
  stdMocks.restore()
  standardVersion = null

  // push out prints from the Mocha reporter
  const { stdout } = stdMocks.flush()
  for (const str of stdout) {
    if (str.startsWith(' ')) process.stdout.write(str)
  }
}

describe('commit-and-tag-version', function () {
  afterEach(unmock)

  it('should exit on bump error', async function () {
    mock({ bump: new Error('bump err') })
    try {
      await exec()
      /* istanbul ignore next */
      throw new Error('Unexpected success')
    } catch (err) {
      err.message.should.match(/bump err/)
    }
  })

  it('should exit on changelog error', async function () {
    mock({ bump: 'minor', changelog: new Error('changelog err') })
    try {
      await exec()
      /* istanbul ignore next */
      throw new Error('Unexpected success')
    } catch (err) {
      err.message.should.match(/changelog err/)
    }
  })

  it('should exit with error without a package file to bump', async function () {
    mock({ bump: 'patch', pkg: false })
    try {
      await exec({ gitTagFallback: false })
      /* istanbul ignore next */
      throw new Error('Unexpected success')
    } catch (err) {
      err.message.should.equal('no package file found')
    }
  })

  it('bumps version # in bower.json', async function () {
    mock({
      bump: 'minor',
      fs: { 'bower.json': JSON.stringify({ version: '1.0.0' }) },
      tags: ['v1.0.0']
    })
    await exec()
    JSON.parse(fs.readFileSync('bower.json', 'utf-8')).version.should.equal(
      '1.1.0'
    )
    getPackageVersion().should.equal('1.1.0')
  })

  it('bumps version # in manifest.json', async function () {
    mock({
      bump: 'minor',
      fs: { 'manifest.json': JSON.stringify({ version: '1.0.0' }) },
      tags: ['v1.0.0']
    })
    await exec()
    JSON.parse(fs.readFileSync('manifest.json', 'utf-8')).version.should.equal(
      '1.1.0'
    )
    getPackageVersion().should.equal('1.1.0')
  })

  describe('custom `bumpFiles` support', function () {
    it('mix.exs + version.txt', async function () {
      const updater = 'custom-updater.js'
      const updaterModule = require('./mocks/updater/customer-updater')
      mock({
        bump: 'minor',
        fs: {
          'mix.exs': fs.readFileSync('./test/mocks/mix.exs'),
          'version.txt': fs.readFileSync('./test/mocks/version.txt')
        },
        tags: ['v1.0.0']
      })
      mockery.registerMock(resolve(process.cwd(), updater), updaterModule)

      await exec({
        bumpFiles: [
          'version.txt',
          { filename: 'mix.exs', updater: 'custom-updater.js' }
        ]
      })
      fs.readFileSync('mix.exs', 'utf-8').should.contain('version: "1.1.0"')
      fs.readFileSync('version.txt', 'utf-8').should.equal('1.1.0')
    })

    it('bumps a custom `plain-text` file', async function () {
      mock({
        bump: 'minor',
        fs: {
          'VERSION_TRACKER.txt': fs.readFileSync(
            './test/mocks/VERSION-1.0.0.txt'
          )
        }
      })
      await exec({
        bumpFiles: [{ filename: 'VERSION_TRACKER.txt', type: 'plain-text' }]
      })
      fs.readFileSync('VERSION_TRACKER.txt', 'utf-8').should.equal('1.1.0')
    })

    it('displays the new version from custom bumper with --dry-run', async function () {
      const updater = 'increment-updater.js'
      const updaterModule = require('./mocks/updater/increment-updater')
      mock({
        bump: 'minor',
        fs: {
          'increment-version.txt': fs.readFileSync(
            './test/mocks/increment-version.txt'
          )
        }
      })
      mockery.registerMock(resolve(process.cwd(), updater), updaterModule)

      const origInfo = console.info
      const capturedOutput = []
      console.info = (...args) => {
        capturedOutput.push(...args)
        origInfo(...args)
      }
      try {
        await exec({
          bumpFiles: [{ filename: 'increment-version.txt', updater: 'increment-updater.js' }],
          dryRun: true
        })
        const logOutput = capturedOutput.join(' ')
        stripAnsi(logOutput).should.include('bumping version in increment-version.txt from 1 to 2')
      } finally {
        console.info = origInfo
      }
    })
  })

  describe('custom `packageFiles` support', function () {
    it('reads and writes to a custom `plain-text` file', async function () {
      mock({
        bump: 'minor',
        fs: {
          'VERSION_TRACKER.txt': fs.readFileSync(
            './test/mocks/VERSION-6.3.1.txt'
          )
        }
      })
      await exec({
        packageFiles: [{ filename: 'VERSION_TRACKER.txt', type: 'plain-text' }],
        bumpFiles: [{ filename: 'VERSION_TRACKER.txt', type: 'plain-text' }]
      })
      fs.readFileSync('VERSION_TRACKER.txt', 'utf-8').should.equal('6.4.0')
    })

    it('allows same object to be used in packageFiles and bumpFiles', async function () {
      mock({
        bump: 'minor',
        fs: {
          'VERSION_TRACKER.txt': fs.readFileSync(
            './test/mocks/VERSION-6.3.1.txt'
          )
        }
      })
      const origWarn = console.warn
      console.warn = () => {
        throw new Error('console.warn should not be called')
      }
      const filedesc = { filename: 'VERSION_TRACKER.txt', type: 'plain-text' }
      try {
        await exec({ packageFiles: [filedesc], bumpFiles: [filedesc] })
        fs.readFileSync('VERSION_TRACKER.txt', 'utf-8').should.equal('6.4.0')
      } finally {
        console.warn = origWarn
      }
    })
  })

  it('`packageFiles` are bumped along with `bumpFiles` defaults [commit-and-tag-version#533]', async function () {
    mock({
      bump: 'minor',
      fs: {
        '.gitignore': '',
        'package-lock.json': JSON.stringify({ version: '1.0.0' }),
        'manifest.json': fs.readFileSync('./test/mocks/manifest-6.3.1.json')
      },
      tags: ['v1.0.0']
    })

    await exec({
      silent: true,
      packageFiles: [
        {
          filename: 'manifest.json',
          type: 'json'
        }
      ]
    })

    JSON.parse(fs.readFileSync('manifest.json', 'utf-8')).version.should.equal(
      '6.4.0'
    )
    JSON.parse(fs.readFileSync('package.json', 'utf-8')).version.should.equal(
      '6.4.0'
    )
    JSON.parse(
      fs.readFileSync('package-lock.json', 'utf-8')
    ).version.should.equal('6.4.0')
  })

  it('bumps version in Gradle `build.gradle.kts` file', async function () {
    const expected = fs.readFileSync('./test/mocks/build-6.4.0.gradle.kts', 'utf-8')
    mock({
      bump: 'minor',
      fs: {
        'build.gradle.kts': fs.readFileSync('./test/mocks/build-6.3.1.gradle.kts')
      }
    })
    await exec({
      packageFiles: [{ filename: 'build.gradle.kts', type: 'gradle' }],
      bumpFiles: [{ filename: 'build.gradle.kts', type: 'gradle' }]
    })
    fs.readFileSync('build.gradle.kts', 'utf-8').should.equal(expected)
  })

  it('bumps version # in npm-shrinkwrap.json', async function () {
    mock({
      bump: 'minor',
      fs: {
        'npm-shrinkwrap.json': JSON.stringify({ version: '1.0.0' })
      },
      tags: ['v1.0.0']
    })
    await exec()
    JSON.parse(
      fs.readFileSync('npm-shrinkwrap.json', 'utf-8')
    ).version.should.equal('1.1.0')
    getPackageVersion().should.equal('1.1.0')
  })

  it('bumps version # in package-lock.json', async function () {
    mock({
      bump: 'minor',
      fs: {
        '.gitignore': '',
        'package-lock.json': JSON.stringify({ version: '1.0.0' })
      },
      tags: ['v1.0.0']
    })
    await exec()
    JSON.parse(
      fs.readFileSync('package-lock.json', 'utf-8')
    ).version.should.equal('1.1.0')
    getPackageVersion().should.equal('1.1.0')
  })

  describe('skip', () => {
    it('allows bump and changelog generation to be skipped', async function () {
      const changelogContent = 'legacy header format<a name="1.0.0">\n'
      mock({
        bump: 'minor',
        changelog: 'foo\n',
        fs: { 'CHANGELOG.md': changelogContent }
      })

      await exec('--skip.bump true --skip.changelog true')
      getPackageVersion().should.equal('1.0.0')
      const content = fs.readFileSync('CHANGELOG.md', 'utf-8')
      content.should.equal(changelogContent)
    })
  })

  it('does not update files present in .gitignore', async () => {
    mock({
      bump: 'minor',
      fs: {
        '.gitignore': 'package-lock.json\nbower.json',
        // test a defaults.packageFiles
        'bower.json': JSON.stringify({ version: '1.0.0' }),
        // test a defaults.bumpFiles
        'package-lock.json': JSON.stringify({
          name: '@org/package',
          version: '1.0.0',
          lockfileVersion: 1
        })
      },
      tags: ['v1.0.0']
    })
    await exec()
    JSON.parse(
      fs.readFileSync('package-lock.json', 'utf-8')
    ).version.should.equal('1.0.0')
    JSON.parse(fs.readFileSync('bower.json', 'utf-8')).version.should.equal(
      '1.0.0'
    )
    getPackageVersion().should.equal('1.1.0')
  })

  describe('configuration', () => {
    it('--header', async function () {
      mock({ bump: 'minor', fs: { 'CHANGELOG.md': '' } })
      await exec('--header="# Welcome to our CHANGELOG.md"')
      const content = fs.readFileSync('CHANGELOG.md', 'utf-8')
      content.should.match(/# Welcome to our CHANGELOG.md/)
    })

    it('--issuePrefixes and --issueUrlFormat', async function () {
      const format = 'http://www.foo.com/{{prefix}}{{id}}'
      const prefix = 'ABC-'
      const changelog = ({ preset }) =>
        preset.issueUrlFormat + ':' + preset.issuePrefixes
      mock({ bump: 'minor', changelog })
      await exec(`--issuePrefixes="${prefix}" --issueUrlFormat="${format}"`)
      const content = fs.readFileSync('CHANGELOG.md', 'utf-8')
      content.should.include(`${format}:${prefix}`)
    })
  })

  describe('pre-major', () => {
    it('bumps the minor rather than major, if version < 1.0.0', async function () {
      mock({
        bump: 'minor',
        pkg: {
          version: '0.5.0',
          repository: { url: 'https://github.com/yargs/yargs.git' }
        }
      })
      await exec()
      getPackageVersion().should.equal('0.6.0')
    })

    it('bumps major if --release-as=major specified, if version < 1.0.0', async function () {
      mock({
        bump: 'major',
        pkg: {
          version: '0.5.0',
          repository: { url: 'https://github.com/yargs/yargs.git' }
        }
      })
      await exec('-r major')
      getPackageVersion().should.equal('1.0.0')
    })
  })
})

describe('GHSL-2020-111', function () {
  afterEach(unmock)

  it('does not allow command injection via basic configuration', async function () {
    mock({ bump: 'patch' })
    await exec({
      noVerify: true,
      infile: 'foo.txt',
      releaseCommitMessageFormat: 'bla `touch exploit`'
    })
    const stat = shell.test('-f', './exploit')
    stat.should.equal(false)
  })
})

describe('with mocked git', function () {
  afterEach(unmock)

  it('--sign signs the commit and tag', async function () {
    const gitArgs = [
      ['add', 'CHANGELOG.md', 'package.json'],
      [
        'commit',
        '-S',
        'CHANGELOG.md',
        'package.json',
        '-m',
        'chore(release): 1.0.1'
      ],
      ['tag', '-s', 'v1.0.1', '-m', 'chore(release): 1.0.1'],
      ['rev-parse', '--abbrev-ref', 'HEAD']
    ]
    const execFile = (_args, cmd, cmdArgs) => {
      cmd.should.equal('git')
      const expected = gitArgs.shift()
      cmdArgs.should.deep.equal(expected)
      if (expected[0] === 'rev-parse') return Promise.resolve('master')
      return Promise.resolve('')
    }
    mock({ bump: 'patch', changelog: 'foo\n', execFile })

    await exec('--sign', true)
    gitArgs.should.have.lengthOf(0)
  })

  it('--tag-force forces tag replacement', async function () {
    const gitArgs = [
      ['add', 'CHANGELOG.md', 'package.json'],
      ['commit', 'CHANGELOG.md', 'package.json', '-m', 'chore(release): 1.0.1'],
      ['tag', '-a', '-f', 'v1.0.1', '-m', 'chore(release): 1.0.1'],
      ['rev-parse', '--abbrev-ref', 'HEAD']
    ]
    const execFile = (_args, cmd, cmdArgs) => {
      cmd.should.equal('git')
      const expected = gitArgs.shift()
      cmdArgs.should.deep.equal(expected)
      if (expected[0] === 'rev-parse') return Promise.resolve('master')
      return Promise.resolve('')
    }
    mock({ bump: 'patch', changelog: 'foo\n', execFile })

    await exec('--tag-force', true)
    gitArgs.should.have.lengthOf(0)
  })

  it('fails if git add fails', async function () {
    const gitArgs = [['add', 'CHANGELOG.md', 'package.json']]
    const execFile = (_args, cmd, cmdArgs) => {
      cmd.should.equal('git')
      const expected = gitArgs.shift()
      cmdArgs.should.deep.equal(expected)
      if (expected[0] === 'add') {
        return Promise.reject(new Error('Command failed: git\nfailed add'))
      }
      return Promise.resolve('')
    }
    mock({ bump: 'patch', changelog: 'foo\n', execFile })

    try {
      await exec({}, true)
      /* istanbul ignore next */
      throw new Error('Unexpected success')
    } catch (error) {
      error.message.should.match(/failed add/)
    }
  })

  it('fails if git commit fails', async function () {
    const gitArgs = [
      ['add', 'CHANGELOG.md', 'package.json'],
      ['commit', 'CHANGELOG.md', 'package.json', '-m', 'chore(release): 1.0.1']
    ]
    const execFile = (_args, cmd, cmdArgs) => {
      cmd.should.equal('git')
      const expected = gitArgs.shift()
      cmdArgs.should.deep.equal(expected)
      if (expected[0] === 'commit') {
        return Promise.reject(new Error('Command failed: git\nfailed commit'))
      }
      return Promise.resolve('')
    }
    mock({ bump: 'patch', changelog: 'foo\n', execFile })

    try {
      await exec({}, true)
      /* istanbul ignore next */
      throw new Error('Unexpected success')
    } catch (error) {
      error.message.should.match(/failed commit/)
    }
  })

  it('fails if git tag fails', async function () {
    const gitArgs = [
      ['add', 'CHANGELOG.md', 'package.json'],
      ['commit', 'CHANGELOG.md', 'package.json', '-m', 'chore(release): 1.0.1'],
      ['tag', '-a', 'v1.0.1', '-m', 'chore(release): 1.0.1']
    ]
    const execFile = (_args, cmd, cmdArgs) => {
      cmd.should.equal('git')
      const expected = gitArgs.shift()
      cmdArgs.should.deep.equal(expected)
      if (expected[0] === 'tag') {
        return Promise.reject(new Error('Command failed: git\nfailed tag'))
      }
      return Promise.resolve('')
    }
    mock({ bump: 'patch', changelog: 'foo\n', execFile })

    try {
      await exec({}, true)
      /* istanbul ignore next */
      throw new Error('Unexpected success')
    } catch (error) {
      error.message.should.match(/failed tag/)
    }
  })
})
