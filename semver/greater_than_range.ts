// Copyright 2018-2024 the Deno authors. All rights reserved. MIT license.

import type { Comparator, Range, SemVer } from "./types.ts";
import { testComparatorSet } from "./_test_comparator_set.ts";
import { isWildcardComparator } from "./_shared.ts";
import { compare } from "./compare.ts";

/** Check if the semver is greater than the range. */
export function greaterThanRange(semver: SemVer, range: Range): boolean {
  return range.every((comparatorSet) =>
    greaterThanComparatorSet(semver, comparatorSet)
  );
}

function greaterThanComparatorSet(
  semver: SemVer,
  comparatorSet: Comparator[],
): boolean {
  // If the comparator set contains wildcard, then the semver is not greater than the range.
  if (comparatorSet.some(isWildcardComparator)) return false;
  // If the semver satisfies the comparator set, then it's not greater than the range.
  if (testComparatorSet(semver, comparatorSet)) return false;
  // If the semver is less than any of the comparator set, then it's not greater than the range.
  if (
    comparatorSet.some((comparator) => lessThanComparator(semver, comparator))
  ) return false;
  return true;
}

function lessThanComparator(semver: SemVer, comparator: Comparator): boolean {
  const cmp = compare(semver, comparator);
  switch (comparator.operator) {
    case "=":
    case undefined:
      return cmp < 0;
    case "!=":
      return false;
    case ">":
      return cmp <= 0;
    case "<":
      return false;
    case ">=":
      return cmp < 0;
    case "<=":
      return false;
  }
}
