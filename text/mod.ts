// Copyright 2018-2024 the Deno authors. All rights reserved. MIT license.
// This module is browser compatible.

/**
 * Utility functions for working with text.
 *
 * ```ts
 * import { toCamelCase, compareSimilarity } from "@std/text";
 * import { assertEquals } from "@std/assert";
 *
 * assertEquals(toCamelCase("snake_case"), "snakeCase");
 *
 * const words = ["hi", "help", "hello"];
 *
 * // Words most similar to "hep" will be at the front
 * assertEquals(words.sort(compareSimilarity("hep")), ["help", "hi", "hello"]);
 * ```
 *
 * @module
 */

export * from "./levenshtein_distance.ts";
export * from "./closest_string.ts";
export * from "./compare_similarity.ts";
export * from "./word_similarity_sort.ts";
export * from "./to_camel_case.ts";
export * from "./to_constant_case.ts";
export * from "./to_kebab_case.ts";
export * from "./to_pascal_case.ts";
export * from "./to_snake_case.ts";
export * from "./slugify.ts";
