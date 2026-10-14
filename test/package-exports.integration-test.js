import path from 'path';
import { execFileSync } from 'child_process';
import { fileURLToPath } from 'url';

const PACKAGE_ROOT = path.resolve(
  fileURLToPath(new URL('..', import.meta.url)),
);

/**
 * These tests use a child process rather than the in-process harness: `exports`
 * subpath resolution and package self-referencing are Node resolver behaviour,
 * which the vitest module runner does not reproduce.
 */

function resolveEntryPoints() {
  const script = `
    const template = await import('commit-and-tag-version/template')
    const main = await import('commit-and-tag-version')
    const legacy = await import('commit-and-tag-version/defaults.js')
    console.log(JSON.stringify({
      words: typeof template.words,
      template: typeof template.template,
      main: typeof main.default,
      legacy: typeof legacy.default,
    }))
  `;

  const output = execFileSync(
    process.execPath,
    ['--input-type=module', '-e', script],
    { cwd: PACKAGE_ROOT, encoding: 'utf-8' },
  );

  return JSON.parse(output.trim());
}

describe('package exports', function () {
  it('exposes the template helpers as a subpath export', function () {
    expect(resolveEntryPoints()).toMatchObject({
      words: 'function',
      template: 'function',
    });
  });

  it('keeps the entry points that existed before `exports`', function () {
    expect(resolveEntryPoints()).toMatchObject({
      main: 'function',
      legacy: 'object',
    });
  });
});
