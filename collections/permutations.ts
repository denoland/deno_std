// Copyright 2018-2021 the Deno authors. All rights reserved. MIT license.

/**
 * Builds all possible combinations and orders of elements in the given array and the given size.
 *
 * If size is not given, it is assumed to be the length of the given array.
 *
 * Example:
 *
 * ```typescript
 * const numbers = [ 1, 2, 3 ]
 * const windows = permutations(words, 2)
 *
 * console.assert(windows === [
 *     [ 1, 2 ],
 *     [ 1, 3 ],
 *     [ 2, 1 ],
 *     [ 2, 3 ],
 *     [ 3, 1 ],
 *     [ 3, 2 ],
 * ])
 * ```
 */
export function permutations<T>(
  _array: Array<T>,
  _size?: number,
): Array<Array<T>> {
  throw new Error("unimplemented");
}
