// Copyright 2018-2024 the Deno authors. All rights reserved. MIT license.
// This module is browser compatible.
import type { CompareSimilarityOptions } from "./compare_similarity.ts";
import { levenshteinDistance } from "./levenshtein_distance.ts";

/** Options for {@linkcode closestString}. */
export interface ClosestStringOptions extends CompareSimilarityOptions {}

/**
 * The the most similar string from an array of strings.
 *
 * @example Usage
 * ```ts
 * import { closestString } from "@std/text/closest-string";
 * import { assertEquals } from "@std/assert/assert-equals";
 *
 * const possibleWords = ["length", "size", "blah", "help"];
 * const suggestion = closestString("hep", possibleWords);
 *
 * assertEquals(suggestion, "help");
 * ```
 *
 * @param givenWord The string to measure distance against
 * @param possibleWords The string-array that will be sorted
 * @param options An options bag containing a `caseSensitive` flag indicating
 * whether the distance should include case. Default is false.
 * @returns A sorted copy of possibleWords
 * @note
 * the ordering of words may change with version-updates
 * e.g. word-distance metric may change (improve)
 * use a named-distance (e.g. levenshteinDistance) to
 * guarantee a particular ordering
 */
export function closestString(
  givenWord: string,
  possibleWords: string[],
  options?: ClosestStringOptions,
): string {
  if (possibleWords.length === 0) {
    throw new TypeError(
      "When using closestString(), the possibleWords array must contain at least one word",
    );
  }
  const { caseSensitive, distanceFn = levenshteinDistance } = { ...options };

  if (!caseSensitive) {
    givenWord = givenWord.toLowerCase();
  }

  let nearestWord = possibleWords[0]!;
  let closestStringDistance = Infinity;
  for (const each of possibleWords) {
    const distance = caseSensitive
      ? distanceFn(givenWord, each)
      : distanceFn(givenWord, each.toLowerCase());
    if (distance < closestStringDistance) {
      nearestWord = each;
      closestStringDistance = distance;
    }
  }
  return nearestWord;
}
