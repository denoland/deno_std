// Copyright 2018-2021 the Deno authors. All rights reserved. MIT license.
import { Predicate } from "./types.ts";
/**
 * Returns a new record with all entries of the given record except the ones that do not match the given predicate
 *
 * Example:
 *
 * ```typescript
 * const menu = {
 *     'Salad': 11,
 *     'Soup': 8,
 *     'Pasta': 13,
 * }
 * const myOptions = filterEntries(menu,
 *     ([ item, price ]) => item !== 'Pasta' && price < 10,
 * )
 *
 * console.assert(myOptions === {
 *     'Soup': 8,
 * })
 * ```
 */
export function filterEntries<T>(
  record: Record<string, T>,
  predicate: Predicate<[string, T]>,
): Record<string, T> {
  const ret: Record<string, T> = {};
  const entries = Object.entries(record);

  entries.forEach(([key, value]) => {
    if (predicate([key, value])) {
      ret[key] = value;
    }
  });

  return ret;
}
