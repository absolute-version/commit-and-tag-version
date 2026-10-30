// TODO: this should be replaced with an object we maintain and
// describe in: https://github.com/conventional-changelog/conventional-changelog-config-spec
import spec from 'conventional-changelog-config-spec';

const DEFAULT_PRESET = 'conventional-changelog-conventionalcommits';

/**
 * Expand a conventional-changelog-config-spec URL format template
 * (e.g. "{{host}}/{{owner}}/{{repository}}/issues/{{id}}") using the
 * variables available at render time.
 */
function expandTemplate(template, variables) {
  return template.replace(/{{\s*(\w+)\s*}}/g, (_, key) => variables[key] ?? '');
}

/**
 * conventional-changelog-conventionalcommits >= 10 dropped support for the
 * config-spec's declarative options in favour of new equivalents. Translate
 * the config-spec options so existing user configuration keeps working:
 *
 * - `types[].hidden` (boolean) became `types[].effect`
 *   ('bump' | 'changelog' | 'hidden')
 * - `commitUrlFormat`, `compareUrlFormat`, `issueUrlFormat` and
 *   `userUrlFormat` (handlebars-style template strings) became the
 *   `formatCommitUrl`, `formatCompareUrl`, `formatIssueUrl` and
 *   `formatUserUrl` functions
 */
function translateSpecOptionsToPresetConfig(preset) {
  if (Array.isArray(preset.types)) {
    preset.types = preset.types.map((entry) => {
      if (typeof entry !== 'object' || entry === null || entry.effect) {
        return entry;
      }
      const { hidden, ...rest } = entry;
      return { ...rest, effect: hidden ? 'hidden' : 'bump' };
    });
  }

  if (preset.commitUrlFormat && !preset.formatCommitUrl) {
    const template = preset.commitUrlFormat;
    preset.formatCommitUrl = (context, commit) =>
      expandTemplate(template, { ...context, hash: commit.hash });
  }

  if (preset.compareUrlFormat && !preset.formatCompareUrl) {
    const template = preset.compareUrlFormat;
    preset.formatCompareUrl = (context) => expandTemplate(template, context);
  }

  if (preset.issueUrlFormat && !preset.formatIssueUrl) {
    const template = preset.issueUrlFormat;
    preset.formatIssueUrl = (context, reference) =>
      expandTemplate(template, {
        ...context,
        id: reference.issue,
        prefix: reference.prefix,
      });
  }

  if (preset.userUrlFormat && !preset.formatUserUrl) {
    const template = preset.userUrlFormat;
    preset.formatUserUrl = (context, user) =>
      expandTemplate(template, { ...context, user });
  }

  return preset;
}

/**
 * Presets built on conventional-changelog >= 7 return their parser and writer
 * options under `parser` and `writer` (older presets used `parserOpts` and
 * `writerOpts`). Accept both shapes so a preset object can be used directly as
 * the configuration (e.g. `--config ./my-preset.js`). When both are present,
 * the `*Opts` keys take precedence.
 */
function mergeOptions(newStyle, legacy) {
  if (newStyle === undefined) return legacy;
  if (legacy === undefined) return newStyle;
  return { ...newStyle, ...legacy };
}

export function getParserOpts(args) {
  return mergeOptions(args.parser, args.parserOpts);
}

export function getWriterOpts(args) {
  return mergeOptions(args.writer, args.writerOpts);
}

/**
 * Commit-fetch options passed to ConventionalChangelog.commits() /
 * Bumper.commits() (GetCommitsParams). Accept the legacy
 * `gitRawCommitsOpts` name (from older conventional-changelog) and the
 * modern `commits` alias. When both are present, `gitRawCommitsOpts`
 * takes precedence.
 */
export function getGitRawCommitsOpts(args) {
  return mergeOptions(args.commits, args.gitRawCommitsOpts);
}

export default (args) => {
  let preset = args.preset || DEFAULT_PRESET;
  if (preset === DEFAULT_PRESET) {
    preset = {
      name: DEFAULT_PRESET,
    };
    Object.keys(spec.properties).forEach((key) => {
      if (args[key] !== undefined) preset[key] = args[key];
    });
  }
  if (typeof preset === 'object') {
    preset = translateSpecOptionsToPresetConfig(preset);
  }
  return preset;
};
