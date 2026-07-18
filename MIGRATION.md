# Migration notes

## Upgrading to v13

v13 upgrades the underlying [conventional-changelog](https://github.com/conventional-changelog/conventional-changelog) packages from versions that were several majors behind (`conventional-changelog` 4 → 8, `conventional-changelog-conventionalcommits` 6 → 10, `conventional-recommended-bump` 7 → 12), and makes the package pure ESM. Sorry it took so long to get here!

Most users don't need to change anything: your `.versionrc` / `package.json` configuration, CLI flags, changelog format and version bump behaviour all work exactly as before. The changes below only affect you if one of these applies:

### Presets other than `conventionalcommits` must be installed separately

Older versions of `commit-and-tag-version` bundled all of the conventional-changelog presets (angular, atom, ember, and so on) via the old `conventional-changelog` metapackage. The new version only ships with the default [conventionalcommits](https://github.com/conventional-changelog/conventional-changelog/tree/master/packages/conventional-changelog-conventionalcommits) preset.

If you use `--preset` (or the `preset` config key) with anything other than the default, you will need to install that preset alongside `commit-and-tag-version`:

```sh
npm install --save-dev conventional-changelog-angular
```

Presets must also use the modern conventional-changelog preset interface (a factory function). All official presets released since mid-2023 do; if you use a custom or third-party preset that hasn't been updated, you'll see an error like _"The preset does not export a function. Maybe you are using an old version of the preset. Please upgrade your preset."_

### Pure ESM

The package is now pure ESM. CLI usage is unaffected. If you use the programmatic API:

- `import commitAndTagVersion from 'commit-and-tag-version'` works as before.
- CommonJS callers need `require('commit-and-tag-version').default` (on Node 22+, `require()` of an ES module is supported natively).

### Changelog formatting: section spacing

The changelog writer now emits a single blank line between sections where it previously emitted two:

```diff
 ## [2.0.0](https://github.com/you/repo/compare/v1.0.0...v2.0.0) (2026-07-18)

-
 ### ⚠ BREAKING CHANGES
```

The content of the changelog is otherwise unchanged. This only affects newly generated releases; existing changelog content is never rewritten (unless you use `--releaseCount 0`).

### Node.js 22 or newer is required

The new conventional-changelog packages require Node.js >= 22, so `commit-and-tag-version` now does too. Node 20 reached end-of-life in April 2026, so I expect this won't affect most users.

### Behaviour that is intentionally preserved

The upstream packages made some breaking changes that `commit-and-tag-version` shields you from, so no action is needed for these — they're listed here for the record:

- **`types[].hidden` and the URL format options still work.** conventional-changelog-conventionalcommits 10 replaced `types[].hidden` with `types[].effect`, and replaced the `commitUrlFormat`, `compareUrlFormat`, `issueUrlFormat` and `userUrlFormat` template strings with callback functions. `commit-and-tag-version` translates the [config-spec](https://github.com/conventional-changelog/conventional-changelog-config-spec) options for you, so existing configuration keeps working. (If you supply the new-style `effect` / `format*Url` options, they're passed through untouched.)
- **Version bump recommendations are unchanged.** The new preset only recommends a release when there's at least one `feat`, `fix`, `perf`, `revert` or breaking change; `commit-and-tag-version` keeps its historical behaviour of always recommending at least a patch. Use `--noBumpWhenEmptyChanges` if you don't want a release when there are no relevant commits, as before. In a future major release, we might change this default, depending on feedback.
- **`parserOpts` and `writerOpts` overrides work as before**, merged over the preset's options.
