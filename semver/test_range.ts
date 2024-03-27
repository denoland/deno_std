// Copyright 2018-2024 the Deno authors. All rights reserved. MIT license.
import { rangeIncludes } from "./range_includes.ts";
import type { Range, SemVer } from "./types.ts";

/**
 * Test to see if the version satisfies the range.
 * @param version The version to test
 * @param range The range to check
 * @returns true if the version is in the range
 * @deprecated (will be removed after 0.217.0) Use {@linkcode rangeIncludes} instead.
 */
export function testRange(version: SemVer, range: Range): boolean {
  return rangeIncludes(range, version);
}
