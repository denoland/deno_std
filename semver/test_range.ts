// Copyright 2018-2024 the Deno authors. All rights reserved. MIT license.

import type { Range, SemVer } from "./types.ts";
import { testComparatorSet } from "./_test_comparator_set.ts";

/**
 * Test to see if the version satisfies the range.
 * @param version The version to test
 * @param range The range to check
 * @returns true if the version is in the range
 */
export function testRange(
  version: SemVer,
  range: Range,
): boolean {
  return range.some((set) => testComparatorSet(version, set));
}
