// Copyright 2018-2024 the Deno authors. All rights reserved. MIT license.

/**
 * Options for random number generation.
 */
export type RandomOptions = {
  /**
   * A function returning a random number between 0 and 1, used for
   * randomization.
   * @default {Math.random}
   */
  random: () => number;
};

export const defaultOptions: RandomOptions = {
  random: Math.random,
};
