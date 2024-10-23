import yaml from 'yaml';
import detectNewline from 'detect-newline';

export function readVersion(contents) {
  return yaml.parse(contents).info.version;
}

export function writeVersion(contents, version) {
  const newline = detectNewline(contents);
  const document = yaml.parseDocument(contents);

  document.get('info').set('version', version);

  return document.toString().replace(/\r?\n/g, newline);
}
