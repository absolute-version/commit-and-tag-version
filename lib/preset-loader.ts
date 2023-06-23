// TODO: this should be replaced with an object we maintain and
// describe in: https://github.com/conventional-changelog/conventional-changelog-config-spec
import spec from './opts/spec';
import { Config } from './opts/types';

export default function presetLoader(config: Config) {
  if (config.preset) return config.preset;
  const defaultPreset = require.resolve('conventional-changelog-conventionalcommits')
  const preset: Record<string, any> = {
    name: defaultPreset,
  };
  Object.keys(spec).forEach(key => {
    const value = config[key as keyof Config];
    if (value !== undefined) preset[key] = value;
  })
  return preset;
}
