/*
Copyright npm, Inc

Permission to use, copy, modify, and/or distribute this software for any
purpose with or without fee is hereby granted, provided that the above
copyright notice and this permission notice appear in all copies.

THE SOFTWARE IS PROVIDED "AS IS" AND THE AUTHOR DISCLAIMS ALL WARRANTIES
WITH REGARD TO THIS SOFTWARE INCLUDING ALL IMPLIED WARRANTIES OF
MERCHANTABILITY AND FITNESS. IN NO EVENT SHALL THE AUTHOR BE LIABLE FOR
ANY SPECIAL, DIRECT, INDIRECT, OR CONSEQUENTIAL DAMAGES OR ANY DAMAGES
WHATSOEVER RESULTING FROM LOSS OF USE, DATA OR PROFITS, WHETHER IN AN
ACTION OF CONTRACT, NEGLIGENCE OR OTHER TORTIOUS ACTION, ARISING OUT OF
OR IN CONNECTION WITH THE USE OR PERFORMANCE OF THIS SOFTWARE.

https://github.com/npm/stringify-package/blob/main/LICENSE
*/

'use strict';

module.exports = stringifyPackage;

const DEFAULT_INDENT = 2;
const CRLF = '\r\n';
const LF = '\n';

function stringifyPackage(data, indent, newline) {
  indent = indent || (indent === 0 ? 0 : DEFAULT_INDENT);
  const json = JSON.stringify(data, null, indent);

  if (newline === CRLF) {
    return json.replace(/\n/g, CRLF) + CRLF;
  }

  return json + LF;
}
