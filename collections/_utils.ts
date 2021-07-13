// Copyright 2018-2021 the Deno authors. All rights reserved. MIT license.

import { Predicate } from "./types.ts";

/**
 * Filters the given array, removing all elements that do not match the given predicate
 * **in place. This means `array` will be modified!**.
 */
export function filterInPlace<T>(
  array: Array<T>,
  predicate: Predicate<T>,
): Array<T> {
  let outputIndex = 0;

  for (const cur of array) {
    if (!predicate(cur)) {
      continue;
    }

    array[outputIndex] = cur;
    outputIndex += 1;
  }

  array.splice(outputIndex);

  return array;
}
