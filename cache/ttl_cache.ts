// Copyright 2018-2024 the Deno authors. All rights reserved. MIT license.
import type { MemoizationCache } from "./memoize.ts";
import { delay } from "@std/async/delay";

/**
 * Time-to-live cache.
 *
 * Automatically removes entries once the configured amount of time elapses. If
 * the values themselves are promises, the countdown starts from when they
 * resolve.
 *
 * @typeParam K The type of the cache keys.
 * @typeParam V The type of the cache values.
 *
 * @example Usage
 * ```ts
 * import { TtlCache } from "@std/cache";
 * import { assertEquals } from "@std/assert";
 * import { delay } from "@std/async/delay";
 *
 * const cache = new TtlCache<string, number>(1000);
 *
 * cache.set("a", 1);
 * assertEquals(cache.size, 1);
 * await delay(2000);
 * assertEquals(cache.size, 0);
 * ```
 */
export class TtlCache<K, V> extends Map<K, V>
  implements MemoizationCache<K, V> {
  /**
   * The default time-to-live in milliseconds
   *
   * @example Usage
   * ```ts
   * import { TtlCache } from "@std/cache";
   * import { assertEquals } from "@std/assert";
   * const cache = new TtlCache(1000);
   * assertEquals(cache.defaultTtl, 1000);
   * ```
   */
  defaultTtl: number;

  /**
   * Construct a new `TtlCache`.
   * @param defaultTtl The default time-to-live in milliseconds
   */
  constructor(defaultTtl: number) {
    super();
    this.defaultTtl = defaultTtl;
  }

  #deleters = new Map<K, { promise: Promise<void>; ac: AbortController }>();

  /**
   * Set a value in the cache.
   *
   * @param key The cache key
   * @param value The value to set
   * @param customTtl A custom time-to-live. If supplied, overrides the cache's default TTL for this entry.
   * @returns `this` for chaining.
   *
   * @example Usage
   * ```ts
   * import { TtlCache } from "@std/cache";
   * import { assertEquals } from "@std/assert";
   *
   * const cache = new TtlCache<string, number>(1000);
   *
   * cache.set("a", 1);
   * assertEquals(cache.get("a"), 1);
   * ```
   */
  override set(key: K, value: V, customTtl?: number): this {
    super.set(key, value);

    this.#deleters.get(key)?.ac.abort();
    const ac = new AbortController();

    this.#deleters.set(key, {
      promise: (async () => {
        if (value instanceof Promise) {
          await value;
        }

        await delay(customTtl ?? this.defaultTtl);

        if (!ac.signal.aborted) {
          super.delete(key);
        }
      })(),
      ac,
    });

    return this;
  }
}
