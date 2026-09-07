// Copyright 2018-2026 the Deno authors. MIT license.
// This module is browser compatible.

import type { AlgorithmOps, AlgorithmResult } from "./_algorithms.ts";
import {
  createFixedWindowOps,
  createGcraOps,
  createSlidingWindowOps,
  createTokenBucketOps,
} from "./_algorithms.ts";

/** Internal interface for per-key algorithm strategies. */
export interface KeyedAlgorithm {
  limit(key: string, cost: number, now: number): AlgorithmResult;
  peek(key: string, cost: number, now: number): AlgorithmResult;
  has(key: string): boolean;
  reset(key: string): void;
  readonly size: number;
  evict(now: number, ttl: number): void;
  clear(): void;
}

/** Options for {@linkcode createKeyedAlgorithm}. */
export interface KeyedAlgorithmOptions {
  /**
   * Maximum number of keys to track. When a new key arrives at capacity,
   * the least-recently-used key is evicted. `0` disables the limit.
   */
  maxKeys?: number;
}

/**
 * Wraps AlgorithmOps with a Map, LRU eviction, and TTL eviction.
 *
 * LRU tracking exploits Map's insertion-order guarantee: on `limit()`
 * the entry is deleted and re-inserted, keeping the least-recently-used
 * key at the front. `peek()` is read-only and does not promote the key,
 * so a key that is only peeked can still be evicted. Eviction of the
 * LRU entry is O(1).
 */
function createKeyedAlgorithm<S extends object>(
  ops: AlgorithmOps<S>,
  options?: KeyedAlgorithmOptions,
): KeyedAlgorithm {
  const maxKeys = options?.maxKeys ?? 0;
  const keys = new Map<string, S & { lastAccess: number }>();

  /** Move `key` to the back of the Map (most-recently-used position). */
  function touch(key: string, state: S & { lastAccess: number }): void {
    keys.delete(key);
    keys.set(key, state);
  }

  function getOrCreate(key: string, now: number): S & { lastAccess: number } {
    let state = keys.get(key);
    if (state === undefined) {
      if (maxKeys > 0 && keys.size >= maxKeys) {
        // The first key in the Map is the LRU entry.
        const lruKey = keys.keys().next().value;
        if (lruKey !== undefined) keys.delete(lruKey);
      }
      const base = ops.create(now);
      (base as S & { lastAccess: number }).lastAccess = now;
      state = base as S & { lastAccess: number };
      keys.set(key, state);
    }
    return state;
  }

  // Computes the result for a key with no tracked state by evaluating the
  // algorithm against a transient fresh state. This keeps metadata (notably
  // `resetAt`, which must point at the next replenishment event) consistent
  // with the value a subsequent `limit()` call would produce.
  function peekDefault(cost: number, now: number): AlgorithmResult {
    const state = ops.create(now);
    const ok = ops.wouldAllow(state, cost, now);
    return ops.result(state, ok, cost, now);
  }

  return {
    limit(key, cost, now) {
      const state = getOrCreate(key, now);
      ops.advance(state, now);
      state.lastAccess = now;
      if (maxKeys > 0) touch(key, state);
      const ok = ops.tryConsume(state, cost, now);
      return ops.result(state, ok, cost, now);
    },
    // Advances time (segment rotation, token refill) so metadata is
    // accurate, but does not consume permits or update lastAccess.
    peek(key, cost, now) {
      const state = keys.get(key);
      if (state === undefined) return peekDefault(cost, now);
      ops.advance(state, now);
      const ok = ops.wouldAllow(state, cost, now);
      return ops.result(state, ok, cost, now);
    },
    has(key) {
      return keys.has(key);
    },
    reset(key) {
      keys.delete(key);
    },
    get size() {
      return keys.size;
    },
    evict(now, ttl) {
      for (const [k, state] of keys) {
        if (now - state.lastAccess > ttl) keys.delete(k);
      }
    },
    clear() {
      keys.clear();
    },
  };
}

// --- Fixed Window ---

/**
 * Creates a keyed fixed-window rate limit algorithm.
 *
 * @param limit Maximum permits per key per window. Must be a positive integer.
 * @param window Window duration in milliseconds. Must be a positive finite number.
 * @param options Additional keyed algorithm options.
 * @returns A keyed algorithm using fixed-window semantics.
 */
export function createFixedWindowAlgorithm(
  limit: number,
  window: number,
  options?: KeyedAlgorithmOptions,
): KeyedAlgorithm {
  return createKeyedAlgorithm(createFixedWindowOps(limit, window), options);
}

// --- Sliding Window ---

/**
 * Creates a keyed sliding-window rate limit algorithm.
 *
 * @param limit Maximum permits per key per window. Must be a positive integer.
 * @param window Window duration in milliseconds. Must be a positive finite number.
 * @param segmentsPerWindow Number of segments per window. Must be an integer >= 2.
 * @param options Additional keyed algorithm options.
 * @returns A keyed algorithm using sliding-window semantics.
 */
export function createSlidingWindowAlgorithm(
  limit: number,
  window: number,
  segmentsPerWindow: number,
  options?: KeyedAlgorithmOptions,
): KeyedAlgorithm {
  return createKeyedAlgorithm(
    createSlidingWindowOps(limit, window, segmentsPerWindow),
    options,
  );
}

// --- Token Bucket ---

/**
 * Creates a keyed token-bucket rate limit algorithm.
 *
 * @param limit Bucket capacity (max tokens per key). Must be a positive integer.
 * @param window Refill cycle duration in milliseconds. Must be a positive finite number.
 * @param tokensPerPeriod Tokens added per replenishment period. Must be a positive integer.
 * @param options Additional keyed algorithm options.
 * @returns A keyed algorithm using token-bucket semantics.
 */
export function createTokenBucketAlgorithm(
  limit: number,
  window: number,
  tokensPerPeriod: number,
  options?: KeyedAlgorithmOptions,
): KeyedAlgorithm {
  return createKeyedAlgorithm(
    createTokenBucketOps(limit, window, tokensPerPeriod),
    options,
  );
}

// --- GCRA ---

/**
 * Creates a keyed GCRA (Generic Cell Rate Algorithm) rate limit algorithm.
 *
 * @param limit Maximum permits per key per window. Must be a positive integer.
 * @param window Window (tau) in milliseconds. Must be a positive integer with `window * limit < 2 ** 53`.
 * @param options Additional keyed algorithm options.
 * @returns A keyed algorithm using GCRA semantics.
 */
export function createGcraAlgorithm(
  limit: number,
  window: number,
  options?: KeyedAlgorithmOptions,
): KeyedAlgorithm {
  return createKeyedAlgorithm(createGcraOps(limit, window), options);
}
