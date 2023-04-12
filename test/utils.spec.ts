/* global describe it */

const mockery = require('mockery')
const { promises: fsp } = require('fs')
require('chai').should()

function mockNpm () {
  mockery.enable({ warnOnUnregistered: false, useCleanCache: true })
  let lockFile = ''

  const fsMock = {
    promises: {
      access: async function (path) {
        if (lockFile && path.endsWith(lockFile)) {
          return true
        }
        await fsp.access(path)
      }
    }
  }
  mockery.registerMock('fs', fsMock)
  return {
    setLockFile (file) {
      lockFile = file
    }
  }
}

describe('utils', () => {
  it('detectPMByLockFile should work', async function () {
    const { setLockFile } = mockNpm()
    const { detectPMByLockFile } = require('../lib/detect-package-manager')

    let pm = await detectPMByLockFile()
    pm.should.equal('npm')

    setLockFile('yarn.lock')
    pm = await detectPMByLockFile()
    pm.should.equal('yarn')

    setLockFile('package-lock.json')
    pm = await detectPMByLockFile()
    pm.should.equal('npm')

    setLockFile('pnpm-lock.yaml')
    pm = await detectPMByLockFile()
    pm.should.equal('pnpm')

    mockery.deregisterAll()
    mockery.disable()
  })
})
