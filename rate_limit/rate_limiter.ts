// Copyright 2018-2026 the Deno authors. MIT license.

import type { MemoryStoreOptions } from "./memory_store.ts";
import { createMemoryStore } from "./memory_store.ts";
import type { RateLimitResult, RateLimitStore } from "./store_types.ts";

export type { RateLimitResult } from "./store_types.ts";

/**
 * Options for {@linkcode KeyedRateLimiter.limit} and
 * {@linkcode KeyedRateLimiter.peek}.
 *
 * @experimental **UNSTABLE**: New API, yet to be vetted.
 *
 * @example Variable cost per request
 * ```ts
 * import { createRateLimiter } from "@std/rate-limit/rate-limiter";
 * import { assert } from "@std/assert";
 *
 * await using limiter = createRateLimiter({ limit: 100, window: 60_000 });
 *
 * const result = await limiter.limit("user:123", { cost: 5 });
 * assert(result.ok);
 * ```
 */
export interface CostOptions {
  /**
   * Number of permits to consume (for `limit`) or check (for `peek`).
   * Use higher values for expensive operations.
   *
   * @default {1}
   */
  cost?: number;
}

/**
 * A keyed rate limiter that manages per-key state internally. This is the
 * primary rate limiting API for the common case of "allow key X at most N
 * requests per window."
 *
 * All methods are async to support pluggable store backends (in-memory by
 * default, or distributed stores such as Redis or Deno KV). For in-memory
 * stores the returned promises resolve synchronously.
 *
 * **Disposal behavior:** after disposal, `limit()` and `peek()` return a
 * result with `ok: false` (remaining/resetAt/retryAfter all `0`), and
 * `reset()` is a no-op.
 *
 * @experimental **UNSTABLE**: New API, yet to be vetted.
 */
export interface KeyedRateLimiter extends AsyncDisposable {
  /**
   * Check whether a request for the given key should be allowed, and
   * consume permits if so.
   *
   * @param key Identifier for the rate limit subject (user ID, IP, etc.).
   * @param options Override cost per request.
   * @returns A {@linkcode RateLimitResult} with the decision and metadata.
   */
  limit(key: string, options?: CostOptions): Promise<RateLimitResult>;

  /**
   * Check the current state for a key without consuming any permits.
   * Useful for displaying remaining quota in UI or headers without
   * affecting the count.
   *
   * @param key Identifier for the rate limit subject (user ID, IP, etc.).
   * @param options Override cost per request.
   * @returns A {@linkcode RateLimitResult} with the current state and metadata.
   */
  peek(key: string, options?: CostOptions): Promise<RateLimitResult>;

  /**
   * Reset all state for a key, restoring it to full capacity.
   *
   * @param key Identifier for the rate limit subject (user ID, IP, etc.).
   */
  reset(key: string): Promise<void>;
}

/**
 * Options when using the default in-memory store. Extends
 * {@linkcode MemoryStoreOptions} with a `store?: undefined` discriminant.
 *
 * @experimental **UNSTABLE**: New API, yet to be vetted.
 */
export type MemoryRateLimiterOptions = MemoryStoreOptions & {
  store?: undefined;
};

/**
 * Options when providing a custom {@linkcode RateLimitStore} backend.
 * {@linkcode MemoryStoreOptions} keys (`limit`, `window`, `algorithm`,
 * `ttl`, etc.) are typed as `never` to prevent accidentally passing them
 * alongside a custom store, since the store owns those settings.
 *
 * @experimental **UNSTABLE**: New API, yet to be vetted.
 */
export type StoreRateLimiterOptions =
  & { /** The store backend to delegate to. */ store: RateLimitStore }
  & { [K in keyof MemoryStoreOptions]?: never };

/**
 * Options for {@linkcode createRateLimiter}.
 *
 * @experimental **UNSTABLE**: New API, yet to be vetted.
 */
export type RateLimiterOptions =
  | MemoryRateLimiterOptions
  | StoreRateLimiterOptions;

/**
 * Create a keyed rate limiter backed by an in-memory store or a custom
 * {@linkcode RateLimitStore}.
 *
 * @experimental **UNSTABLE**: New API, yet to be vetted.
 *
 * @example Basic usage
 * ```ts
 * import { createRateLimiter } from "@std/rate-limit/rate-limiter";
 * import { assert, assertEquals } from "@std/assert";
 *
 * await using limiter = createRateLimiter({ limit: 100, window: 60_000 });
 * const result = await limiter.limit("user:123", { cost: 5 });
 * assert(result.ok);
 * assertEquals(result.remaining, 95);
 * ```
 *
 * @example Custom store backend
 * ```ts
 * import { createRateLimiter } from "@std/rate-limit/rate-limiter";
 * import { createMemoryStore } from "@std/rate-limit/memory-store";
 * import { assert } from "@std/assert";
 *
 * // Any RateLimitStore implementation works here, e.g. one backed by a
 * // distributed database. The limiter takes ownership and disposes it.
 * const store = createMemoryStore({
 *   algorithm: "token-bucket",
 *   limit: 100,
 *   window: 60_000,
 * });
 *
 * await using limiter = createRateLimiter({ store });
 * const result = await limiter.limit("user:123");
 * assert(result.ok);
 * ```
 *
 * @param options Configuration for the rate limiter.
 * @returns A {@linkcode KeyedRateLimiter}.
 */
export function createRateLimiter(
  options: RateLimiterOptions,
): KeyedRateLimiter {
  const store: RateLimitStore = options.store ??
    createMemoryStore(options as MemoryRateLimiterOptions);

  const limit = store.capacity;

  const DISPOSED_RESULT: RateLimitResult = Object.freeze({
    ok: false as const,
    remaining: 0,
    resetAt: 0,
    retryAfter: 0,
    limit,
  });

  let disposed = false;

  function validateCost(method: string, cost: number): void {
    if (!Number.isInteger(cost) || cost < 1) {
      throw new RangeError(
        `Cannot ${method}: 'cost' must be a positive integer, received ${cost}`,
      );
    }
    if (cost > limit) {
      throw new RangeError(
        `Cannot ${method}: 'cost' (${cost}) exceeds the limit (${limit})`,
      );
    }
  }

  return {
    limit(key: string, options?: CostOptions): Promise<RateLimitResult> {
      const cost = options?.cost ?? 1;
      validateCost("limit", cost);
      if (disposed) return Promise.resolve(DISPOSED_RESULT);
      return store.consume(key, cost);
    },
    peek(key: string, options?: CostOptions): Promise<RateLimitResult> {
      const cost = options?.cost ?? 1;
      validateCost("peek", cost);
      if (disposed) return Promise.resolve(DISPOSED_RESULT);
      return store.peek(key, cost);
    },
    reset(key: string): Promise<void> {
      if (disposed) return Promise.resolve();
      return store.reset(key);
    },
    async [Symbol.asyncDispose](): Promise<void> {
      if (disposed) return;
      disposed = true;
      await store[Symbol.asyncDispose]();
    },
  };
}
