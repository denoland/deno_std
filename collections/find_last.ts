import { Predicate } from "./types.ts";

/**
 * Returns the last element in the given array matching the given predicate
 *
 * Example:
 *
 * ```typescript
 * const numbers = [ 4, 2, 7 ]
 * const lastEvenNumber = findLast(numbers, it => it % 2 === 0)
 *
 * console.assert(lastEvenNumber === 2)
 * ```
 */
export function findLast<T>(
  array: Array<T>,
  predicate: Predicate<T>,
): T | undefined {
  if (array.length === 0) {
    return undefined;
  }

  for (let i = array.length - 1; i >= 0; i -= 1) {
    const element = array[i];

    if (predicate(element)) {
      return element;
    }
  }

  return undefined;
}
