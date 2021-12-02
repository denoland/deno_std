// Copyright Joyent, Inc. and other Node contributors.
//
// Permission is hereby granted, free of charge, to any person obtaining a
// copy of this software and associated documentation files (the
// "Software"), to deal in the Software without restriction, including
// without limitation the rights to use, copy, modify, merge, publish,
// distribute, sublicense, and/or sell copies of the Software, and to permit
// persons to whom the Software is furnished to do so, subject to the
// following conditions:
//
// The above copyright notice and this permission notice shall be included
// in all copies or substantial portions of the Software.
//
// THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS
// OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF
// MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN
// NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM,
// DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR
// OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE
// USE OR OTHER DEALINGS IN THE SOFTWARE.

import {
  ERR_INVALID_ARG_TYPE,
  ERR_INVALID_ARG_VALUE,
  ERR_INVALID_FILE_URL_HOST,
  ERR_INVALID_FILE_URL_PATH,
  ERR_INVALID_URL_SCHEME,
} from "./_errors.ts";
import {
  CHAR_0,
  CHAR_9,
  CHAR_AT,
  CHAR_BACKWARD_SLASH,
  CHAR_CARRIAGE_RETURN,
  CHAR_CIRCUMFLEX_ACCENT,
  CHAR_DOT,
  CHAR_DOUBLE_QUOTE,
  CHAR_FORM_FEED,
  CHAR_FORWARD_SLASH,
  CHAR_GRAVE_ACCENT,
  CHAR_HASH,
  CHAR_HYPHEN_MINUS,
  CHAR_LEFT_ANGLE_BRACKET,
  CHAR_LEFT_CURLY_BRACKET,
  CHAR_LEFT_SQUARE_BRACKET,
  CHAR_LINE_FEED,
  CHAR_LOWERCASE_A,
  CHAR_LOWERCASE_Z,
  CHAR_NO_BREAK_SPACE,
  CHAR_PERCENT,
  CHAR_PLUS,
  CHAR_QUESTION_MARK,
  CHAR_RIGHT_ANGLE_BRACKET,
  CHAR_RIGHT_CURLY_BRACKET,
  CHAR_RIGHT_SQUARE_BRACKET,
  CHAR_SEMICOLON,
  CHAR_SINGLE_QUOTE,
  CHAR_SPACE,
  CHAR_TAB,
  CHAR_UNDERSCORE,
  CHAR_UPPERCASE_A,
  CHAR_UPPERCASE_Z,
  CHAR_VERTICAL_LINE,
  CHAR_ZERO_WIDTH_NOBREAK_SPACE,
} from "../path/_constants.ts";
import * as path from "./path.ts";
import { toASCII } from "./_idna.ts";
import { isWindows, osType } from "../_util/os.ts";

const forwardSlashRegEx = /\//g;
const percentRegEx = /%/g;
const backslashRegEx = /\\/g;
const newlineRegEx = /\n/g;
const carriageReturnRegEx = /\r/g;
const tabRegEx = /\t/g;
// Reference: RFC 3986, RFC 1808, RFC 2396

// define these here so at least they only have to be
// compiled once on the first module load.
const protocolPattern = /^[a-z0-9.+-]+:/i;
const hostPattern = /^\/\/[^@/]+@[^@/]+/;
// Protocols that never have a hostname.
const hostlessProtocol = new Set(["javascript", "javascript:"]);
// Protocols that always contain a // bit.
const slashedProtocol = new Set([
  "http",
  "http:",
  "https",
  "https:",
  "ftp",
  "ftp:",
  "gopher",
  "gopher:",
  "file",
  "file:",
  "ws",
  "ws:",
  "wss",
  "wss:",
]);

const hostnameMaxLen = 255;

const _url = URL;
export { _url as URL };

/**
 * The URL object has both a `toString()` method and `href` property that return string serializations of the URL.
 * These are not, however, customizable in any way.
 * This method allows for basic customization of the output.
 * @see Tested in `parallel/test-url-format-whatwg.js`.
 * @param urlObject
 * @param options
 * @param options.auth `true` if the serialized URL string should include the username and password, `false` otherwise. **Default**: `true`.
 * @param options.fragment `true` if the serialized URL string should include the fragment, `false` otherwise. **Default**: `true`.
 * @param options.search `true` if the serialized URL string should include the search query, **Default**: `true`.
 * @param options.unicode `true` if Unicode characters appearing in the host component of the URL string should be encoded directly as opposed to being Punycode encoded. **Default**: `false`.
 * @returns a customizable serialization of a URL `String` representation of a `WHATWG URL` object.
 */
export function format(
  urlObject: URL,
  options?: {
    auth: boolean;
    fragment: boolean;
    search: boolean;
    unicode: boolean;
  },
): string {
  if (options) {
    if (typeof options !== "object") {
      throw new ERR_INVALID_ARG_TYPE("options", "object", options);
    }
  }

  options = {
    auth: true,
    fragment: true,
    search: true,
    unicode: false,
    ...options,
  };

  let ret = urlObject.protocol;
  if (urlObject.host !== null) {
    ret += "//";
    const hasUsername = urlObject.username !== "";
    const hasPassword = urlObject.password !== "";
    if (options.auth && (hasUsername || hasPassword)) {
      if (hasUsername) {
        ret += urlObject.username;
      }
      if (hasPassword) {
        ret += `:${urlObject.password}`;
      }
      ret += "@";
    }
    // TODO(wafuwfu13): Support unicode option
    // ret += options.unicode ?
    //   domainToUnicode(urlObject.host) : urlObject.host;
    ret += urlObject.host;
    if (urlObject.port) {
      ret += `:${urlObject.port}`;
    }
  }

  ret += urlObject.pathname;

  if (options.search) {
    ret += urlObject.search;
  }
  if (options.fragment) {
    ret += urlObject.hash;
  }

  return ret;
}

function isIpv6Hostname(hostname: string) {
  return (
    hostname.charCodeAt(0) === CHAR_LEFT_SQUARE_BRACKET &&
    hostname.charCodeAt(hostname.length - 1) === CHAR_RIGHT_SQUARE_BRACKET
  );
}

function getHostname(self: URL, rest: string) {
  for (let i = 0; i < self.hostname.length; ++i) {
    const code = self.hostname.charCodeAt(i);
    const isValid = (code >= CHAR_LOWERCASE_A && code <= CHAR_LOWERCASE_Z) ||
      code === CHAR_DOT ||
      (code >= CHAR_UPPERCASE_A && code <= CHAR_UPPERCASE_Z) ||
      (code >= CHAR_0 && code <= CHAR_9) ||
      code === CHAR_HYPHEN_MINUS ||
      code === CHAR_PLUS ||
      code === CHAR_UNDERSCORE ||
      code > 127;

    // Invalid host character
    if (!isValid) {
      self.hostname = self.hostname.slice(0, i);
      return `/${self.hostname.slice(i)}${rest}`;
    }
  }
  return rest;
}

/**
 * The url.parse() method takes a URL string, parses it, and returns a URL object..
 *
 * @param url The URL string to parse.
 * @param parseQueryString If `true`, the query property will always be set to an object returned by the querystring module's parse() method. If false,
 * the query property on the returned URL object will be an unparsed, undecoded string. Default: false.
 * @param slashesDenoteHost If `true`, the first token after the literal string // and preceding the next / will be interpreted as the host
 */
export function parse(
  url: string,
  parseQueryString: boolean,
  slashesDenoteHost: boolean,
) {
  // Copy chrome, IE, opera backslash-handling behavior.
  // Back slashes before the query string get converted to forward slashes
  // See: https://code.google.com/p/chromium/issues/detail?id=25916
  let hasHash = false;
  let start = -1;
  let end = -1;
  let rest = "";
  let lastPos = 0;
  for (let i = 0, inWs = false, split = false; i < url.length; ++i) {
    const code = url.charCodeAt(i);

    // Find first and last non-whitespace characters for trimming
    const isWs = code === CHAR_SPACE ||
      code === CHAR_TAB ||
      code === CHAR_CARRIAGE_RETURN ||
      code === CHAR_LINE_FEED ||
      code === CHAR_FORM_FEED ||
      code === CHAR_NO_BREAK_SPACE ||
      code === CHAR_ZERO_WIDTH_NOBREAK_SPACE;
    if (start === -1) {
      if (isWs) continue;
      lastPos = start = i;
    } else if (inWs) {
      if (!isWs) {
        end = -1;
        inWs = false;
      }
    } else if (isWs) {
      end = i;
      inWs = true;
    }

    // Only convert backslashes while we haven't seen a split character
    if (!split) {
      switch (code) {
        case CHAR_HASH:
          hasHash = true;
        // Fall through
        case CHAR_QUESTION_MARK:
          split = true;
          break;
        case CHAR_BACKWARD_SLASH:
          if (i - lastPos > 0) rest += url.slice(lastPos, i);
          rest += "/";
          lastPos = i + 1;
          break;
      }
    } else if (!hasHash && code === CHAR_HASH) {
      hasHash = true;
    }
  }

  // Check if string was non-empty (including strings with only whitespace)
  if (start !== -1) {
    if (lastPos === start) {
      // We didn't convert any backslashes

      if (end === -1) {
        if (start === 0) rest = url;
        else rest = url.slice(start);
      } else {
        rest = url.slice(start, end);
      }
    } else if (end === -1 && lastPos < url.length) {
      // We converted some backslashes and have only part of the entire string
      rest += url.slice(lastPos);
    } else if (end !== -1 && lastPos < end) {
      // We converted some backslashes and have only part of the entire string
      rest += url.slice(lastPos, end);
    }
  }

  const self = new URL(url);

  let proto = protocolPattern.exec(rest)?.toString();
  let lowerProto = "";
  if (proto) {
    proto = proto[0];
    lowerProto = proto.toLowerCase();
    self.protocol = lowerProto;
    rest = rest.slice(proto.length);
  }

  // Figure out if it's got a host
  // user@server is *always* interpreted as a hostname, and url
  // resolution will treat //foo/bar as host=foo,path=bar because that's
  // how the browser resolves relative URLs.
  let slashes;
  if (slashesDenoteHost || proto || hostPattern.test(rest)) {
    slashes = rest.charCodeAt(0) === CHAR_FORWARD_SLASH &&
      rest.charCodeAt(1) === CHAR_FORWARD_SLASH;
    if (slashes && !(proto && hostlessProtocol.has(lowerProto))) {
      rest = rest.slice(2);
    }
  }

  if (
    !hostlessProtocol.has(lowerProto) &&
    (slashes || (proto && !slashedProtocol.has(proto)))
  ) {
    // there's a hostname.
    // the first instance of /, ?, ;, or # ends the host.
    //
    // If there is an @ in the hostname, then non-host chars *are* allowed
    // to the left of the last @ sign, unless some host-ending character
    // comes *before* the @-sign.
    // URLs are obnoxious.
    //
    // ex:
    // http://a@b@c/ => user:a@b host:c
    // http://a@b?@c => user:a host:b path:/?@c

    let hostEnd = -1;
    let atSign = -1;
    let nonHost = -1;
    for (let i = 0; i < rest.length; ++i) {
      switch (rest.charCodeAt(i)) {
        case CHAR_TAB:
        case CHAR_LINE_FEED:
        case CHAR_CARRIAGE_RETURN:
        case CHAR_SPACE:
        case CHAR_DOUBLE_QUOTE:
        case CHAR_PERCENT:
        case CHAR_SINGLE_QUOTE:
        case CHAR_SEMICOLON:
        case CHAR_LEFT_ANGLE_BRACKET:
        case CHAR_RIGHT_ANGLE_BRACKET:
        case CHAR_BACKWARD_SLASH:
        case CHAR_CIRCUMFLEX_ACCENT:
        case CHAR_GRAVE_ACCENT:
        case CHAR_LEFT_CURLY_BRACKET:
        case CHAR_VERTICAL_LINE:
        case CHAR_RIGHT_CURLY_BRACKET:
          // Characters that are never ever allowed in a hostname from RFC 2396
          if (nonHost === -1) nonHost = i;
          break;
        case CHAR_HASH:
        case CHAR_FORWARD_SLASH:
        case CHAR_QUESTION_MARK:
          // Find the first instance of any host-ending characters
          if (nonHost === -1) nonHost = i;
          hostEnd = i;
          break;
        case CHAR_AT:
          // At this point, either we have an explicit point where the
          // auth portion cannot go past, or the last @ char is the decider.
          atSign = i;
          nonHost = -1;
          break;
      }
      if (hostEnd !== -1) break;
    }
    start = 0;
    if (atSign !== -1) {
      start = atSign + 1;
    }
    if (nonHost === -1) {
      self.host = rest.slice(start);
      rest = "";
    } else {
      self.host = rest.slice(start, nonHost);
      rest = rest.slice(nonHost);
    }

    // We've indicated that there is a hostname,
    // so even if it's empty, it has to be present.
    if (typeof self.hostname !== "string") self.hostname = "";

    // If hostname begins with [ and ends with ]
    // assume that it's an IPv6 address.
    const ipv6Hostname = isIpv6Hostname(self.hostname);

    // validate a little.
    if (!ipv6Hostname) {
      rest = getHostname(self, rest);
    }

    if (self.hostname.length > hostnameMaxLen) {
      self.hostname = "";
    } else {
      // Hostnames are always lower case.
      self.hostname = self.hostname.toLowerCase();
    }

    if (!ipv6Hostname) {
      // IDNA Support: Returns a punycoded representation of "domain".
      // It only converts parts of the domain name that
      // have non-ASCII characters, i.e. it doesn't matter if
      // you call it with a domain that already is ASCII-only.

      // Use lenient mode (`true`) to try to support even non-compliant
      // URLs.
      self.hostname = toASCII(self.hostname);
    }

    const p = self.port ? ":" + self.port : "";
    const h = self.hostname || "";
    self.host = h + p;

    // strip [ and ] from the hostname
    // the host field still retains them, though
    if (ipv6Hostname) {
      self.hostname = self.hostname.slice(1, -1);
      if (rest[0] !== "/") {
        rest = "/" + rest;
      }
    }
  }

  let questionIdx = -1;
  let hashIdx = -1;
  for (let i = 0; i < rest.length; ++i) {
    const code = rest.charCodeAt(i);
    if (code === CHAR_HASH) {
      self.hash = rest.slice(i);
      hashIdx = i;
      break;
    } else if (code === CHAR_QUESTION_MARK && questionIdx === -1) {
      questionIdx = i;
    }
  }

  if (questionIdx !== -1) {
    if (hashIdx === -1) {
      self.search = rest.slice(questionIdx);
    } else {
      self.search = rest.slice(questionIdx, hashIdx);
    }
  } else if (parseQueryString) {
    // No query string, but parseQueryString still requested
    self.search = "";
  }

  const useQuestionIdx = questionIdx !== -1 &&
    (hashIdx === -1 || questionIdx < hashIdx);
  const firstIdx = useQuestionIdx ? questionIdx : hashIdx;
  if (firstIdx === -1) {
    if (rest.length > 0) self.pathname = rest;
  } else if (firstIdx > 0) {
    self.pathname = rest.slice(0, firstIdx);
  }
  if (slashedProtocol.has(lowerProto) && self.hostname && !self.pathname) {
    self.pathname = "/";
  }

  // Finally, reconstruct the href based on what has been validated.
  self.href = format(self);
}

/**
 * This function ensures the correct decodings of percent-encoded characters as well as ensuring a cross-platform valid absolute path string.
 * @see Tested in `parallel/test-fileurltopath.js`.
 * @param path The file URL string or URL object to convert to a path.
 * @returns The fully-resolved platform-specific Node.js file path.
 */
export function fileURLToPath(path: string | URL): string {
  if (typeof path === "string") path = new URL(path);
  else if (!(path instanceof URL)) {
    throw new ERR_INVALID_ARG_TYPE("path", ["string", "URL"], path);
  }
  if (path.protocol !== "file:") {
    throw new ERR_INVALID_URL_SCHEME("file");
  }
  return isWindows ? getPathFromURLWin(path) : getPathFromURLPosix(path);
}

function getPathFromURLWin(url: URL): string {
  const hostname = url.hostname;
  let pathname = url.pathname;
  for (let n = 0; n < pathname.length; n++) {
    if (pathname[n] === "%") {
      const third = pathname.codePointAt(n + 2)! | 0x20;
      if (
        (pathname[n + 1] === "2" && third === 102) || // 2f 2F /
        (pathname[n + 1] === "5" && third === 99) // 5c 5C \
      ) {
        throw new ERR_INVALID_FILE_URL_PATH(
          "must not include encoded \\ or / characters",
        );
      }
    }
  }

  pathname = pathname.replace(forwardSlashRegEx, "\\");
  pathname = decodeURIComponent(pathname);
  if (hostname !== "") {
    // TODO(bartlomieju): add support for punycode encodings
    return `\\\\${hostname}${pathname}`;
  } else {
    // Otherwise, it's a local path that requires a drive letter
    const letter = pathname.codePointAt(1)! | 0x20;
    const sep = pathname[2];
    if (
      letter < CHAR_LOWERCASE_A ||
      letter > CHAR_LOWERCASE_Z || // a..z A..Z
      sep !== ":"
    ) {
      throw new ERR_INVALID_FILE_URL_PATH("must be absolute");
    }
    return pathname.slice(1);
  }
}

function getPathFromURLPosix(url: URL): string {
  if (url.hostname !== "") {
    throw new ERR_INVALID_FILE_URL_HOST(osType);
  }
  const pathname = url.pathname;
  for (let n = 0; n < pathname.length; n++) {
    if (pathname[n] === "%") {
      const third = pathname.codePointAt(n + 2)! | 0x20;
      if (pathname[n + 1] === "2" && third === 102) {
        throw new ERR_INVALID_FILE_URL_PATH(
          "must not include encoded / characters",
        );
      }
    }
  }
  return decodeURIComponent(pathname);
}

/**
 *  The following characters are percent-encoded when converting from file path
 *  to URL:
 *  - %: The percent character is the only character not encoded by the
 *       `pathname` setter.
 *  - \: Backslash is encoded on non-windows platforms since it's a valid
 *       character but the `pathname` setters replaces it by a forward slash.
 *  - LF: The newline character is stripped out by the `pathname` setter.
 *        (See whatwg/url#419)
 *  - CR: The carriage return character is also stripped out by the `pathname`
 *        setter.
 *  - TAB: The tab character is also stripped out by the `pathname` setter.
 */
function encodePathChars(filepath: string): string {
  if (filepath.includes("%")) {
    filepath = filepath.replace(percentRegEx, "%25");
  }
  // In posix, backslash is a valid character in paths:
  if (!isWindows && filepath.includes("\\")) {
    filepath = filepath.replace(backslashRegEx, "%5C");
  }
  if (filepath.includes("\n")) {
    filepath = filepath.replace(newlineRegEx, "%0A");
  }
  if (filepath.includes("\r")) {
    filepath = filepath.replace(carriageReturnRegEx, "%0D");
  }
  if (filepath.includes("\t")) {
    filepath = filepath.replace(tabRegEx, "%09");
  }
  return filepath;
}

/**
 * This function ensures that `filepath` is resolved absolutely, and that the URL control characters are correctly encoded when converting into a File URL.
 * @see Tested in `parallel/test-url-pathtofileurl.js`.
 * @param filepath The file path string to convert to a file URL.
 * @returns The file URL object.
 */
export function pathToFileURL(filepath: string): URL {
  const outURL = new URL("file://");
  if (isWindows && filepath.startsWith("\\\\")) {
    // UNC path format: \\server\share\resource
    const paths = filepath.split("\\");
    if (paths.length <= 3) {
      throw new ERR_INVALID_ARG_VALUE(
        "filepath",
        filepath,
        "Missing UNC resource path",
      );
    }
    const hostname = paths[2];
    if (hostname.length === 0) {
      throw new ERR_INVALID_ARG_VALUE(
        "filepath",
        filepath,
        "Empty UNC servername",
      );
    }

    // TODO(wafuwafu13): To be `outURL.hostname = domainToASCII(hostname)` once `domainToASCII` are implemented
    outURL.hostname = hostname;
    outURL.pathname = encodePathChars(
      paths.slice(3).join("/"),
    );
  } else {
    let resolved = path.resolve(filepath);
    // path.resolve strips trailing slashes so we must add them back
    const filePathLast = filepath.charCodeAt(filepath.length - 1);
    if (
      (filePathLast === CHAR_FORWARD_SLASH ||
        (isWindows && filePathLast === CHAR_BACKWARD_SLASH)) &&
      resolved[resolved.length - 1] !== path.sep
    ) {
      resolved += "/";
    }

    outURL.pathname = encodePathChars(resolved);
  }
  return outURL;
}

interface HttpOptions {
  protocol: string;
  hostname: string;
  hash: string;
  search: string;
  pathname: string;
  path: string;
  href: string;
  port?: number;
  auth?: string;
}

/**
 * This utility function converts a URL object into an ordinary options object as expected by the `http.request()` and `https.request()` APIs.
 * @see Tested in `parallel/test-url-urltooptions.js`.
 * @param url The `WHATWG URL` object to convert to an options object.
 * @returns HttpOptions
 * @returns HttpOptions.protocol Protocol to use.
 * @returns HttpOptions.hostname A domain name or IP address of the server to issue the request to.
 * @returns HttpOptions.hash The fragment portion of the URL.
 * @returns HttpOptions.search The serialized query portion of the URL.
 * @returns HttpOptions.pathname The path portion of the URL.
 * @returns HttpOptions.path Request path. Should include query string if any. E.G. `'/index.html?page=12'`. An exception is thrown when the request path contains illegal characters. Currently, only spaces are rejected but that may change in the future.
 * @returns HttpOptions.href The serialized URL.
 * @returns HttpOptions.port Port of remote server.
 * @returns HttpOptions.auth Basic authentication i.e. `'user:password'` to compute an Authorization header.
 */
function urlToHttpOptions(url: URL): HttpOptions {
  const options: HttpOptions = {
    protocol: url.protocol,
    hostname: typeof url.hostname === "string" &&
        url.hostname.startsWith("[")
      ? url.hostname.slice(1, -1)
      : url.hostname,
    hash: url.hash,
    search: url.search,
    pathname: url.pathname,
    path: `${url.pathname || ""}${url.search || ""}`,
    href: url.href,
  };
  if (url.port !== "") {
    options.port = Number(url.port);
  }
  if (url.username || url.password) {
    options.auth = `${decodeURIComponent(url.username)}:${
      decodeURIComponent(url.password)
    }`;
  }
  return options;
}

export default {
  format,
  fileURLToPath,
  pathToFileURL,
  urlToHttpOptions,
  URL,
};
