// Copyright 2018-2026 the Deno authors. MIT license.
// This module is browser compatible.

/**
 * A rate limiter that controls how many permits can be acquired over time or
 * concurrently. Implementations are disposable — disposing a limiter cancels
 * any internal timers and rejects queued waiters.
 *
 * @experimental **UNSTABLE**: New API, yet to be vetted.
 *
 * @example Synchronous usage
 * ```ts
 * import type { RateLimiter } from "@std/rate-limit/types";
 *
 * function useRateLimiter(limiter: RateLimiter) {
 *   using lease = limiter.tryAcquire();
 *   if (!lease.acquired) {
 *     return; // rate limited
 *   }
 *   // proceed with work
 * }
 * ```
 *
 * @example Async usage with queuing
 * ```ts
 * import type { RateLimiter } from "@std/rate-limit/types";
 *
 * async function useRateLimiter(limiter: RateLimiter) {
 *   using lease = await limiter.acquire(1, {
 *     signal: AbortSignal.timeout(5000),
 *   });
 *   // proceed with work
 * }
 * ```
 *
 * @see {@linkcode createRateLimiter} for keyed rate limiting (primary API).
 * @see {@linkcode createTokenBucket} for token bucket rate limiting.
 * @see {@linkcode createFixedWindow} for fixed window rate limiting.
 * @see {@linkcode createSlidingWindow} for sliding window rate limiting.
 * @see {@linkcode createGcra} for GCRA rate limiting.
 */
export interface RateLimiter extends Disposable {
  /**
   * Try to acquire permits synchronously. Never blocks.
   *
   * @param permits Number of permits to acquire. Defaults to `1`.
   * @returns A {@linkcode RateLimitLease} indicating success or rejection.
   */
  tryAcquire(permits?: number): RateLimitLease;

  /**
   * Wait for permits. Resolves immediately when permits are available.
   * When no permits are available and a queue is configured, the request
   * is queued until permits are replenished.
   *
   * **Disposal behavior:** calling `acquire()` after the limiter has been
   * disposed resolves with a {@linkcode RejectedLease} (`retryAfter: 0`),
   * as do waiters still queued at the time of disposal, so all outcomes
   * can be handled uniformly via the `acquired` field.
   *
   * Rejects with {@linkcode DOMException} if the signal is aborted.
   *
   * @param permits Number of permits to acquire. Defaults to `1`.
   * @param options Acquire options (e.g. abort signal).
   * @returns A {@linkcode RateLimitLease} indicating success or rejection.
   */
  acquire(
    permits?: number,
    options?: AcquireOptions,
  ): Promise<RateLimitLease>;
}

/**
 * A {@linkcode RateLimiter} that replenishes permits on a timer. Extends
 * `RateLimiter` with a {@linkcode ReplenishingRateLimiter.replenish}
 * method for manual replenishment when `autoReplenishment` is `false`.
 *
 * @experimental **UNSTABLE**: New API, yet to be vetted.
 */
export interface ReplenishingRateLimiter extends RateLimiter {
  /**
   * Advance the limiter to the current time — rotating windows or segments
   * and refilling tokens for the time elapsed since the last advance — then
   * drain queued waiters. Call this periodically when `autoReplenishment`
   * is `false`; it has no effect on permit accounting when no time has
   * elapsed.
   *
   * @throws {Error} If the limiter uses automatic replenishment.
   */
  replenish(): void;
}

/**
 * Options for {@linkcode RateLimiter.acquire}.
 *
 * @experimental **UNSTABLE**: New API, yet to be vetted.
 */
export interface AcquireOptions {
  /** Signal to abort the wait. */
  signal?: AbortSignal;
}

/**
 * The result of a rate limit acquisition attempt, discriminated on the
 * {@linkcode RateLimitLease.acquired | acquired} field. TypeScript narrows
 * the type after checking `acquired`, so `retryAfter` and `reason` are only
 * present on rejected leases.
 *
 * @experimental **UNSTABLE**: New API, yet to be vetted.
 *
 * @example Checking a lease
 * ```ts
 * import { createTokenBucket } from "@std/rate-limit/token-bucket";
 *
 * using limiter = createTokenBucket({
 *   limit: 10,
 *   tokensPerPeriod: 1,
 *   replenishmentPeriod: 1000,
 * });
 *
 * using lease = limiter.tryAcquire();
 * if (!lease.acquired) {
 *   console.log(`Retry after ${lease.retryAfter}ms: ${lease.reason}`);
 * }
 * ```
 */
export type RateLimitLease = AcquiredLease | RejectedLease;

/**
 * A lease indicating that permits were successfully acquired. For concurrency
 * limiters, disposing the lease releases the permit. For time-based limiters,
 * dispose is a no-op.
 *
 * @experimental **UNSTABLE**: New API, yet to be vetted.
 */
export interface AcquiredLease extends Disposable {
  /** Whether permits were acquired. Always `true` for this type. */
  readonly acquired: true;
}

/**
 * A lease indicating that permits could not be acquired.
 *
 * @experimental **UNSTABLE**: New API, yet to be vetted.
 */
export interface RejectedLease extends Disposable {
  /** Whether permits were acquired. Always `false` for this type. */
  readonly acquired: false;
  /**
   * Suggested retry delay in milliseconds. A value of `0` means retrying
   * will not help (e.g. the limiter has been disposed).
   */
  readonly retryAfter: number;
  /** Human-readable reason for rejection. */
  readonly reason: string;
}

/**
 * Queue configuration shared across all rate limiter algorithms.
 *
 * @experimental **UNSTABLE**: New API, yet to be vetted.
 */
export interface QueueOptions {
  /** Max permits that can be queued waiting. Defaults to `0` (no queueing). */
  queueLimit?: number;
  /**
   * Queue processing order. Defaults to `"oldest-first"`.
   *
   * With `"newest-first"`, the most recently queued request is served first.
   * This can starve older waiters when demand consistently exceeds supply.
   */
  queueOrder?: "oldest-first" | "newest-first";
}
