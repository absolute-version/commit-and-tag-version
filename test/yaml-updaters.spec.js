import { writeVersion as writeOpenApiVersion } from '../lib/updaters/types/openapi.js';
import { writeVersion as writeYamlVersion } from '../lib/updaters/types/yaml.js';

const description = 'word '.repeat(30).trim();

describe('YAML updaters', function () {
  it('does not wrap long lines in YAML files', function () {
    const contents = `version: 1.2.3\ndescription: ${description}\n`;
    const expected = `version: 1.3.0\ndescription: ${description}\n`;

    expect(writeYamlVersion(contents, '1.3.0')).toEqual(expected);
  });

  it('does not wrap long lines in OpenAPI files', function () {
    const contents = `openapi: 3.0.3\ninfo:\n  title: Example\n  version: 1.2.3\n  description: ${description}\npaths: {}\n`;
    const expected = `openapi: 3.0.3\ninfo:\n  title: Example\n  version: 1.3.0\n  description: ${description}\npaths: {}\n`;

    expect(writeOpenApiVersion(contents, '1.3.0')).toEqual(expected);
  });
});
