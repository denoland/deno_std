// Copyright 2018-2026 the Deno authors. MIT license.

import type { QueueOptions, ReplenishingRateLimiter } from "./types.ts";
import { createReplenishingLimiter } from "./_replenishing_limiter.ts";
import { createFixedWindowOps } from "./_algorithms.ts";
import {
  assertNonNegativeInteger,
  assertPositiveFinite,
  assertPositiveInteger,
  assertTimerInterval,
} from "./_validation.ts";

/**
 * Options for {@linkcode createFixedWindow}.
 *
 * @experimental **UNSTABLE**: New API, yet to be vetted.
 */
export interface FixedWindowOptions extends QueueOptions {
  /** Maximum permits per window. */
  limit: number;
  /** Window duration in milliseconds. */
  window: number;
  /**
   * Rotate the window automatically. Permits are always accounted for
   * lazily on acquire; the internal timer is only started when `queueLimit`
   * is greater than `0`, to drain waiters. It requires `window` to be at
   * most 2^31 - 1 milliseconds (the `setInterval` limit).
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
 * Create a fixed window rate limiter. A counter resets at the start of each
 * window, making this the simplest time-windowed strategy — ideal for HTTP
 * servers and 429 response logic.
 *
 * @experimental **UNSTABLE**: New API, yet to be vetted.
 *
 * @example Basic usage
 * ```ts
 * import { createFixedWindow } from "@std/rate-limit/fixed-window";
 * import { assert } from "@std/assert";
 *
 * using limiter = createFixedWindow({
 *   limit: 100,
 *   window: 60_000,
 * });
 *
 * using lease = limiter.tryAcquire();
 * assert(lease.acquired);
 * ```
 *
 * @example Manual replenishment
 * ```ts
 * import { createFixedWindow } from "@std/rate-limit/fixed-window";
 * import { assert } from "@std/assert";
 *
 * let now = 0;
 * using limiter = createFixedWindow({
 *   limit: 100,
 *   window: 60_000,
 *   autoReplenishment: false,
 *   clock: () => now,
 * });
 *
 * limiter.tryAcquire(100); // exhaust the window
 * now += 60_000;
 * limiter.replenish(); // rotates the window for the elapsed time
 * assert(limiter.tryAcquire().acquired);
 * ```
 *
 * @param options Configuration for the fixed window.
 * @returns A {@linkcode ReplenishingRateLimiter}.
 */
export function createFixedWindow(
  options: FixedWindowOptions,
): ReplenishingRateLimiter {
  const context = "fixed window";
  assertPositiveInteger(context, "limit", options.limit);
  assertPositiveFinite(context, "window", options.window);
  assertNonNegativeInteger(context, "queueLimit", options.queueLimit);

  const { limit, window: windowMs } = options;
  const autoReplenishment = options.autoReplenishment ?? true;
  if (autoReplenishment && (options.queueLimit ?? 0) > 0) {
    assertTimerInterval(context, "'window'", windowMs);
  }
  const clock = options.clock ?? Date.now;
  const ops = createFixedWindowOps(limit, windowMs);
  const state = ops.create(clock());

  return createReplenishingLimiter(
    {
      replenishmentPeriod: windowMs,
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
