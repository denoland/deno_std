// Copyright 2018-2026 the Deno authors. MIT license.

import type {
  AlgorithmOptions,
  RateLimitResult,
  RateLimitStore,
} from "./store_types.ts";
import {
  assertNonNegativeInteger,
  assertPositiveFinite,
  assertPositiveInteger,
  assertTimerInterval,
} from "./_validation.ts";
import { unrefTimer } from "./_unref_timer.ts";
import {
  createFixedWindowAlgorithm,
  createGcraAlgorithm,
  createSlidingWindowAlgorithm,
  createTokenBucketAlgorithm,
} from "./_keyed_algorithms.ts";
import type {
  KeyedAlgorithm,
  KeyedAlgorithmOptions,
} from "./_keyed_algorithms.ts";

/**
 * Options for {@linkcode createMemoryStore}.
 *
 * @experimental **UNSTABLE**: New API, yet to be vetted.
 */
export interface MemoryStoreOptions extends AlgorithmOptions {
  /**
   * Time-to-live for idle key state in milliseconds. Set to `0` to disable.
   *
   * Defaults to 5 minutes, extended to the algorithm's full state horizon
   * (the window; for token-bucket, the time to refill an empty bucket) when
   * that is longer. Explicit values shorter than the state horizon cause
   * idle keys to be evicted — and restored to full capacity — while still
   * rate limited.
   *
   * @default {300_000}
   */
  evictionTtl?: number;
  /**
   * How often to scan for and evict idle keys, in milliseconds. Each
   * scan iterates all tracked keys, so increase this value (or disable
   * TTL eviction entirely with `evictionTtl: 0`) for very high key
   * cardinality to avoid event-loop pauses.
   *
   * @default {60_000}
   */
  evictionInterval?: number;
  /**
   * Maximum number of keys to track. When a new key arrives at capacity,
   * the least-recently-used key is evicted to make room. Set to `0` to
   * disable (unbounded).
   *
   * @default {0}
   */
  maxKeys?: number;
  /**
   * Clock function returning the current time in milliseconds. Override
   * for testing with `FakeTime`.
   *
   * @default {Date.now}
   */
  clock?: () => number;
}

/**
 * An in-memory {@linkcode RateLimitStore} with additional synchronous
 * diagnostics. Extends the base store contract with `has()` and `size`
 * for in-memory storage.
 *
 * @experimental **UNSTABLE**: New API, yet to be vetted.
 */
export interface MemoryStore extends RateLimitStore {
  /**
   * Whether a key has tracked state.
   *
   * @param key Identifier for the rate limit subject.
   * @returns `true` if the key is currently tracked.
   */
  has(key: string): boolean;
  /** Number of keys currently tracked. */
  readonly size: number;
}

/**
 * Create an in-memory rate limit store backed by a `Map`. This is the
 * default store used by `createRateLimiter` when no `store` option is
 * provided.
 *
 * @experimental **UNSTABLE**: New API, yet to be vetted.
 *
 * @example Creating a memory store directly
 * ```ts
 * import { createMemoryStore } from "@std/rate-limit/memory-store";
 * import { assertEquals } from "@std/assert";
 *
 * await using store = createMemoryStore({
 *   limit: 5,
 *   window: 1000,
 *   algorithm: "fixed-window",
 *   evictionTtl: 0,
 * });
 *
 * assertEquals(store.capacity, 5);
 * assertEquals(store.window, 1000);
 * ```
 *
 * @param options Configuration for the memory store.
 * @returns A {@linkcode MemoryStore}.
 */
export function createMemoryStore(options: MemoryStoreOptions): MemoryStore {
  const context = "memory store";
  assertPositiveInteger(context, "limit", options.limit);
  assertPositiveFinite(context, "window", options.window);

  const {
    limit,
    window: windowMs,
    algorithm: algorithmName = "sliding-window",
    segmentsPerWindow = 10,
    tokensPerPeriod = limit,
    evictionInterval = 60_000,
    maxKeys = 0,
    clock = Date.now,
  } = options;

  if (algorithmName === "token-bucket") {
    assertPositiveInteger(context, "tokensPerPeriod", tokensPerPeriod);
    if (tokensPerPeriod > limit) {
      throw new RangeError(
        `Cannot create ${context}: 'tokensPerPeriod' (${tokensPerPeriod}) exceeds 'limit' (${limit})`,
      );
    }
  }

  assertNonNegativeInteger(context, "evictionTtl", options.evictionTtl);

  // The TTL must outlive the algorithm's state horizon, or an idle key can
  // be evicted — and restored to full capacity — while still rate limited.
  const stateHorizon = algorithmName === "token-bucket"
    ? Math.ceil(limit / tokensPerPeriod) * windowMs
    : windowMs;
  const evictionTtl = options.evictionTtl ??
    Math.max(300_000, stateHorizon);

  if (evictionTtl > 0) {
    assertPositiveInteger(context, "evictionInterval", evictionInterval);
    assertTimerInterval(context, "'evictionInterval'", evictionInterval);
  }

  assertNonNegativeInteger(context, "maxKeys", maxKeys);

  const keyedOptions: KeyedAlgorithmOptions = { maxKeys };

  let algorithm: KeyedAlgorithm;
  switch (algorithmName) {
    case "fixed-window":
      algorithm = createFixedWindowAlgorithm(limit, windowMs, keyedOptions);
      break;
    case "sliding-window":
      algorithm = createSlidingWindowAlgorithm(
        limit,
        windowMs,
        segmentsPerWindow,
        keyedOptions,
      );
      break;
    case "token-bucket":
      algorithm = createTokenBucketAlgorithm(
        limit,
        windowMs,
        tokensPerPeriod,
        keyedOptions,
      );
      break;
    case "gcra":
      algorithm = createGcraAlgorithm(limit, windowMs, keyedOptions);
      break;
    default:
      throw new TypeError(
        `Cannot create ${context}: unknown algorithm '${algorithmName as string}'`,
      );
  }

  let evictionTimer: ReturnType<typeof setInterval> | undefined;

  if (evictionTtl > 0) {
    evictionTimer = setInterval(
      () => algorithm.evict(clock(), evictionTtl),
      evictionInterval,
    );
    unrefTimer(evictionTimer);
  }

  return {
    get capacity(): number {
      return limit;
    },
    get window(): number {
      return windowMs;
    },
    consume(key: string, cost: number): Promise<RateLimitResult> {
      return Promise.resolve(algorithm.limit(key, cost, clock()));
    },
    peek(key: string, cost: number): Promise<RateLimitResult> {
      return Promise.resolve(algorithm.peek(key, cost, clock()));
    },
    has(key: string): boolean {
      return algorithm.has(key);
    },
    reset(key: string): Promise<void> {
      algorithm.reset(key);
      return Promise.resolve();
    },
    get size(): number {
      return algorithm.size;
    },
    [Symbol.asyncDispose](): Promise<void> {
      if (evictionTimer !== undefined) {
        clearInterval(evictionTimer);
        evictionTimer = undefined;
      }
      algorithm.clear();
      return Promise.resolve();
    },
  };
}
