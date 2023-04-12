/* global describe it */

'use strict'

const stringifyPackage = require('../lib/stringify-package')

require('chai').should()

describe('stringifyPackage()', function () {
  const dummy = { name: 'dummy' }

  it('with no params uses \\n', function () {
    stringifyPackage(dummy).should.match(/\n$/m)
  })

  it('uses \\n', function () {
    stringifyPackage(dummy, 2, '\n').should.match(/\n$/m)
  })

  it('uses \\r\\n', function () {
    stringifyPackage(dummy, 2, '\r\n').should.match(/\r\n$/m)
  })

  it('with no params uses 2-space indent', function () {
    stringifyPackage(dummy).should.match(/^ {2}"name": "dummy"/m)
  })

  it('uses 2-space indent', function () {
    stringifyPackage(dummy, 2, '\n').should.match(/^ {2}"name": "dummy"/m)
  })

  it('uses 4-space indent', function () {
    stringifyPackage(dummy, 4, '\n').should.match(/^ {4}"name": "dummy"/m)
  })

  it('0 works', function () {
    stringifyPackage(dummy, 0).split(/\r\n|\r|\n/).length.should.equal(2)
  })
})
