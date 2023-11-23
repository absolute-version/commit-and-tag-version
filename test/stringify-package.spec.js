'use strict';

const stringifyPackage = require('../lib/stringify-package');

describe('stringifyPackage()', function () {
  const dummy = { name: 'dummy' };

  it('with no params uses \\n', function () {
    expect(stringifyPackage(dummy)).toMatch(/\n$/m);
  });

  it('uses \\n', function () {
    expect(stringifyPackage(dummy, 2, '\n')).toMatch(/\n$/m);
  });

  it('uses \\r\\n', function () {
    expect(stringifyPackage(dummy, 2, '\r\n')).toMatch(/\r\n$/m);
  });

  it('with no params uses 2-space indent', function () {
    expect(stringifyPackage(dummy)).toMatch(/^ {2}"name": "dummy"/m);
  });

  it('uses 2-space indent', function () {
    expect(stringifyPackage(dummy, 2, '\n')).toMatch(/^ {2}"name": "dummy"/m);
  });

  it('uses 4-space indent', function () {
    expect(stringifyPackage(dummy, 4, '\n')).toMatch(/^ {4}"name": "dummy"/m);
  });

  it('0 works', function () {
    expect(stringifyPackage(dummy, 0).split(/\r\n|\r|\n/).length).toEqual(2);
  });
});
