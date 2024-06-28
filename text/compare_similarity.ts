// Copyright 2018-2024 the Deno authors. All rights reserved. MIT license.
// This module is browser compatible.
import { levenshteinDistance } from "./levenshtein_distance.ts";

/** Options for {@linkcode compareSimilarity}. */
export interface CompareSimilarityOptions {
  /**
   * Whether the distance should include case.
   *
   * @default {false}
   */
  caseSensitive?: boolean;
  /**
   * Function used to compare two strings.
   * Lower number means closer match.
   * 0 means numbers match.
   *
   * @default {levenshteinDistance}
   */
  distanceFn?: (str1: string, str2: string) => number;
}

/**
 * Sort based on word similarity.
 *
 * @param givenWord The string to measure distance against.
 * @param options Options for the sort.
 * @returns The difference in distance. This will be a negative number if `a`
 * is more similar to `givenWord` than `b`, a positive number if `b` is more
 * similar, or `0` if they are equally similar.
 *
 * @example Usage
 *
 * Most-similar words will be at the start of the array.
 *
 * ```ts
 * import { compareSimilarity } from "@std/text/compare-similarity";
 * import { assertEquals } from "@std/assert/assert-equals";
 *
 * const words = ["hi", "hello", "help"];
 * const sortedWords = words.sort(compareSimilarity("hep"));
 *
 * assertEquals(sortedWords, ["help", "hi", "hello"]);
 * ```
 *
 * Note: the ordering of words may change with version-updates
 * E.g. word-distance metric may change (improve)
 * use a named-distance (e.g. levenshteinDistance) to
 * guarantee a particular ordering
 */
export function compareSimilarity(
  givenWord: string,
  options?: CompareSimilarityOptions,
): (a: string, b: string) => number {
  const { caseSensitive, distanceFn = levenshteinDistance } = { ...options };

  if (caseSensitive) {
    return (a: string, b: string) =>
      distanceFn(givenWord, a) - distanceFn(givenWord, b);
  }
  givenWord = givenWord.toLowerCase();
  return (a: string, b: string) =>
    distanceFn(givenWord, a.toLowerCase()) -
    distanceFn(givenWord, b.toLowerCase());
}
