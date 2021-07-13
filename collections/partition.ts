// Copyright 2018-2021 the Deno authors. All rights reserved. MIT license.
import { Predicate } from "./types.ts";

/**
 * Returns a tuple of two arrays with the first one containing all elements in the given array that match the given predicate
 * and the second one containing all that do not
 *
 * Example:
 *
 * ```typescript
 * const numbers = [ 5, 6, 7, 8, 9 ]
 * const [ even, odd ] = partition(numbers, it => it % 2 == 0)
 *
 * console.assert(even === [ 6, 8 ])
 * console.assert(odd === [ 5, 7, 9 ])
 * ```
 */
export function partition<T>(
  array: Array<T>,
  predicate: Predicate<T>,
): [Array<T>, Array<T>] {
  const matches: Array<T> = [];
  const rest: Array<T> = [];

  array.forEach((it) => {
    if (predicate(it)) {
      matches.push(it);
    } else {
      rest.push(it);
    }
  });

  return [matches, rest];
}
