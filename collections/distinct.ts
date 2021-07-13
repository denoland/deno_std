// Copyright 2018-2021 the Deno authors. All rights reserved. MIT license.

/**
 * Returns all distinct elements in the given array, preserving order by first occurence
 *
 * Example:
 *
 * ```typescript
 * const numbers = [ 3, 2, 5, 2, 5 ]
 * const distinctNumbers = distinct(numbers)
 *
 * console.assert(distinctNumbers === [ 3, 2, 5 ])
 * ```
 */
export function distinct<T>(array: Array<T>): Array<T> {
  const set = new Set(array);

  return Array.from(set);
}
