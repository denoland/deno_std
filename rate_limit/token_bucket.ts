// Copyright 2018-2026 the Deno authors. MIT license.

import type { QueueOptions, ReplenishingRateLimiter } from "./types.ts";
import { createReplenishingLimiter } from "./_replenishing_limiter.ts";
import { createTokenBucketOps } from "./_algorithms.ts";
import {
  assertNonNegativeInteger,
  assertPositiveFinite,
  assertPositiveInteger,
  assertTimerInterval,
} from "./_validation.ts";

/**
 * Options for {@linkcode createTokenBucket}.
 *
 * @experimental **UNSTABLE**: New API, yet to be vetted.
 */
export interface TokenBucketOptions extends QueueOptions {
  /** Maximum tokens the bucket can hold. */
  limit: number;
  /** Tokens added each replenishment period. */
  tokensPerPeriod: number;
  /** Replenishment interval in milliseconds. */
  replenishmentPeriod: number;
  /**
   * Refill tokens automatically. Tokens are always accounted for lazily on
   * acquire; the internal timer is only started when `queueLimit` is
   * greater than `0`, to drain waiters. It requires `replenishmentPeriod`
   * to be at most 2^31 - 1 milliseconds (the `setInterval` limit).
   *
   * When `false`, call {@linkcode ReplenishingRateLimiter.replenish}
   * manually.
   *
   * @default {true}
   */
  autoReplenishment?: boolean;
  /**
   * Clock function returning the current time in milliseconds. Override
   * for deterministic testing.
   *
   * @default {Date.now}
   */
  clock?: () => number;
}

/**
 * Create a token bucket rate limiter. Tokens are added periodically, making
 * this strategy ideal for smoothing bursty traffic.
 *
 * @experimental **UNSTABLE**: New API, yet to be vetted.
 *
 * @example Basic usage
 * ```ts
 * import { createTokenBucket } from "@std/rate-limit/token-bucket";
 * import { assert } from "@std/assert";
 *
 * using limiter = createTokenBucket({
 *   limit: 10,
 *   tokensPerPeriod: 1,
 *   replenishmentPeriod: 1000,
 * });
 *
 * using lease = limiter.tryAcquire();
 * assert(lease.acquired);
 * ```
 *
 * @example Manual replenishment
 * ```ts
 * import { createTokenBucket } from "@std/rate-limit/token-bucket";
 * import { assert } from "@std/assert";
 *
 * let now = 0;
 * using limiter = createTokenBucket({
 *   limit: 10,
 *   tokensPerPeriod: 5,
 *   replenishmentPeriod: 1000,
 *   autoReplenishment: false,
 *   clock: () => now,
 * });
 *
 * limiter.tryAcquire(10); // drain the bucket
 * now += 1000;
 * limiter.replenish(); // refills 5 tokens for the elapsed period
 * assert(limiter.tryAcquire(5).acquired);
 * ```
 *
 * @param options Configuration for the token bucket.
 * @returns A {@linkcode ReplenishingRateLimiter}.
 */
export function createTokenBucket(
  options: TokenBucketOptions,
): ReplenishingRateLimiter {
  const context = "token bucket";
  assertPositiveInteger(context, "limit", options.limit);
  assertPositiveInteger(context, "tokensPerPeriod", options.tokensPerPeriod);
  assertPositiveFinite(
    context,
    "replenishmentPeriod",
    options.replenishmentPeriod,
  );
  if (options.tokensPerPeriod > options.limit) {
    throw new RangeError(
      `Cannot create token bucket: 'tokensPerPeriod' (${options.tokensPerPeriod}) exceeds 'limit' (${options.limit})`,
    );
  }
  assertNonNegativeInteger(context, "queueLimit", options.queueLimit);

  const { limit, tokensPerPeriod, replenishmentPeriod } = options;
  const autoReplenishment = options.autoReplenishment ?? true;
  if (autoReplenishment && (options.queueLimit ?? 0) > 0) {
    assertTimerInterval(context, "'replenishmentPeriod'", replenishmentPeriod);
  }
  const clock = options.clock ?? Date.now;
  const ops = createTokenBucketOps(
    limit,
    replenishmentPeriod,
    tokensPerPeriod,
  );
  const state = ops.create(clock());

  return createReplenishingLimiter(
    {
      replenishmentPeriod,
      autoReplenishment,
      queueLimit: options.queueLimit ?? 0,
      queueOrder: options.queueOrder ?? "oldest-first",
    },
    {
      get permitLimit() {
        return ops.limit;
      },
      tryAcquirePermits(permits: number): boolean {
        const now = clock();
        ops.advance(state, now);
        return ops.tryConsume(state, permits, now);
      },
      replenish(): void {
        ops.advance(state, clock());
      },
      computeRetryAfter(permits: number): number {
        return Math.max(0, ops.computeRetryAfter(state, permits, clock()));
      },
    },
  );
}
