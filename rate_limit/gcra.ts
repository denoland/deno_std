// Copyright 2018-2026 the Deno authors. MIT license.

import type { QueueOptions, ReplenishingRateLimiter } from "./types.ts";
import { createReplenishingLimiter } from "./_replenishing_limiter.ts";
import { createGcraOps } from "./_algorithms.ts";
import {
  assertNonNegativeInteger,
  assertPositiveInteger,
  assertTimerInterval,
} from "./_validation.ts";

/**
 * Options for {@linkcode createGcra}.
 *
 * @experimental **UNSTABLE**: New API, yet to be vetted.
 */
export interface GcraOptions extends QueueOptions {
  /** Maximum burst of permits, and permits allowed per window on average. */
  limit: number;
  /**
   * Positive integer duration in milliseconds over which `limit` permits
   * are allowed. `window * limit` must be below `2 ** 53`.
   */
  window: number;
  /**
   * Drain queued waiters automatically as capacity frees up. Capacity is
   * always accounted for lazily on acquire; the internal timer is only
   * started when `queueLimit` is greater than `0`, ticking once per
   * emission interval (`window` / `limit`). It requires the emission
   * interval to be at most 2^31 - 1 milliseconds (the `setInterval` limit).
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
 * Create a GCRA (Generic Cell Rate Algorithm) rate limiter. GCRA enforces
 * a smooth request rate on a continuous clock: each acquired permit
 * advances a theoretical arrival time by one emission interval
 * (`window` / `limit`), and requests are allowed while the accumulated
 * debt stays within one window. Bursts up to `limit` are allowed after
 * idle periods, capacity frees up continuously rather than at cycle
 * boundaries, and boundary bursts (the fixed-window failure mode) are
 * impossible.
 *
 * @experimental **UNSTABLE**: New API, yet to be vetted.
 *
 * @example Basic usage
 * ```ts
 * import { createGcra } from "@std/rate-limit/gcra";
 * import { assert } from "@std/assert";
 *
 * using limiter = createGcra({
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
 * import { createGcra } from "@std/rate-limit/gcra";
 * import { assert } from "@std/assert";
 *
 * let now = 0;
 * using limiter = createGcra({
 *   limit: 100,
 *   window: 60_000,
 *   autoReplenishment: false,
 *   clock: () => now,
 * });
 *
 * limiter.tryAcquire(100); // exhaust the burst capacity
 * now += 60_000;
 * limiter.replenish(); // drains queued waiters at the current time
 * assert(limiter.tryAcquire().acquired);
 * ```
 *
 * @param options Configuration for the GCRA limiter.
 * @returns A {@linkcode ReplenishingRateLimiter}.
 */
export function createGcra(options: GcraOptions): ReplenishingRateLimiter {
  const context = "gcra";
  assertPositiveInteger(context, "limit", options.limit);
  assertPositiveInteger(context, "window", options.window);
  assertNonNegativeInteger(context, "queueLimit", options.queueLimit);

  const { limit, window } = options;
  const emissionInterval = window / limit;
  const autoReplenishment = options.autoReplenishment ?? true;
  if (autoReplenishment && (options.queueLimit ?? 0) > 0) {
    assertTimerInterval(context, "'window' / 'limit'", emissionInterval);
  }
  const clock = options.clock ?? Date.now;
  const ops = createGcraOps(limit, window);
  const state = ops.create(clock());

  return createReplenishingLimiter(
    {
      replenishmentPeriod: emissionInterval,
      autoReplenishment,
      queueLimit: options.queueLimit ?? 0,
      queueOrder: options.queueOrder ?? "oldest-first",
    },
    {
      get permitLimit() {
        return ops.limit;
      },
      tryAcquirePermits(permits: number): boolean {
        return ops.tryConsume(state, permits, clock());
      },
      // GCRA state is continuous — capacity frees up as the clock advances,
      // so draining the queue needs no state mutation.
      replenish(): void {},
      computeRetryAfter(permits: number): number {
        return Math.max(0, ops.computeRetryAfter(state, permits, clock()));
      },
    },
  );
}
