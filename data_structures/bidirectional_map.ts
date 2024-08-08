// Copyright 2018-2024 the Deno authors. All rights reserved. MIT license.
/**
 * Represents a bidirectional map, which is a map that allows both key-value and
 * value-key lookups.
 *
 * @typeParam K The type of the keys in the map.
 * @typeParam V The type of the values in the map.
 *
 * @example Usage
 * ```ts
 * import { BidirectionalMap } from "@std/data-structures/bidirectional-map";
 * import { assertEquals } from "@std/assert/assert-equals";
 *
 * const map = new BidirectionalMap<string, number>([
 *   ["one", 1],
 *   ["two", 2],
 *   ["three", 3],
 * ]);
 *
 * assertEquals(map.get("one"), 1);
 * assertEquals(map.reverseGet(2), "two");
 *
 * map.set("four", 4);
 * assertEquals(map.get("four"), 4);
 * assertEquals(map.reverseGet(4), "four");
 *
 * assertEquals(map.has("three"), true);
 * assertEquals(map.reverseHas(3), true);
 *
 * map.delete("three");
 * assertEquals(map.has("three"), false);
 * assertEquals(map.reverseHas(3), false);
 * ```
 */
export class BidirectionalMap<K, V> extends Map<K, V> {
  #reverseMap: Map<V, K>;

  /**
   * Constructs a new instance.
   *
   * @param entries An iterable object whose elements are key-value pairs.
   *
   * @example Usage
   *  * ```ts
   * import { BidirectionalMap } from "@std/data-structures/bidirectional-map";
   * import { assertEquals } from "@std/assert/assert-equals";
   *
   * const map = new BidirectionalMap<string, number>([
   *   ["one", 1],
   *   ["two", 2],
   *   ["three", 3],
   * ]);
   *
   * assertEquals(map.get("one"), 1);
   * assertEquals(map.reverseGet(2), "two");
   *
   * map.set("four", 4);
   * assertEquals(map.get("four"), 4);
   * assertEquals(map.reverseGet(4), "four");
   *
   * assertEquals(map.has("three"), true);
   * assertEquals(map.reverseHas(3), true);
   *
   * map.delete("three");
   * assertEquals(map.has("three"), false);
   * assertEquals(map.reverseHas(3), false);
   * ```
   */
  constructor(entries?: readonly (readonly [K, V])[] | null) {
    super(entries);
    this.#reverseMap = new Map<V, K>();
    for (const [key, value] of this) {
      this.#reverseMap.set(value, key);
    }
  }

  /**
   * Clears the map.
   *
   * @example Usage
   * ```ts
   * import { BidirectionalMap } from "@std/data-structures/bidirectional-map";
   * import { assertEquals } from "@std/assert/assert-equals";
   *
   * const map = new BidirectionalMap<string, number>([
   *   ["one", 1],
   *   ["two", 2],
   *   ["three", 3],
   * ]);
   *
   * assertEquals(map.size, 3);
   *
   * map.clear();
   *
   * assertEquals(map.size, 0);
   * ```
   */
  override clear(): void {
    super.clear();
    this.#reverseMap.clear();
  }

  /**
   * Sets a key-value pair in the map
   *
   * @param key The key to set.
   * @param value The value to set.
   * @returns The map
   *
   * @example Usage
   * ```ts
   * import { BidirectionalMap } from "@std/data-structures/bidirectional-map";
   * import { assertEquals } from "@std/assert/assert-equals";
   *
   * const map = new BidirectionalMap<string, number>([
   *   ["one", 1],
   *   ["two", 2],
   *   ["three", 3],
   * ]);
   *
   * map.set("four", 4);
   * assertEquals(map.get("four"), 4);
   * assertEquals(map.reverseGet(4), "four");
   * ```
   */
  override set(key: K, value: V): this {
    super.set(key, value);
    this.#reverseMap.set(value, key);
    return this;
  }

  /**
   * Retrieves the key associated with the specified value.
   *
   * @param value The value to search for.
   * @returns The key associated with the specified value, or `undefined` if not
   * found.
   *
   * @example Usage
   * ```ts
   * import { BidirectionalMap } from "@std/data-structures/bidirectional-map";
   * import { assertEquals } from "@std/assert/assert-equals";
   *
   * const map = new BidirectionalMap<string, number>([
   *   ["one", 1],
   *   ["two", 2],
   *   ["three", 3],
   * ]);
   *
   * assertEquals(map.get("one"), 1);
   * assertEquals(map.reverseGet(2), "two");
   * ```
   */
  reverseGet(value: V): K | undefined {
    return this.#reverseMap.get(value);
  }

  /**
   * Checks whether an element with the specified value exists in the reverse map.
   *
   * @param value The value to search for.
   * @returns `true` if an element with the specified value exists, otherwise
   * `false`.
   *
   * @example Usage
   * ```ts
   * import { BidirectionalMap } from "@std/data-structures/bidirectional-map";
   * import { assertEquals } from "@std/assert/assert-equals";
   *
   * const map = new BidirectionalMap<string, number>([
   *   ["one", 1],
   *   ["two", 2],
   *   ["three", 3],
   * ]);
   *
   * assertEquals(map.has("one"), true);
   * assertEquals(map.reverseHas(2), true);
   * ```
   */
  reverseHas(value: V): boolean {
    return this.#reverseMap.has(value);
  }

  /**
   * Deletes the element with the specified value from the reverse map.
   *
   * @param value The value to delete.
   * @returns `true` if the element was found and deleted, otherwise `false`.
   *
   * @example Usage
   * ```ts
   * import { BidirectionalMap } from "@std/data-structures/bidirectional-map";
   * import { assertEquals } from "@std/assert/assert-equals";
   *
   * const map = new BidirectionalMap<string, number>([
   *   ["one", 1],
   *   ["two", 2],
   *   ["three", 3],
   * ]);
   *
   * assertEquals(map.delete("one"), true);
   * assertEquals(map.reverseDelete(2), true);
   * ```
   */
  reverseDelete(value: V): boolean {
    return this.#reverseMap.delete(value);
  }
}
