// Copyright 2018-2022 the Deno authors. All rights reserved. MIT license.

import {
  readRange as _readRange,
  readRangeSync as _readRangeSync,
} from "./read_range.ts";

/** @deprecated (will be removed after 0.170.0) Import from `std/io/read_range.ts` instead */
export interface ByteRange {
  /** The 0 based index of the start byte for a range. */
  start: number;

  /** The 0 based index of the end byte for a range, which is inclusive. */
  end: number;
}

/**
 * @deprecated (will be removed after 0.170.0) Import from `std/io/read_range.ts` instead
 *
 * Read a range of bytes from a file or other resource that is readable and
 * seekable.  The range start and end are inclusive of the bytes within that
 * range.
 *
 * @example
 * ```ts
 * import { assertEquals } from "https://deno.land/std@$STD_VERSION/testing/asserts.ts";
 * import { readRange } from "https://deno.land/std@$STD_VERSION/io/files.ts";
 *
 * // Read the first 10 bytes of a file
 * const file = await Deno.open("example.txt", { read: true });
 * const bytes = await readRange(file, { start: 0, end: 9 });
 * assertEquals(bytes.length, 10);
 * ```
 */
export const readRange = _readRange;

/**
 * @deprecated (will be removed after 0.170.0) Import from `std/io/read_range.ts` instead
 *
 * Read a range of bytes synchronously from a file or other resource that is
 * readable and seekable.  The range start and end are inclusive of the bytes
 * within that range.
 *
 * @example
 * ```ts
 * import { assertEquals } from "https://deno.land/std@$STD_VERSION/testing/asserts.ts";
 * import { readRangeSync } from "https://deno.land/std@$STD_VERSION/io/files.ts";
 *
 * // Read the first 10 bytes of a file
 * const file = Deno.openSync("example.txt", { read: true });
 * const bytes = readRangeSync(file, { start: 0, end: 9 });
 * assertEquals(bytes.length, 10);
 * ```
 */
export const readRangeSync = _readRangeSync;
