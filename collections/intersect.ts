// Copyright 2018-2021 the Deno authors. All rights reserved. MIT license.

import { filterInPlace } from "./_utils.ts";

/**
 * Returns all distinct elements that appear in both given arrays
 *
 * Example:
 *
 * ```typescript
 * const lisaInterests = [ 'Cooking', 'Music', 'Hiking' ]
 * const kimInterests = [ 'Music', 'Tennis', 'Cooking' ]
 * const commonInterests = intersectTest(lisaInterests, kimInterests)
 *
 * console.assert(commonInterests === [ 'Cooking', 'Music' ])
 * ```
 */
export function intersect<T>(...arrays: Array<Array<T>>): Array<T> {
  const [originalHead, ...tail] = arrays;
  const head = [...originalHead];
  const sets = tail.map((it) => new Set(it));

  return sets
    .reduce<Array<T>>(
      (acc, cur) =>
        filterInPlace(
          acc,
          (it) => cur.has(it),
        ),
      head,
    );
}
