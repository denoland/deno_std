// Copyright 2018-2021 the Deno authors. All rights reserved. MIT license.
import { Selector } from "./types.ts";

/**
 * Applies the given transformer to all keys in the given record's entries and returns a new record containing the
 * transformed entries.
 *
 * If the transformed entries contain the same key multiple times, only the last one will appear in the returned record.
 *
 * Example:
 *
 * ```typescript
 * const counts = { a: 5, b: 3, c: 8 }
 *
 * console.assert(mapKeys(counts, it => it.toUppercase()) === {
 *     A: 5,
 *     B: 3,
 *     C: 8,
 * })
 * ```
 */
export function mapKeys<T>(
  _record: Record<string, T>,
  _transformer: Selector<string, string>,
): Record<string, T> {
  throw new Error("unimplemented");
}
