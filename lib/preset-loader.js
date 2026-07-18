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
