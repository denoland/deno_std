// Copyright 2018-2024 the Deno authors. All rights reserved. MIT license.
import type { MemoizationCache } from "./memoize.ts";
export type { MemoizationCache };

/**
 * [Least-recently-used](
 * 	https://en.wikipedia.org/wiki/Cache_replacement_policies#LRU
 * ) cache.
 *
 * @experimental
 *
 * Automatically removes entries above the max size based on when they were
 * last accessed with `get`, `set`, or `has`.
 *
 * @typeParam K The type of the cache keys.
 * @typeParam V The type of the cache values.
 *
 * @example Basic usage
 * ```ts
 * import { LruCache } from "@std/cache";
 * import { assert, assertEquals } from "@std/assert";
 *
 * const MAX_SIZE = 3;
 * const cache = new LruCache<string, number>(MAX_SIZE);
 *
 * cache.set("a", 1);
 * cache.set("b", 2);
 * cache.set("c", 3);
 * cache.set("d", 4);
 *
 * // most recent values are stored up to `MAX_SIZE`
 * assertEquals(cache.get("b"), 2);
 * assertEquals(cache.get("c"), 3);
 * assertEquals(cache.get("d"), 4);
 *
 * // less recent values are removed
 * assert(!cache.has("a"));
 * ```
 */
export class LruCache<K, V> extends Map<K, V>
  implements MemoizationCache<K, V> {
  /**
   * The maximum number of entries to store in the cache.
   *
   * @example Max size
   * ```ts no-assert
   * import { LruCache } from "@std/cache";
   * import { assertEquals } from "@std/assert";
   *
   * const cache = new LruCache<string, number>(100);
   * assertEquals(cache.maxSize, 100);
   * ```
   */
  maxSize: number;

  /**
   * Constructs a new `LruCache`.
   *
   * @param maxSize The maximum number of entries to store in the cache.
   */
  constructor(maxSize: number) {
    super();
    this.maxSize = maxSize;
  }

  #setMostRecentlyUsed(key: K, value: V): void {
    // delete then re-add to ensure most recently accessed elements are last
    super.delete(key);
    super.set(key, value);
  }

  #pruneToMaxSize(): void {
    if (this.size > this.maxSize) {
      this.delete(this.keys().next().value);
    }
  }

  /**
   * Checks whether an element with the specified key exists or not.
   *
   * @param key The key to check.
   * @returns `true` if the cache contains the specified key, otherwise `false`.
   *
   * @example Checking for the existence of a key
   * ```ts
   * import { LruCache } from "@std/cache";
   * import { assert } from "@std/assert";
   *
   * const cache = new LruCache<string, number>(100);
   *
   * cache.set("a", 1);
   * assert(cache.has("a"));
   * ```
   */
  override has(key: K): boolean {
    const exists = super.has(key);

    if (exists) {
      this.#setMostRecentlyUsed(key, super.get(key)!);
    }

    return exists;
  }

  /**
   * Gets the element with the specified key.
   *
   * @param key The key to get the value for.
   * @returns The value associated with the specified key, or `undefined` if the key is not present in the cache.
   *
   * @example Getting a value from the cache
   * ```ts
   * import { LruCache } from "@std/cache";
   * import { assertEquals } from "@std/assert";
   *
   * const cache = new LruCache<string, number>(100);
   *
   * cache.set("a", 1);
   * assertEquals(cache.get("a"), 1);
   * ```
   */
  override get(key: K): V | undefined {
    if (super.has(key)) {
      const value = super.get(key)!;
      this.#setMostRecentlyUsed(key, value);
      return value;
    }

    return undefined;
  }

  /**
   * Sets the specified key to the specified value.
   *
   * @param key The key to set the value for.
   * @param value The value to set.
   * @returns `this` for chaining.
   *
   * @example Setting a value in the cache
   * ```ts no-assert
   * import { LruCache } from "@std/cache";
   *
   * const cache = new LruCache<string, number>(100);
   * cache.set("a", 1);
   * ```
   */
  override set(key: K, value: V): this {
    this.#setMostRecentlyUsed(key, value);
    this.#pruneToMaxSize();

    return this;
  }
}
