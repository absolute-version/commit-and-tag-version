import jsdom from 'jsdom';
import serialize from 'w3c-xmlserializer';
import detectNewline from 'detect-newline';
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

export function readVersion(contents) {
  const document = pomDocument(contents);
  return pomVersionElement(document).textContent;
}

export function writeVersion(contents, version) {
  const newline = detectNewline(contents);
  const document = pomDocument(contents);
  const versionElement = pomVersionElement(document);

  versionElement.textContent = version;

  const xml = serialize(document);

  if (newline === CRLF) {
    return xml.replace(/\n/g, CRLF) + CRLF;
  }

  return xml + LF;
}
