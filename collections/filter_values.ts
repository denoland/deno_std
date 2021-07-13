// Copyright 2018-2021 the Deno authors. All rights reserved. MIT license.
import { Predicate } from "./types.ts";
/**
 * Returns a new record with all entries of the given record except the ones that have a value that does not match the given predicate
 *
 * Example:
 *
 * ```typescript
 * const people = {
 *     'Arnold': 37,
 *     'Sarah': 7,
 *     'Kim': 23,
 * }
 * const adults = filterValues(people, it => it.age >= 18)
 *
 * console.assert(adults === {
 *     'Arnold': 37,
 *     'Kim': 23,
 * })
 * ```
 */
export function filterValues<T>(
  _record: Record<string, T>,
  _predicate: Predicate<T>,
): Record<string, T> {
  throw new Error("unimplemented");
}
