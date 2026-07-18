import detectNewline from 'detect-newline';
import { XMLParser, XMLBuilder } from 'fast-xml-parser';

const CRLF = '\r\n';
const LF = '\n';

function pomDocument(contents) {
  const parser = new XMLParser({
    // Preserve attributes on XML elements (fast-xml-parser strips them by default)
    ignoreAttributes: false,
    // Don't coerce element text to numbers/booleans (e.g. keep version "1.0" as a string)
    parseTagValue: false,
    // Don't coerce attribute values to numbers/booleans (e.g. keep port="8080" as a string)
    parseAttributeValue: false,
    // Preserve comments
    commentPropName: '#comment',
  });
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

export function readVersion(contents) {
  const document = pomDocument(contents);
  return pomVersion(document);
}

export function writeVersion(contents, version) {
  const newline = detectNewline(contents);
  const document = pomDocument(contents);

  document.project.version = version;

  const builder = new XMLBuilder({
    // Preserve attributes on XML elements (fast-xml-parser strips them by default)
    ignoreAttributes: false,
    // Write fork="true" instead of shorthand fork (which is invalid in XML)
    suppressBooleanAttributes: false,
    format: true,
    // Preserve comments
    commentPropName: '#comment',
  });
  const xml = builder.build(document);

  if (newline === CRLF) {
    return xml.replace(/\n/g, CRLF) + CRLF;
  }

  return xml + LF;
}
