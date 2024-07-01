// Copyright 2018-2024 the Deno authors. All rights reserved. MIT license.
// This module is browser compatible.

/**
 * Data structures for use in algorithms and other data manipulation.
 *
 * ```ts
 * import { BinarySearchTree } from "@std/data-structures";
 * import { assertEquals } from "@std/assert";
 *
 * const values = [3, 10, 13, 4, 6, 7, 1, 14];
 * const tree = new BinarySearchTree<number>();
 * values.forEach((value) => tree.insert(value));
 *
 * assertEquals([...tree], [1, 3, 4, 6, 7, 10, 13, 14]);
 * assertEquals(tree.min(), 1);
 * assertEquals(tree.max(), 14);
 * assertEquals(tree.find(42), null);
 * assertEquals(tree.find(7), 7);
 * assertEquals(tree.remove(42), false);
 * assertEquals(tree.remove(7), true);
 * assertEquals([...tree], [1, 3, 4, 6, 10, 13, 14]);
 * ```
 *
 * @module
 */

export * from "./bidirectional_map.ts";
export * from "./binary_heap.ts";
export * from "./binary_search_tree.ts";
export * from "./comparators.ts";
export * from "./red_black_tree.ts";
