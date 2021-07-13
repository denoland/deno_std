// Copyright 2018-2021 the Deno authors. All rights reserved. MIT license.
import { Selector } from "./types.ts";
/**
 * Applies the given transformer to all entries in the given record and returns a new record containing the results
 *
 * Example:
 *
 * ```typescript
 * const usersById = {
 *     'a2e': { name: 'Kim', age: 22 },
 *     'dfe': { name: 'Anna', age: 31 },
 *     '34b': { name: 'Tim', age: 58 },
 * }
 * const agesByNames = mapEntries(usersById,
 *     ([ id, { name, age } ]) => [ name, age ],
 * )
 *
 * console.assert(agesByNames === {
 *     'Kim': 22,
 *     'Anna': 31,
 *     'Tim': 58,
 * })
 * ```
 */
export function mapEntries<T, O>(
  _record: Record<string, T>,
  _transformer: Selector<[string, T], [string, O]>,
): Record<string, O> {
  throw new Error("unimplemented");
}
