const yaml = require('yaml');
const detectNewline = require('detect-newline');

module.exports.readVersion = function (contents) {
  return yaml.parse(contents).info.version;
};

module.exports.writeVersion = function (contents, version) {
  const newline = detectNewline(contents);
  const document = yaml.parseDocument(contents);

  document.get('info').set('version', version);

  return document.toString().replace(/\r?\n/g, newline);
};
