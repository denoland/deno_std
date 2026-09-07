// Copyright 2018-2026 the Deno authors. MIT license.
// This module is browser compatible.

/**
 * The result of a rate limit check. All fields are present regardless of
 * whether the request was allowed.
 *
 * @experimental **UNSTABLE**: New API, yet to be vetted.
 */
export interface RateLimitResult {
  /** Whether the request is allowed. */
  readonly ok: boolean;
  /** Best-effort estimate of remaining permits for this key. */
  readonly remaining: number;
  /**
   * Timestamp (milliseconds since epoch) of the next replenishment event
   * (segment rotation, window boundary, or refill cycle). This is *not*
   * necessarily when full capacity is restored — for sliding-window and
   * token-bucket it may take multiple replenishment cycles. For GCRA this
   * is the theoretical arrival time (TAT) at which full burst capacity is
   * restored. Useful for the `X-RateLimit-Reset` HTTP header.
   */
  readonly resetAt: number;
  /**
   * Retry delay in milliseconds. `0` when the request is allowed. When
   * denied, this is the delay after which a request of the same cost will
   * be allowed, assuming no other requests consume permits in the
   * meantime. Useful for the `Retry-After` HTTP header.
   */
  readonly retryAfter: number;
  /** The limit configured for this limiter. */
  readonly limit: number;
}

/**
 * Algorithm configuration shared by all store backends.
 *
 * @experimental **UNSTABLE**: New API, yet to be vetted.
 */
export interface AlgorithmOptions {
  /** Maximum permits per key per window/cycle. */
  limit: number;
  /**
   * Window duration in milliseconds. GCRA requires a positive integer and
   * `window * limit < 2 ** 53`.
   */
  window: number;
  /**
   * Algorithm to use.
   *
   * @default {"sliding-window"}
   */
  algorithm?: "fixed-window" | "sliding-window" | "token-bucket" | "gcra";
  /**
   * Number of segments for the sliding window algorithm.
   *
   * @default {10}
   */
  segmentsPerWindow?: number;
  /**
   * For token bucket: tokens added per replenishment period.
   *
   * @default {limit}
   */
  tokensPerPeriod?: number;
}

/**
 * A pluggable backend for keyed rate limiting. Stores own the per-key
 * algorithm state and are self-contained: they carry `capacity` and `window`
 * so `createRateLimiter` reads configuration from the store rather than
 * duplicating it.
 *
 * Each store owns its own time source. In-memory stores default to
 * `Date.now` (overridable via `clock` for `FakeTime` testing); distributed
 * stores (e.g. Redis) use server-side time.
 *
 * @experimental **UNSTABLE**: New API, yet to be vetted.
 */
export interface RateLimitStore extends AsyncDisposable {
  /** The configured permit limit per key per window. */
  readonly capacity: number;
  /** The window duration in milliseconds. */
  readonly window: number;

  /**
   * Check and consume permits for a key.
   *
   * @param key Identifier for the rate limit subject.
   * @param cost Number of permits to consume.
   * @returns The rate limit decision and metadata.
   */
  consume(key: string, cost: number): Promise<RateLimitResult>;

  /**
   * Check the current state for a key without consuming any permits.
   *
   * @param key Identifier for the rate limit subject.
   * @param cost Number of permits to check.
   * @returns The rate limit decision and metadata.
   */
  peek(key: string, cost: number): Promise<RateLimitResult>;

  /**
   * Reset all state for a key, restoring it to full capacity.
   *
   * @param key Identifier for the rate limit subject.
   * @returns Resolves when the key has been reset.
   */
  reset(key: string): Promise<void>;
}
