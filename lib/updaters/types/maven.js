const jsdom = require('jsdom');
const serialize = require('w3c-xmlserializer');
const detectNewline = require('detect-newline');
const CRLF = '\r\n';
const LF = '\n';

function pomDocument(contents) {
  const dom = new jsdom.JSDOM('');
  const parser = new dom.window.DOMParser();
  return parser.parseFromString(contents, 'application/xml');
}

function pomVersionElement(document) {
  const versionElement = document.querySelector('project > version');

  if (!versionElement) {
    throw new Error(
      'Failed to read the version field in your pom file - is it present?',
    );
  }

  return versionElement;
}

module.exports.readVersion = function (contents) {
  const document = pomDocument(contents);
  return pomVersionElement(document).textContent;
};

module.exports.writeVersion = function (contents, version) {
  const newline = detectNewline(contents);
  const document = pomDocument(contents);
  const versionElement = pomVersionElement(document);

  versionElement.textContent = version;

  const xml = serialize(document);

  if (newline === CRLF) {
    return xml.replace(/\n/g, CRLF) + CRLF;
  }

  return xml + LF;
};
