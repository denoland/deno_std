// Copyright 2018-2024 the Deno authors. All rights reserved. MIT license.
import { rangeIncludes } from "./range_includes.ts";
import { ANY, INVALID, MAX } from "./constants.ts";
import type { Comparator, Range, SemVer } from "./types.ts";
import { greaterThan } from "./greater_than.ts";

function comparatorMax(comparator: Comparator): SemVer {
  const semver = comparator.semver ?? comparator;
  if (semver === ANY) return MAX;
  switch (comparator.operator) {
    case "!=":
    case ">":
    case ">=":
      return MAX;
    case undefined:
    case "=":
    case "<=":
      return {
        major: semver.major,
        minor: semver.minor,
        patch: semver.patch,
        prerelease: semver.prerelease,
        build: semver.build,
      };
    case "<": {
      const patch = semver.patch - 1;
      const minor = patch >= 0 ? semver.minor : semver.minor - 1;
      const major = minor >= 0 ? semver.major : semver.major - 1;
      // if you try to do <0.0.0 it will Give you -∞.∞.∞
      // which means no SemVer can compare successfully to it.
      if (major < 0) return INVALID;

      return {
        major,
        minor: minor >= 0 ? minor : Number.POSITIVE_INFINITY,
        patch: patch >= 0 ? patch : Number.POSITIVE_INFINITY,
        prerelease: [],
        build: [],
      };
    }
  }
}

/**
 * The maximum valid SemVer for a given range or INVALID
 * @param range The range to calculate the max for
 * @returns A valid SemVer or INVALID
 */
export function rangeMax(range: Range): SemVer {
  let max;
  for (const comparators of range) {
    for (const comparator of comparators) {
      const candidate = comparatorMax(comparator);
      if (!rangeIncludes(range, candidate)) continue;
      max = (max && greaterThan(max, candidate)) ? max : candidate;
    }
  }
  return max ?? INVALID;
}
