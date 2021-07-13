// Copyright 2018-2021 the Deno authors. All rights reserved. MIT license.

/**
 * Splits the given array into chunks of the given size and returns them
 *
 * Example:
 *
 * ```typescript
 * const words = [ 'lorem', 'ipsum', 'dolor', 'sit', 'amet', 'consetetur', 'sadipscing' ]
 * const chunks = chunked(words, 3)
 *
 * console.assert(chunks === [
 *     [ 'lorem', 'ipsum', 'dolor' ],
 *     [ 'sit', 'amet', 'consetetur' ],
 *     [ 'sadipscing' ],
 * ])
 * ```
 */
export function chunked<T>(
  array: Array<T>,
  size: number,
): Array<Array<T>> {
  if (size <= 0 || !Number.isInteger(size)) {
    throw new Error(
      `Expected size to be an integer greather than 0 but found ${size}`,
    );
  }

  if (array.length === 0) {
    return [];
  }

  const ret = new Array(Math.ceil(array.length / size));
  let readIndex = 0;
  let writeIndex = 0;

  while (readIndex < array.length) {
    ret[writeIndex] = array.slice(readIndex, readIndex + size);

    writeIndex += 1;
    readIndex += size;
  }

  return ret;
}
