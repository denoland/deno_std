// Copyright 2018-2024 the Deno authors. All rights reserved. MIT license.
// This module is browser compatible.

/** Compares its two arguments for ascending order using JavaScript's built in comparison operators. */
export function ascend<T>(a: T, b: T): -1 | 0 | 1 {
  return a < b ? -1 : a > b ? 1 : 0;
}

/** Compares its two arguments for descending order using JavaScript's built in comparison operators. */
export function descend<T>(a: T, b: T): -1 | 0 | 1 {
  return a < b ? 1 : a > b ? -1 : 0;
}
