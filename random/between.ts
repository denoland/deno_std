// Copyright 2018-2024 the Deno authors. All rights reserved. MIT license.
import { defaultOptions, type RandomOptions } from "./_types.ts";
export type { RandomOptions };

/**
 * Generates a random number between the provided minimum and maximum values.
 *
 * The number is in the range `[min, max)`, i.e. `min` is included but `max` is excluded.
 *
 * @param min - The minimum value (inclusive)
 * @param max - The maximum value (exclusive)
 * @param options - The options for the random number generator
 * @returns A random number between the provided minimum and maximum values
 *
 * @example Usage
 * ```ts no-assert
 * import { randomBetween } from "@std/random";
 *
 * randomBetween(1, 10); // 6.688009464410508
 * randomBetween(1, 10); // 3.6267118101712006
 * randomBetween(1, 10); // 7.853320239013774
 * ```
 */
export function randomBetween(
  min: number,
  max: number,
  options?: RandomOptions,
): number {
  if (!isFinite(min)) {
    throw new RangeError(`min cannot be ${min}`);
  }
  if (!isFinite(max)) {
    throw new RangeError(`max cannot be ${max}`);
  }
  if (max < min) {
    throw new RangeError("max must be greater than or equal to min");
  }

  const { random } = { ...defaultOptions, ...options };
  return random() * (max - min) + min;
}
