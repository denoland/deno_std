// Copyright 2018-2024 the Deno authors. All rights reserved. MIT license.
// This module is browser compatible.

function isYearNumberALeapYear(yearNumber: number): boolean {
  return (
    (yearNumber % 4 === 0 && yearNumber % 100 !== 0) || yearNumber % 400 === 0
  );
}

/**
 * Returns whether the given year is a leap year. Passing in a
 * {@linkcode Date} object will return the leap year status of the year of that
 * object and take the current timezone into account. Passing in a number will
 * return the leap year status of that number.
 *
 * This is based on
 * {@link https://docs.microsoft.com/en-us/office/troubleshoot/excel/determine-a-leap-year}.
 *
 * @param year The year in number or `Date` format.
 * @returns `true` if the given year is a leap year; `false` otherwise.
 *
 * @example Passing `Date` objects
 * ```ts
 * import { isLeap } from "https://deno.land/std@$STD_VERSION/datetime/is_leap.ts";
 *
 * isLeap(new Date("1970-01-02")); // false
 *
 * isLeap(new Date("1972-01-02")); // true
 * ```
 *
 * @example Passing number values
 * ```ts
 * import { isLeap } from "https://deno.land/std@$STD_VERSION/datetime/is_leap.ts";
 *
 * isLeap(1970); // false
 *
 * isLeap(1972); // true
 * ```
 *
 * @example Accounting for timezones
 * ```ts
 * import { isLeap } from "https://deno.land/std@$STD_VERSION/datetime/is_leap.ts";
 *
 * isLeap(new Date("2000-01-01"));
 * // true if the local timezone is GMT+0; false if the local timezone is GMT-1
 *
 * isLeap(2000);
 * // true regardless of the local timezone
 * ```
 */
export function isLeap(year: Date | number): boolean {
  const yearNumber = year instanceof Date ? year.getFullYear() : year;
  return isYearNumberALeapYear(yearNumber);
}

/**
 * Returns whether the given year is a leap year in UTC time. This always
 * returns the same value regardless of the local timezone.

 * This is based on
 * {@link https://docs.microsoft.com/en-us/office/troubleshoot/excel/determine-a-leap-year}.
 *
 * @param year The year in number or `Date` format.
 * @returns `true` if the given year is a leap year; `false` otherwise.
 *
 * @example Passing `Date` objects
 * ```ts
 * import { isUtcLeap } from "https://deno.land/std@$STD_VERSION/datetime/is_leap.ts";
 *
 * isUtcLeap(new Date("2000-01-01")); // true
 *
 * isUtcLeap(new Date("December 31, 1999 23:59:59 GMT-01:00")); // true
 * ```
 *
 * @example Passing number values
 * ```ts
 * import { isUtcLeap } from "https://deno.land/std@$STD_VERSION/datetime/is_leap.ts";
 *
 * isUtcLeap(2000); // true
 *
 * isUtcLeap(1999); // false
 * ```
 */
export function isUtcLeap(year: Date | number): boolean {
  const yearNumber = year instanceof Date ? year.getUTCFullYear() : year;
  return isYearNumberALeapYear(yearNumber);
}
