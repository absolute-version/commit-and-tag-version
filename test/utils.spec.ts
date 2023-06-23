/* global describe it */
import detectPMByLockFile from '../lib/detect-package-manager'

require('chai').should()

describe('utils', () => {
  it('detectPMByLockFile should detect npm', async function () {
    const pm = await detectPMByLockFile('./test/mocks/npm')
    pm.should.equal('npm')
  });

  it('detectPMByLockFile should detect yarn', async function () {
    const pm = await detectPMByLockFile('./test/mocks/yarn')
    pm.should.equal('yarn')
  });

  it('detectPMByLockFile should detect pnpm', async function () {
    const pm = await detectPMByLockFile('./test/mocks/pnpm')
    pm.should.equal('pnpm')
  });
})
