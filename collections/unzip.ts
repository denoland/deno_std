// Copyright 2018-2021 the Deno authors. All rights reserved. MIT license.

/**
 * Builds two separate arrays from the given array of 2-tuples, with the first returned array holding all first
 * tuple elements and the second one holding all the second elements
 *
 * Example:
 *
 * ```typescript
 * const parents = [
 *     [ 'Maria', 'Jeff' ],
 *     [ 'Anna', 'Kim' ],
 *     [ 'John', 'Leroy' ],
 * ]
 * const [ moms, dads ] = unzip(parents)
 *
 * console.assert(moms === [ 'Maria', 'Anna', 'John' ])
 * console.assert(moms === [ 'Jeff', 'Kim', 'Leroy' ])
 * ```
 */
export function unzip<T, U>(_pairs: Array<[T, U]>): [Array<T>, Array<U>] {
  throw new Error("unimplemented");
}
