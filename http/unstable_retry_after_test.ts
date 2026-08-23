// Copyright 2018-2026 the Deno authors. MIT license.

import { assertEquals } from "@std/assert";
import { parseRetryAfter } from "./unstable_retry_after.ts";

// 2026-08-23 is a Sunday.
const NOW = new Date(Date.UTC(2026, 7, 23, 12, 0, 0));

Deno.test("parseRetryAfter() returns null for a missing header", () => {
  assertEquals(parseRetryAfter(null), null);
});

Deno.test("parseRetryAfter() returns null for an empty value", () => {
  assertEquals(parseRetryAfter(""), null);
});

Deno.test("parseRetryAfter() parses delta-seconds", () => {
  assertEquals(parseRetryAfter("120"), 120_000);
  assertEquals(parseRetryAfter("0"), 0);
});

Deno.test("parseRetryAfter() rejects malformed delta-seconds", () => {
  assertEquals(parseRetryAfter("-1"), null);
  assertEquals(parseRetryAfter("1.5"), null);
  assertEquals(parseRetryAfter(" 120"), null);
  assertEquals(parseRetryAfter("120 "), null);
});

Deno.test("parseRetryAfter() accepts the largest exactly representable delta-seconds", () => {
  // 9007199254740 * 1000 is the largest safe-integer millisecond result.
  assertEquals(parseRetryAfter("9007199254740"), 9_007_199_254_740_000);
});

Deno.test("parseRetryAfter() returns null when delta-seconds overflow", () => {
  assertEquals(parseRetryAfter("9007199254741"), null);
  assertEquals(parseRetryAfter("99999999999999999999"), null);
});

Deno.test("parseRetryAfter() parses an IMF-fixdate", () => {
  assertEquals(
    parseRetryAfter("Sun, 23 Aug 2026 12:02:00 GMT", { now: NOW }),
    120_000,
  );
});

Deno.test("parseRetryAfter() parses an RFC 850 date", () => {
  assertEquals(
    parseRetryAfter("Sunday, 23-Aug-26 12:02:00 GMT", { now: NOW }),
    120_000,
  );
});

Deno.test("parseRetryAfter() parses an asctime date", () => {
  assertEquals(
    parseRetryAfter("Sun Aug 23 12:02:00 2026", { now: NOW }),
    120_000,
  );
});

Deno.test("parseRetryAfter() parses an asctime date with a space-padded day", () => {
  // 2026-08-06 is a Thursday and 17 days before NOW.
  assertEquals(
    parseRetryAfter("Thu Aug  6 12:00:00 2026", { now: NOW }),
    0,
  );
});

Deno.test("parseRetryAfter() keeps an RFC 850 year exactly 50 years in the future", () => {
  // 2076-08-23T12:00:00Z is exactly, not more than, 50 years after NOW.
  assertEquals(
    parseRetryAfter("Sunday, 23-Aug-76 12:00:00 GMT", { now: NOW }),
    Date.UTC(2076, 7, 23, 12, 0, 0) - NOW.getTime(),
  );
});

Deno.test("parseRetryAfter() resolves an RFC 850 year more than 50 years in the future to the past", () => {
  // 2076-08-23T12:00:01Z is more than 50 years after NOW, so the year
  // resolves to 1976, in which August 23 was a Monday.
  assertEquals(
    parseRetryAfter("Monday, 23-Aug-76 12:00:01 GMT", { now: NOW }),
    0,
  );
});

Deno.test("parseRetryAfter() normalizes a leap second to the following instant", () => {
  const now = new Date(Date.UTC(2016, 11, 31, 23, 59, 0));
  assertEquals(
    parseRetryAfter("Sat, 31 Dec 2016 23:59:60 GMT", { now }),
    60_000,
  );
});

Deno.test("parseRetryAfter() clamps a past date to 0", () => {
  assertEquals(
    parseRetryAfter("Sun, 06 Nov 1994 08:49:37 GMT", { now: NOW }),
    0,
  );
});

Deno.test("parseRetryAfter() rejects invalid calendar components", () => {
  // November has 30 days.
  assertEquals(
    parseRetryAfter("Mon, 31 Nov 2026 12:00:00 GMT", { now: NOW }),
    null,
  );
  // 2027 is not a leap year.
  assertEquals(
    parseRetryAfter("Mon, 29 Feb 2027 12:00:00 GMT", { now: NOW }),
    null,
  );
  assertEquals(
    parseRetryAfter("Sun, 00 Nov 2026 12:00:00 GMT", { now: NOW }),
    null,
  );
});

Deno.test("parseRetryAfter() rejects invalid time components", () => {
  assertEquals(
    parseRetryAfter("Sun, 23 Aug 2026 24:00:00 GMT", { now: NOW }),
    null,
  );
  assertEquals(
    parseRetryAfter("Sun, 23 Aug 2026 12:60:00 GMT", { now: NOW }),
    null,
  );
  assertEquals(
    parseRetryAfter("Sun, 23 Aug 2026 12:00:61 GMT", { now: NOW }),
    null,
  );
});

Deno.test("parseRetryAfter() rejects years below 1900", () => {
  // 1899-01-01 was a Sunday, so only the year is invalid.
  assertEquals(
    parseRetryAfter("Sun, 01 Jan 1899 00:00:00 GMT", { now: NOW }),
    null,
  );
});

Deno.test("parseRetryAfter() rejects a weekday that disagrees with the date", () => {
  assertEquals(
    parseRetryAfter("Mon, 23 Aug 2026 12:00:00 GMT", { now: NOW }),
    null,
  );
});

Deno.test("parseRetryAfter() rejects wrong casing", () => {
  assertEquals(
    parseRetryAfter("sun, 23 Aug 2026 12:00:00 GMT", { now: NOW }),
    null,
  );
  assertEquals(
    parseRetryAfter("Sun, 23 AUG 2026 12:00:00 GMT", { now: NOW }),
    null,
  );
  assertEquals(
    parseRetryAfter("Sun, 23 Aug 2026 12:00:00 gmt", { now: NOW }),
    null,
  );
});

Deno.test("parseRetryAfter() rejects wrong spacing", () => {
  assertEquals(
    parseRetryAfter("Sun,23 Aug 2026 12:00:00 GMT", { now: NOW }),
    null,
  );
  assertEquals(
    parseRetryAfter("Sun, 23  Aug 2026 12:00:00 GMT", { now: NOW }),
    null,
  );
  assertEquals(
    parseRetryAfter("Sun, 23 Aug 2026 12:00:00 GMT ", { now: NOW }),
    null,
  );
  // asctime requires a space-padded single-digit day.
  assertEquals(
    parseRetryAfter("Thu Aug 6 12:00:00 2026", { now: NOW }),
    null,
  );
});

Deno.test("parseRetryAfter() rejects garbage", () => {
  assertEquals(parseRetryAfter("tomorrow", { now: NOW }), null);
  assertEquals(parseRetryAfter("120 seconds", { now: NOW }), null);
});

Deno.test("parseRetryAfter() returns null for a date with an invalid now", () => {
  assertEquals(
    parseRetryAfter("Sun, 23 Aug 2026 12:02:00 GMT", { now: new Date(NaN) }),
    null,
  );
});

Deno.test("parseRetryAfter() parses delta-seconds despite an invalid now", () => {
  assertEquals(parseRetryAfter("120", { now: new Date(NaN) }), 120_000);
});
