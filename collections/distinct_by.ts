// Copyright 2018-2021 the Deno authors. All rights reserved. MIT license.

/**
 * Returns all elements in the given array that produce a distinct value using the given selector, preserving order by first occurence
 *
 * Example:
 *
 * ```typescript
 * const names = [ 'Anna', 'Kim', 'Arnold', 'Kate' ]
 * const exampleNamesByFirstLetter = distinctBy(names, it => it.charAt(0))
 *
 * console.assert(exampleNamesByFirstLetter === [ 'Anna', 'Kim' ])
 * ```
 */
export function distinctBy<T>(
  array: Array<T>,
  selector: (element: T) => unknown,
): Array<T> {
  const selectedValues = new Set();

  return array
    .reduce<Array<T>>(
      (acc, cur) => {
        const currentSelectedValue = selector(cur);

        if (!selectedValues.has(currentSelectedValue)) {
          selectedValues.add(currentSelectedValue);
          acc.push(cur);
        }

        return acc;
      },
      [],
    );
}
