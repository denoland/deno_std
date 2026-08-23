// Copyright 2018-2026 the Deno authors. MIT license.
// This module is browser compatible.

/**
 * Parsing of the `Retry-After` HTTP header per
 * {@link https://www.rfc-editor.org/rfc/rfc9110#section-10.2.3 | RFC 9110 Section 10.2.3}.
 *
 * The header value is either a number of seconds (`delta-seconds`) or an
 * HTTP-date. {@linkcode parseRetryAfter} accepts both forms and returns the
 * number of milliseconds to wait, or `null` when the value cannot be parsed.
 *
 * @example Honor `Retry-After` from a 429 response
 * ```ts
 * import { parseRetryAfter } from "@std/http/unstable-retry-after";
 * import { assertEquals } from "@std/assert";
 *
 * const response = new Response(null, {
 *   status: 429,
 *   headers: { "retry-after": "120" },
 * });
 *
 * const delay = parseRetryAfter(response.headers.get("retry-after")) ?? 1000;
 * assertEquals(delay, 120_000);
 * ```
 *
 * @experimental **UNSTABLE**: New API, yet to be vetted.
 *
 * @module
 */

const DAY_NAMES = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const LONG_DAY_NAMES = [
  "Sunday",
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
];
const MONTH_NAMES = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "May",
  "Jun",
  "Jul",
  "Aug",
  "Sep",
  "Oct",
  "Nov",
  "Dec",
];

const DELTA_SECONDS_REGEXP = /^\d+$/;
// HTTP-date grammars from RFC 9110 Section 5.6.7. Each form is matched
// exactly, including casing and spacing.
const IMF_FIXDATE_REGEXP =
  /^(Sun|Mon|Tue|Wed|Thu|Fri|Sat), (\d{2}) (Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec) (\d{4}) (\d{2}):(\d{2}):(\d{2}) GMT$/;
const RFC_850_DATE_REGEXP =
  /^(Sunday|Monday|Tuesday|Wednesday|Thursday|Friday|Saturday), (\d{2})-(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)-(\d{2}) (\d{2}):(\d{2}):(\d{2}) GMT$/;
const ASCTIME_DATE_REGEXP =
  /^(Sun|Mon|Tue|Wed|Thu|Fri|Sat) (Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec) (\d{2}| \d) (\d{2}):(\d{2}):(\d{2}) (\d{4})$/;

/**
 * Validates calendar components and converts them to a UTC timestamp.
 *
 * Second `60` (a leap second) normalizes to the following instant because
 * JavaScript `Date` does not represent leap seconds.
 */
function toTimestamp(
  weekdayIndex: number,
  year: number,
  monthIndex: number,
  day: number,
  hours: number,
  minutes: number,
  seconds: number,
): number | null {
  if (year < 1900) return null;
  if (hours > 23 || minutes > 59 || seconds > 60) return null;
  const daysInMonth = new Date(Date.UTC(year, monthIndex + 1, 0)).getUTCDate();
  if (day < 1 || day > daysInMonth) return null;
  if (new Date(Date.UTC(year, monthIndex, day)).getUTCDay() !== weekdayIndex) {
    return null;
  }
  return Date.UTC(year, monthIndex, day, hours, minutes, seconds);
}

/**
 * Resolves an RFC 850 two-digit year against `now`. Per RFC 9110 Section
 * 5.6.7, a timestamp that would be more than 50 years in the future is
 * interpreted as the most recent past year with the same final two digits.
 */
function resolveTwoDigitYear(
  twoDigitYear: number,
  monthIndex: number,
  day: number,
  hours: number,
  minutes: number,
  seconds: number,
  nowMs: number,
): number {
  const now = new Date(nowMs);
  const year = Math.floor(now.getUTCFullYear() / 100) * 100 + twoDigitYear;
  const threshold = Date.UTC(
    now.getUTCFullYear() + 50,
    now.getUTCMonth(),
    now.getUTCDate(),
    now.getUTCHours(),
    now.getUTCMinutes(),
    now.getUTCSeconds(),
    now.getUTCMilliseconds(),
  );
  const candidate = Date.UTC(year, monthIndex, day, hours, minutes, seconds);
  return candidate > threshold ? year - 100 : year;
}

function parseHttpDate(value: string, nowMs: number): number | null {
  const imf = IMF_FIXDATE_REGEXP.exec(value);
  if (imf) {
    const [, dayName, day, monthName, year, hours, minutes, seconds] = imf;
    return toTimestamp(
      DAY_NAMES.indexOf(dayName!),
      Number(year),
      MONTH_NAMES.indexOf(monthName!),
      Number(day),
      Number(hours),
      Number(minutes),
      Number(seconds),
    );
  }
  const rfc850 = RFC_850_DATE_REGEXP.exec(value);
  if (rfc850) {
    const [, dayName, day, monthName, twoDigitYear, hours, minutes, seconds] =
      rfc850;
    const monthIndex = MONTH_NAMES.indexOf(monthName!);
    const year = resolveTwoDigitYear(
      Number(twoDigitYear),
      monthIndex,
      Number(day),
      Number(hours),
      Number(minutes),
      Number(seconds),
      nowMs,
    );
    return toTimestamp(
      LONG_DAY_NAMES.indexOf(dayName!),
      year,
      monthIndex,
      Number(day),
      Number(hours),
      Number(minutes),
      Number(seconds),
    );
  }
  const asctime = ASCTIME_DATE_REGEXP.exec(value);
  if (asctime) {
    const [, dayName, monthName, day, hours, minutes, seconds, year] = asctime;
    return toTimestamp(
      DAY_NAMES.indexOf(dayName!),
      Number(year),
      MONTH_NAMES.indexOf(monthName!),
      Number(day),
      Number(hours),
      Number(minutes),
      Number(seconds),
    );
  }
  return null;
}

/**
 * Options for {@linkcode parseRetryAfter}.
 *
 * @experimental **UNSTABLE**: New API, yet to be vetted.
 */
export interface ParseRetryAfterOptions {
  /**
   * The reference time used to convert an HTTP-date into a delay and to
   * resolve RFC 850 two-digit years.
   *
   * @default {new Date()}
   */
  now?: Date;
}

/**
 * Parses the value of a
 * {@link https://www.rfc-editor.org/rfc/rfc9110#section-10.2.3 | Retry-After}
 * header into the number of milliseconds to wait.
 *
 * Accepts `delta-seconds` as well as the IMF-fixdate, RFC 850, and asctime
 * HTTP-date forms defined in
 * {@link https://www.rfc-editor.org/rfc/rfc9110#section-5.6.7 | RFC 9110 Section 5.6.7}.
 * An HTTP-date in the past yields `0`. Returns `null` for a missing header,
 * invalid syntax, an unrepresentable delay, or an HTTP-date paired with an
 * invalid `now`. Never throws for header input.
 *
 * @experimental **UNSTABLE**: New API, yet to be vetted.
 *
 * @param value The `Retry-After` header value, or `null` when the header is
 * absent.
 * @param options Parse options.
 * @returns The number of milliseconds to wait from `options.now`, or `null`
 * when the value cannot be parsed.
 *
 * @example Delta-seconds
 * ```ts
 * import { parseRetryAfter } from "@std/http/unstable-retry-after";
 * import { assertEquals } from "@std/assert";
 *
 * assertEquals(parseRetryAfter("120"), 120_000);
 * assertEquals(parseRetryAfter("tomorrow"), null);
 * ```
 *
 * @example HTTP-date
 * ```ts
 * import { parseRetryAfter } from "@std/http/unstable-retry-after";
 * import { assertEquals } from "@std/assert";
 *
 * const now = new Date(Date.UTC(2026, 7, 23, 12, 0, 0));
 * assertEquals(
 *   parseRetryAfter("Sun, 23 Aug 2026 12:02:00 GMT", { now }),
 *   120_000,
 * );
 * ```
 */
export function parseRetryAfter(
  value: string | null,
  options?: ParseRetryAfterOptions,
): number | null {
  if (value === null) return null;
  if (DELTA_SECONDS_REGEXP.test(value)) {
    const seconds = Number(value);
    const milliseconds = seconds * 1000;
    if (
      !Number.isSafeInteger(seconds) || !Number.isSafeInteger(milliseconds)
    ) {
      return null;
    }
    return milliseconds;
  }
  const nowMs = (options?.now ?? new Date()).getTime();
  if (Number.isNaN(nowMs)) return null;
  const timestamp = parseHttpDate(value, nowMs);
  if (timestamp === null) return null;
  return Math.max(0, timestamp - nowMs);
}
