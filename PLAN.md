# Migration Plan: Jest → Vitest

## Overview

Migrate all tests from Jest to Vitest while preserving the exact same mocking behavior. The codebase is 100% CJS (CommonJS). Tests mock `fs`, `git`, and external modules aggressively to prevent real filesystem/git modifications.

## Risk Assessment

**HIGH RISK areas:**
- `core.spec.js` mocks `fs.writeFileSync`, `fs.readFileSync`, `fs.lstatSync` — if these mocks don't engage, tests will write to the real `package.json` and `CHANGELOG.md` in the repo root
- `core.spec.js` mocks `../lib/run-execFile` — if this mock doesn't engage, tests will run real `git` commands against the repo
- Integration tests use `shell.cd()` to enter temp directories — if cleanup fails, the CWD is wrong for subsequent tests

**MEDIUM RISK areas:**
- `jest.requireActual('conventional-recommended-bump')` used in 4 tests — Vitest equivalent (`vi.importActual`) is async
- Module re-requiring pattern (`standardVersion = require('../index')` inside `mock()`) — must work with Vitest's module interception

**LOW RISK areas:**
- `stringify-package.spec.js` and `utils.spec.js` — trivial mocking
- Integration tests — mostly `vi.spyOn(console, ...)` and `vi.mock()` for conventional-changelog libs

## Strategy

### Keep CJS source, use Vitest's CJS compatibility

- **DO NOT** convert source files to ESM — too much risk for no benefit
- Test files will remain `.js` using `require()` syntax — Vitest transforms CJS through its pipeline
- Use `vi.*` globals (configured via `globals: true`) as drop-in replacements for `jest.*`
- Vitest's `vi.mock()` hoists just like `jest.mock()` and works with CJS `require()`

### Key API translations

| Jest | Vitest |
|------|--------|
| `jest.mock('module')` | `vi.mock('module')` |
| `jest.spyOn(obj, 'method')` | `vi.spyOn(obj, 'method')` |
| `jest.fn()` | `vi.fn()` |
| `jest.requireActual('module')` | `await vi.importActual('module')` (async!) |
| `mockFn.mockImplementation()` | `mockFn.mockImplementation()` (same) |
| `mockFn.mockRestore()` | `mockFn.mockRestore()` (same) |
| `mockFn.mockClear()` | `mockFn.mockClear()` (same) |
| `expect(...).rejects.toThrow()` | `expect(...).rejects.toThrow()` (same) |

## Step-by-step Plan

### Step 1: Install dependencies & update package.json

**Install:**
- `vitest` (replaces `jest`)
- `eslint-plugin-vitest` (replaces `eslint-plugin-jest`)

**Remove:**
- `jest`
- `jest-serial-runner`
- `eslint-plugin-jest`

**Update scripts:**
```json
{
  "test": "vitest run",
  "test:unit": "vitest run --exclude 'test/*.integration-test.js'",
  "test:git-integration": "vitest run test/git.integration-test.js"
}
```

### Step 2: Create vitest.config.js

```js
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,           // provides vi, describe, it, expect globally
    testTimeout: 30000,
    include: [
      'test/**/*.spec.js',
      'test/**/*.integration-test.js',
    ],
    coverage: {
      provider: 'v8',
      include: ['**/*.{js,jsx,ts}'],
      exclude: ['node_modules/**', 'tmp/**', 'test/**', 'coverage/**', 'bin/**'],
      reporter: ['lcov', 'text'],
    },
    // Each test file runs in its own fork (isolated process)
    // Critical for integration tests that use shell.cd()
    pool: 'forks',
    // Run integration tests sequentially to avoid CWD conflicts
    sequence: {
      concurrent: false,
    },
  },
});
```

### Step 3: Delete jest.config.js

Remove the Jest configuration file.

### Step 4: Migrate test/mocks/jest-mocks.js

Rename concept but keep filename as-is (or rename to `vi-mocks.js` — preference).

Changes:
- `jest.mock('conventional-changelog')` → `vi.mock('conventional-changelog')`
- Same for the other 3 `jest.mock()` calls
- All `.mockImplementation()` calls stay the same (same API)

This file uses `require()` at the top for the mocked modules — works fine since `vi.mock()` is hoisted.

### Step 5: Migrate test/core.spec.js (CRITICAL — largest file, most complex mocking)

**5a: Replace all `jest.*` calls:**
- `jest.spyOn(console, 'warn').mockImplementation()` → `vi.spyOn(console, 'warn').mockImplementation()`
- `jest.spyOn(console, 'info').mockImplementation()` → `vi.spyOn(console, 'info').mockImplementation()`
- `jest.mock('../lib/run-execFile')` → `vi.mock('../lib/run-execFile')`
- `jest.spyOn(fs, 'readFileSync')` → `vi.spyOn(fs, 'readFileSync')`
- `jest.spyOn(fs, 'writeFileSync')` → `vi.spyOn(fs, 'writeFileSync')`
- `jest.spyOn(fs, 'lstatSync')` → `vi.spyOn(fs, 'lstatSync')`
- `jest.mock('dotgitignore')` → `vi.mock('dotgitignore')`

**5b: Handle `jest.requireActual('conventional-recommended-bump')`:**

There are 4 tests that use this pattern:
```js
mock({
  bump: jest.requireActual('conventional-recommended-bump'),
  ...
});
```

Convert to:
```js
const actualBump = await vi.importActual('conventional-recommended-bump');
mock({
  bump: actualBump,
  ...
});
```

These tests are already `async`, so `await` works naturally.

**5c: Verify the mock()/unmock() pattern works:**

The `mock()` function does:
1. Sets up mock implementations on conventional-changelog modules
2. Does `standardVersion = require('../index')`
3. Spies on `fs.readFileSync`, `fs.writeFileSync`, `fs.lstatSync`

And `unmock()` restores the spies.

With Vitest, `vi.mock()` at module level (hoisted from jest-mocks.js) ensures `require('../index')` gets mocked dependencies. The `require()` inside `mock()` will work because Vitest supports CJS `require()`.

**5d: The `DotGitIgnore` mock:**
```js
const DotGitIgnore = require('dotgitignore');
jest.mock('dotgitignore');
DotGitIgnore.mockImplementation(...)
```
→ Change `jest.mock` to `vi.mock`. The rest stays the same.

### Step 6: Migrate test/stringify-package.spec.js

Minimal changes — no mocking used, just `require()` and `expect()`. With `globals: true` in vitest config, the test globals are auto-available. Nothing needs to change beyond ensuring vitest processes it.

### Step 7: Migrate test/utils.spec.js

Changes:
- `jest.spyOn(fsp, 'access')` → `vi.spyOn(fsp, 'access')`

### Step 8: Migrate integration tests (6 files)

All integration tests follow the same pattern:
1. `jest.spyOn(console, 'warn/info/error')` → `vi.spyOn(console, 'warn/info/error')`
2. In jest-mocks.js calls: already handled by Step 4
3. `spy.mock.calls` → stays the same (same API)

Files to migrate:
- `test/git.integration-test.js`
- `test/pre-commit-hook.integration-test.js`
- `test/config-files.integration-test.js`
- `test/commit-message-config.integration-test.js`
- `test/config-keys.integration-test.js`
- `test/invalid-config.integration-test.js`

**`test/preset.integration-test.js`** — NO CHANGES needed (no jest/vi APIs used at all, just `describe`/`it`/`expect` which come from globals).

### Step 9: Update eslint.config.mjs

- Replace `eslint-plugin-jest` with `eslint-plugin-vitest`
- Replace `globals.jest` with vitest globals
- Update rule names from `jest/*` to `vitest/*`

### Step 10: Verification

1. Run `npx vitest run` and confirm all tests pass
2. Specifically verify that after tests complete:
   - `package.json` in repo root is unchanged (not corrupted by test writes)
   - `CHANGELOG.md` is unchanged
   - No temp directories left behind
   - `git status` shows no unexpected changes (only the migration files)
3. Run `npm run lint` to confirm eslint passes with new vitest plugin

## File Change Summary

| File | Action |
|------|--------|
| `package.json` | Update deps & scripts |
| `jest.config.js` | DELETE |
| `vitest.config.js` | CREATE |
| `eslint.config.mjs` | Update jest→vitest plugin |
| `test/mocks/jest-mocks.js` | `jest.*` → `vi.*` |
| `test/core.spec.js` | `jest.*` → `vi.*`, handle `requireActual` |
| `test/stringify-package.spec.js` | No changes needed |
| `test/utils.spec.js` | `jest.*` → `vi.*` |
| `test/git.integration-test.js` | `jest.*` → `vi.*` |
| `test/pre-commit-hook.integration-test.js` | `jest.*` → `vi.*` |
| `test/config-files.integration-test.js` | No changes (uses mocks from jest-mocks.js only) |
| `test/config-keys.integration-test.js` | No changes (uses mocks from jest-mocks.js only) |
| `test/commit-message-config.integration-test.js` | `jest.*` → `vi.*` |
| `test/invalid-config.integration-test.js` | No changes (uses mocks from jest-mocks.js only) |
| `test/preset.integration-test.js` | No changes needed |

## Notes on Safety

- The `fs.writeFileSync` spy in `core.spec.js` is the most critical mock — it prevents writing to real files. In Vitest, `vi.spyOn(fs, 'writeFileSync').mockImplementation()` works identically to Jest's version.
- The `run-execFile` module mock prevents real git commands. `vi.mock('../lib/run-execFile')` hoists just like `jest.mock()`.
- Integration tests that create real temp directories and run real git are safe because they operate in subdirectories (`git-repo-temp/`, `pre-commit-hook-temp/`, etc.) and clean up after themselves. This pattern doesn't depend on the test framework.
