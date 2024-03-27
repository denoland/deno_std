// Copyright 2018-2024 the Deno authors. All rights reserved. MIT license.
import { rangeIncludes } from "./range_includes.ts";
import { ANY, INVALID, MAX, MIN } from "./constants.ts";
import type { Comparator, Range, SemVer } from "./types.ts";
import { lessThan } from "./less_than.ts";
import { greaterThan } from "./greater_than.ts";
import { increment } from "./increment.ts";

function comparatorMin(comparator: Comparator): SemVer {
  const semver = comparator.semver ?? comparator;
  if (semver === ANY) return MIN;
  switch (comparator.operator) {
    case ">":
      return semver.prerelease && semver.prerelease.length > 0
        ? increment(semver, "pre")
        : increment(semver, "patch");
    case "!=":
    case "<=":
    case "<":
      // The min(<0.0.0) is MAX
      return greaterThan(semver, MIN) ? MIN : MAX;
    case ">=":
    case undefined:
    case "=":
      return {
        major: semver.major,
        minor: semver.minor,
        patch: semver.patch,
        prerelease: semver.prerelease,
        build: semver.build,
      };
  }
}

/**
 * The minimum valid SemVer for a given range or INVALID
 * @param range The range to calculate the min for
 * @returns A valid SemVer or INVALID
 */
export function rangeMin(range: Range): SemVer {
  let min;
  for (const comparators of range) {
    for (const comparator of comparators) {
      const candidate = comparatorMin(comparator);
      if (!rangeIncludes(range, candidate)) continue;
      min = (min && lessThan(min, candidate)) ? min : candidate;
    }
  }
  return min ?? INVALID;
}
