// Copyright 2018-2026 the Deno authors. MIT license.

import type { QueueOptions, ReplenishingRateLimiter } from "./types.ts";
import { createReplenishingLimiter } from "./_replenishing_limiter.ts";
import { createSlidingWindowOps } from "./_algorithms.ts";
import {
  assertNonNegativeInteger,
  assertPositiveFinite,
  assertPositiveInteger,
  assertTimerInterval,
} from "./_validation.ts";

/**
 * Options for {@linkcode createSlidingWindow}.
 *
 * @experimental **UNSTABLE**: New API, yet to be vetted.
 */
export interface SlidingWindowOptions extends QueueOptions {
  /** Maximum permits across the sliding window. */
  limit: number;
  /** Total window duration in milliseconds. */
  window: number;
  /**
   * Number of segments within the window. Higher values give smoother rate
   * enforcement at the cost of more frequent timer ticks. Must be at least 2
   * (1 segment degenerates to a fixed window).
   */
  segmentsPerWindow: number;
  /**
   * Rotate segments automatically. Permits are always accounted for lazily
   * on acquire; the internal timer is only started when `queueLimit` is
   * greater than `0`, to drain waiters. It requires the segment duration
   * (`window` / `segmentsPerWindow`) to be at most 2^31 - 1 milliseconds
   * (the `setInterval` limit).
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
 * Create a sliding window rate limiter. The window is divided into segments
 * that rotate individually, giving smoother rate enforcement than a fixed
 * window. Unlike a fixed window, a burst at the boundary cannot exceed the
 * permit limit.
 *
 * @experimental **UNSTABLE**: New API, yet to be vetted.
 *
 * @example Basic usage
 * ```ts
 * import { createSlidingWindow } from "@std/rate-limit/sliding-window";
 * import { assert } from "@std/assert";
 *
 * using limiter = createSlidingWindow({
 *   limit: 100,
 *   window: 60_000,
 *   segmentsPerWindow: 6,
 * });
 *
 * using lease = limiter.tryAcquire();
 * assert(lease.acquired);
 * ```
 *
 * @example Manual replenishment
 * ```ts
 * import { createSlidingWindow } from "@std/rate-limit/sliding-window";
 * import { assert } from "@std/assert";
 *
 * let now = 0;
 * using limiter = createSlidingWindow({
 *   limit: 100,
 *   window: 60_000,
 *   segmentsPerWindow: 6,
 *   autoReplenishment: false,
 *   clock: () => now,
 * });
 *
 * limiter.tryAcquire(100); // exhaust the window
 * now += 60_000;
 * limiter.replenish(); // rotates the segments elapsed since creation
 * assert(limiter.tryAcquire().acquired);
 * ```
 *
 * @param options Configuration for the sliding window.
 * @returns A {@linkcode ReplenishingRateLimiter}.
 */
export function createSlidingWindow(
  options: SlidingWindowOptions,
): ReplenishingRateLimiter {
  const context = "sliding window";
  assertPositiveInteger(context, "limit", options.limit);
  assertPositiveFinite(context, "window", options.window);
  if (
    !Number.isInteger(options.segmentsPerWindow) ||
    options.segmentsPerWindow < 2
  ) {
    throw new RangeError(
      `Cannot create sliding window: 'segmentsPerWindow' must be an integer >= 2, received ${options.segmentsPerWindow}`,
    );
  }
  assertNonNegativeInteger(context, "queueLimit", options.queueLimit);

  const { limit, segmentsPerWindow, window } = options;
  const segmentDuration = window / segmentsPerWindow;
  const autoReplenishment = options.autoReplenishment ?? true;
  if (autoReplenishment && (options.queueLimit ?? 0) > 0) {
    assertTimerInterval(
      context,
      "'window' / 'segmentsPerWindow'",
      segmentDuration,
    );
  }
  const clock = options.clock ?? Date.now;
  const ops = createSlidingWindowOps(limit, window, segmentsPerWindow);
  const state = ops.create(clock());

  return createReplenishingLimiter(
    {
      replenishmentPeriod: segmentDuration,
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
