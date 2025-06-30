const detectNewline = require('detect-newline');
const { XMLParser, XMLBuilder } = require('fast-xml-parser');

const CRLF = '\r\n';
const LF = '\n';

function pomDocument(contents) {
  const parser = new XMLParser();
  return parser.parse(contents);
}

function pomVersion(document) {
  const version = document?.project?.version;

  if (!version) {
    throw new Error(
      'Failed to read the version field in your pom file - is it present?',
    );
  }

  return version;
}

module.exports.readVersion = function (contents) {
  const document = pomDocument(contents);
  return pomVersion(document);
};

module.exports.writeVersion = function (contents, version) {
  const newline = detectNewline(contents);
  const document = pomDocument(contents);

  document.project.version = version;

  const builder = new XMLBuilder({format: true});
  const xml = builder.build(document);

  if (newline === CRLF) {
    return xml.replace(/\n/g, CRLF) + CRLF;
  }

  return xml + LF;
};
