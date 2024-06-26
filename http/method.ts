// Copyright 2018-2024 the Deno authors. All rights reserved. MIT license.
// This module is browser compatible.
// This module is generated from {@link https://www.iana.org/assignments/http-methods/http-methods.xhtml#methods | IANA Hypertext Transfer Protocol (HTTP) Method Registry}

/**
 * HTTP Methods as defined by RFC 9110
 *
 * @see {@link https://www.iana.org/go/rfc9110 | RFC9110, Section 9.3}
 */
export const HttpMethodRfc9110 = {
  /**
   * DELETE (Safe: no; Idempotent: yes)
   *
   * @see {@link https://www.iana.org/go/rfc9110 | RFC9110, Section 9.3.5}
   */
  Delete: "DELETE",

  /**
   * GET (Safe: yes; Idempotent: yes)
   *
   * @see {@link https://www.iana.org/go/rfc9110 | RFC9110, Section 9.3.1}
   */
  Get: "GET",

  /**
   * HEAD (Safe: yes; Idempotent: yes)
   *
   * @see {@link https://www.iana.org/go/rfc9110 | RFC9110, Section 9.3.2}
   */
  Head: "HEAD",

  /**
   * CONNECT (Safe: no; Idempotent: no)
   *
   * @see {@link https://www.iana.org/go/rfc9110 | RFC9110, Section 9.3.6}
   */
  Connect: "CONNECT",

  /**
   * OPTIONS (Safe: yes; Idempotent: yes)
   *
   * @see {@link https://www.iana.org/go/rfc9110 | RFC9110, Section 9.3.7}
   */
  Options: "OPTIONS",

  /**
   * POST (Safe: no; Idempotent: no)
   *
   * @see {@link https://www.iana.org/go/rfc9110 | RFC9110, Section 9.3.3}
   */
  Post: "POST",

  /**
   * PUT (Safe: no; Idempotent: yes)
   *
   * @see {@link https://www.iana.org/go/rfc9110 | RFC9110, Section 9.3.4}
   */
  Put: "PUT",

  /**
   * TRACE (Safe: yes; Idempotent: yes)
   *
   * @see {@link https://www.iana.org/go/rfc9110 | RFC9110, Section 9.3.8}
   */
  Trace: "TRACE",
};

export type HttpMethodRfc9110 =
  typeof HttpMethodRfc9110[keyof typeof HttpMethodRfc9110];

/**
 * HTTP Methods as defined by IANA Hypertext Transfer Protocol (HTTP) Method Registry
 *
 * @see {@link https://www.iana.org/assignments/http-methods/http-methods.xhtml#methods | IANA Hypertext Transfer Protocol (HTTP) Method Registry}
 */
export const HttpMethodIana = {
  /**
   * ACL (Safe: no; Idempotent: yes)
   *
   * @see {@link https://www.iana.org/go/rfc3744 | RFC3744, Section 8.1}
   */
  Acl: "ACL",

  /**
   * BASELINE-CONTROL (Safe: no; Idempotent: yes)
   *
   * @see {@link https://www.iana.org/go/rfc3253 | RFC3253, Section 12.6}
   */
  BaselineControl: "BASELINE-CONTROL",

  /**
   * BIND (Safe: no; Idempotent: yes)
   *
   * @see {@link https://www.iana.org/go/rfc5842 | RFC5842, Section 4}
   */
  Bind: "BIND",

  /**
   * CHECKIN (Safe: no; Idempotent: yes)
   *
   * @see {@link https://www.iana.org/go/rfc3253 | RFC3253, Section 4.4, Section 9.4}
   */
  Checkin: "CHECKIN",

  /**
   * CHECKOUT (Safe: no; Idempotent: yes)
   *
   * @see {@link https://www.iana.org/go/rfc3253 | RFC3253, Section 4.3, Section 8.8}
   */
  Checkout: "CHECKOUT",

  /**
   * CONNECT (Safe: no; Idempotent: no)
   *
   * @see {@link https://www.iana.org/go/rfc9110 | RFC9110, Section 9.3.6}
   */
  Connect: "CONNECT",

  /**
   * COPY (Safe: no; Idempotent: yes)
   *
   * @see {@link https://www.iana.org/go/rfc4918 | RFC4918, Section 9.8}
   */
  Copy: "COPY",

  /**
   * LABEL (Safe: no; Idempotent: yes)
   *
   * @see {@link https://www.iana.org/go/rfc3253 | RFC3253, Section 8.2}
   */
  Label: "LABEL",

  /**
   * LINK (Safe: no; Idempotent: yes)
   *
   * @see {@link https://www.iana.org/go/rfc2068 | RFC2068, Section 19.6.1.2}
   */
  Link: "LINK",

  /**
   * LOCK (Safe: no; Idempotent: no)
   *
   * @see {@link https://www.iana.org/go/rfc4918 | RFC4918, Section 9.10}
   */
  Lock: "LOCK",

  /**
   * MERGE (Safe: no; Idempotent: yes)
   *
   * @see {@link https://www.iana.org/go/rfc3253 | RFC3253, Section 11.2}
   */
  Merge: "MERGE",

  /**
   * MKACTIVITY (Safe: no; Idempotent: yes)
   *
   * @see {@link https://www.iana.org/go/rfc3253 | RFC3253, Section 13.5}
   */
  Mkactivity: "MKACTIVITY",

  /**
   * MKCALENDAR (Safe: no; Idempotent: yes)
   *
   * @see {@link https://www.iana.org/go/rfc4791 | RFC4791, Section 5.3.1}
   * @see {@link https://www.iana.org/go/rfc8144 | RFC8144, Section 2.3}
   */
  Mkcalendar: "MKCALENDAR",

  /**
   * MKCOL (Safe: no; Idempotent: yes)
   *
   * @see {@link https://www.iana.org/go/rfc4918 | RFC4918, Section 9.3}
   * @see {@link https://www.iana.org/go/rfc5689 | RFC5689, Section 3}
   * @see {@link https://www.iana.org/go/rfc8144 | RFC8144, Section 2.3}
   */
  Mkcol: "MKCOL",

  /**
   * MKREDIRECTREF (Safe: no; Idempotent: yes)
   *
   * @see {@link https://www.iana.org/go/rfc4437 | RFC4437, Section 6}
   */
  Mkredirectref: "MKREDIRECTREF",

  /**
   * MKWORKSPACE (Safe: no; Idempotent: yes)
   *
   * @see {@link https://www.iana.org/go/rfc3253 | RFC3253, Section 6.3}
   */
  Mkworkspace: "MKWORKSPACE",

  /**
   * MOVE (Safe: no; Idempotent: yes)
   *
   * @see {@link https://www.iana.org/go/rfc4918 | RFC4918, Section 9.9}
   */
  Move: "MOVE",

  /**
   * OPTIONS (Safe: yes; Idempotent: yes)
   *
   * @see {@link https://www.iana.org/go/rfc9110 | RFC9110, Section 9.3.7}
   */
  Options: "OPTIONS",

  /**
   * ORDERPATCH (Safe: no; Idempotent: yes)
   *
   * @see {@link https://www.iana.org/go/rfc3648 | RFC3648, Section 7}
   */
  Orderpatch: "ORDERPATCH",

  /**
   * PATCH (Safe: no; Idempotent: no)
   *
   * @see {@link https://www.iana.org/go/rfc5789 | RFC5789, Section 2}
   */
  Patch: "PATCH",

  /**
   * POST (Safe: no; Idempotent: no)
   *
   * @see {@link https://www.iana.org/go/rfc9110 | RFC9110, Section 9.3.3}
   */
  Post: "POST",

  /**
   * PRI (Safe: yes; Idempotent: yes)
   *
   * @see {@link https://www.iana.org/go/rfc9113 | RFC9113, Section 3.4}
   */
  Pri: "PRI",

  /**
   * PROPFIND (Safe: yes; Idempotent: yes)
   *
   * @see {@link https://www.iana.org/go/rfc4918 | RFC4918, Section 9.1}
   * @see {@link https://www.iana.org/go/rfc8144 | RFC8144, Section 2.1}
   */
  Propfind: "PROPFIND",

  /**
   * PROPPATCH (Safe: no; Idempotent: yes)
   *
   * @see {@link https://www.iana.org/go/rfc4918 | RFC4918, Section 9.2}
   * @see {@link https://www.iana.org/go/rfc8144 | RFC8144, Section 2.2}
   */
  Proppatch: "PROPPATCH",

  /**
   * PUT (Safe: no; Idempotent: yes)
   *
   * @see {@link https://www.iana.org/go/rfc9110 | RFC9110, Section 9.3.4}
   */
  Put: "PUT",

  /**
   * REBIND (Safe: no; Idempotent: yes)
   *
   * @see {@link https://www.iana.org/go/rfc5842 | RFC5842, Section 6}
   */
  Rebind: "REBIND",

  /**
   * REPORT (Safe: yes; Idempotent: yes)
   *
   * @see {@link https://www.iana.org/go/rfc3253 | RFC3253, Section 3.6}
   * @see {@link https://www.iana.org/go/rfc8144 | RFC8144, Section 2.1}
   */
  Report: "REPORT",

  /**
   * SEARCH (Safe: yes; Idempotent: yes)
   *
   * @see {@link https://www.iana.org/go/rfc5323 | RFC5323, Section 2}
   */
  Search: "SEARCH",

  /**
   * TRACE (Safe: yes; Idempotent: yes)
   *
   * @see {@link https://www.iana.org/go/rfc9110 | RFC9110, Section 9.3.8}
   */
  Trace: "TRACE",

  /**
   * UNBIND (Safe: no; Idempotent: yes)
   *
   * @see {@link https://www.iana.org/go/rfc5842 | RFC5842, Section 5}
   */
  Unbind: "UNBIND",

  /**
   * UNCHECKOUT (Safe: no; Idempotent: yes)
   *
   * @see {@link https://www.iana.org/go/rfc3253 | RFC3253, Section 4.5}
   */
  Uncheckout: "UNCHECKOUT",

  /**
   * UNLINK (Safe: no; Idempotent: yes)
   *
   * @see {@link https://www.iana.org/go/rfc2068 | RFC2068, Section 19.6.1.3}
   */
  Unlink: "UNLINK",

  /**
   * UNLOCK (Safe: no; Idempotent: yes)
   *
   * @see {@link https://www.iana.org/go/rfc4918 | RFC4918, Section 9.11}
   */
  Unlock: "UNLOCK",

  /**
   * UPDATE (Safe: no; Idempotent: yes)
   *
   * @see {@link https://www.iana.org/go/rfc3253 | RFC3253, Section 7.1}
   */
  Update: "UPDATE",

  /**
   * UPDATEREDIRECTREF (Safe: no; Idempotent: yes)
   *
   * @see {@link https://www.iana.org/go/rfc4437 | RFC4437, Section 7}
   */
  Updateredirectref: "UPDATEREDIRECTREF",

  /**
   * VERSION-CONTROL (Safe: no; Idempotent: yes)
   *
   * @see {@link https://www.iana.org/go/rfc3253 | RFC3253, Section 3.5}
   */
  VersionControl: "VERSION-CONTROL",
} as const;

export type HttpMethodIana = typeof HttpMethodIana[keyof typeof HttpMethodIana];

/**
 * HTTP Methods combined from all collections
 *
 * @see {@link https://www.iana.org/go/rfc9110 | RFC9110, Section 9.3}
 * @see {@link https://www.iana.org/assignments/http-methods/http-methods.xhtml#methods | IANA Hypertext Transfer Protocol (HTTP) Method Registry}
 */
export const HttpMethod = {
  ...HttpMethodRfc9110,
  ...HttpMethodIana,
} as const;

export type HttpMethod = typeof HttpMethod[keyof typeof HttpMethod];
