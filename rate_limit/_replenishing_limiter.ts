// Copyright 2018-2026 the Deno authors. MIT license.

import type {
  AcquiredLease,
  AcquireOptions,
  RateLimitLease,
  RejectedLease,
  ReplenishingRateLimiter,
} from "./types.ts";
import { Deque } from "@std/data-structures/deque";
import { unrefTimer } from "./_unref_timer.ts";

type RejectionReason =
  | "Insufficient permits"
  | "Queue limit exceeded"
  | "Rate limiter has been disposed"
  | "Evicted by newer request";

const DISPOSED_REASON: RejectionReason = "Rate limiter has been disposed";
const ABORTED_REASON = "Acquire was aborted";

function noop() {}

const ACQUIRED_LEASE: AcquiredLease = Object.freeze({
  acquired: true,
  [Symbol.dispose]: noop,
});

function createRejectedLease(
  retryAfter: number,
  reason: RejectionReason,
): RejectedLease {
  return {
    acquired: false as const,
    retryAfter,
    reason,
    [Symbol.dispose]: noop,
  };
}

/** Pending waiter in the queue. */
interface Waiter {
  readonly permits: number;
  resolve(lease: RateLimitLease): void;
  onAbort?: (() => void) | undefined;
}

/**
 * Strategy hooks that define how a specific algorithm acquires and
 * replenishes permits. Passed to {@linkcode createReplenishingLimiter}.
 */
interface ReplenishingStrategy {
  /** Try to consume `permits` from the underlying algorithm. Returns true if acquired. */
  tryAcquirePermits(permits: number): boolean;
  /** Advance the algorithm by one replenishment cycle. */
  replenish(): void;
  /** Compute the retry delay for a denied request of `permits`. */
  computeRetryAfter(permits: number): number;
  /** The maximum permits that can be acquired in a single call. */
  readonly permitLimit: number;
}

/** Configuration for {@linkcode createReplenishingLimiter}. */
interface ReplenishingLimiterConfig {
  replenishmentPeriod: number;
  autoReplenishment: boolean;
  queueLimit: number;
  queueOrder: "oldest-first" | "newest-first";
}

/**
 * Create a {@linkcode ReplenishingRateLimiter} that delegates permit
 * accounting to the provided strategy. Handles queueing, disposal,
 * abort signals, and the replenishment timer.
 */
export function createReplenishingLimiter(
  config: ReplenishingLimiterConfig,
  strategy: ReplenishingStrategy,
): ReplenishingRateLimiter {
  const queue = new Deque<Waiter>();
  let queuedPermits = 0;
  let timer: ReturnType<typeof setInterval> | undefined;
  let disposed = false;

  if (
    config.queueOrder !== "oldest-first" &&
    config.queueOrder !== "newest-first"
  ) {
    throw new TypeError(
      `Cannot create limiter: unknown queueOrder '${config
        .queueOrder as string}'`,
    );
  }

  const isNewestFirst = config.queueOrder === "newest-first";

  // Without a queue there is nothing to drain; `tryAcquirePermits` already
  // advances the algorithm lazily, so a timer would only burn CPU.
  if (config.autoReplenishment && config.queueLimit > 0) {
    timer = setInterval(replenishAndDrain, config.replenishmentPeriod);
    unrefTimer(timer);
  }

  function peekNext(): Waiter | undefined {
    return isNewestFirst ? queue.peekBack() : queue.peekFront();
  }

  function popNext(): Waiter | undefined {
    return isNewestFirst ? queue.popBack() : queue.popFront();
  }

  /**
   * Replenish permits and drain the queue in priority order. Stops at the
   * first waiter whose permit demand exceeds the available supply. With
   * `newest-first`, this means a large newest request blocks smaller older
   * ones until enough permits accumulate.
   */
  function replenishAndDrain(): void {
    if (disposed) return;
    strategy.replenish();

    let waiter = peekNext();
    while (waiter !== undefined) {
      if (!strategy.tryAcquirePermits(waiter.permits)) break;
      popNext();
      queuedPermits -= waiter.permits;
      resolveWaiter(waiter, ACQUIRED_LEASE);
      waiter = peekNext();
    }
  }

  function resolveWaiter(waiter: Waiter, lease: RateLimitLease): void {
    try {
      if (waiter.onAbort) {
        waiter.onAbort();
        waiter.onAbort = undefined;
      }
    } finally {
      waiter.resolve(lease);
    }
  }

  function removeWaiter(waiter: Waiter): void {
    const removed = queue.removeFirst((w) => w === waiter);
    if (removed !== undefined) {
      queuedPermits -= waiter.permits;
    }
  }

  /**
   * Evicts the oldest waiters until `permits` fits under the queue limit.
   * Only called in newest-first mode.
   */
  function evictOldest(permits: number): void {
    while (queuedPermits + permits > config.queueLimit) {
      const evicted = queue.popFront();
      if (!evicted) break;
      queuedPermits -= evicted.permits;
      resolveWaiter(
        evicted,
        createRejectedLease(
          strategy.computeRetryAfter(evicted.permits),
          "Evicted by newer request",
        ),
      );
    }
  }

  function tryAcquire(permits = 1): RateLimitLease {
    if (permits < 1 || !Number.isInteger(permits)) {
      throw new RangeError(
        `Cannot acquire: 'permits' must be a positive integer, received ${permits}`,
      );
    }
    if (permits > strategy.permitLimit) {
      throw new RangeError(
        `Cannot acquire: 'permits' (${permits}) exceeds the permit limit (${strategy.permitLimit})`,
      );
    }
    if (disposed) {
      return createRejectedLease(0, DISPOSED_REASON);
    }

    if (strategy.tryAcquirePermits(permits)) {
      return ACQUIRED_LEASE;
    }
    return createRejectedLease(
      strategy.computeRetryAfter(permits),
      "Insufficient permits",
    );
  }

  function acquire(
    permits = 1,
    options?: AcquireOptions,
  ): Promise<RateLimitLease> {
    if (permits < 1 || !Number.isInteger(permits)) {
      return Promise.reject(
        new RangeError(
          `Cannot acquire: 'permits' must be a positive integer, received ${permits}`,
        ),
      );
    }
    if (permits > strategy.permitLimit) {
      return Promise.reject(
        new RangeError(
          `Cannot acquire: 'permits' (${permits}) exceeds the permit limit (${strategy.permitLimit})`,
        ),
      );
    }

    const signal = options?.signal;
    if (signal?.aborted) {
      return Promise.reject(
        signal.reason ?? new DOMException(ABORTED_REASON, "AbortError"),
      );
    }

    if (disposed) {
      return Promise.resolve(createRejectedLease(0, DISPOSED_REASON));
    }

    if (strategy.tryAcquirePermits(permits)) {
      return Promise.resolve(ACQUIRED_LEASE);
    }

    if (queuedPermits + permits > config.queueLimit) {
      // Eviction only happens in newest-first mode, where the newest request
      // has priority; in oldest-first mode the incoming request is rejected
      // so queued waiters keep their FIFO position.
      const canEvict = isNewestFirst &&
        queue.length > 0 &&
        config.queueLimit > 0 &&
        permits <= config.queueLimit;

      if (!canEvict) {
        return Promise.resolve(
          createRejectedLease(
            strategy.computeRetryAfter(permits),
            "Queue limit exceeded",
          ),
        );
      }
      evictOldest(permits);
    }

    return new Promise<RateLimitLease>((resolve, reject) => {
      const waiter: Waiter = { permits, resolve };
      queue.pushBack(waiter);
      queuedPermits += permits;

      if (signal) {
        const onAbort = () => {
          removeWaiter(waiter);
          reject(
            signal.reason ?? new DOMException(ABORTED_REASON, "AbortError"),
          );
        };
        waiter.onAbort = () => signal.removeEventListener("abort", onAbort);
        signal.addEventListener("abort", onAbort, { once: true });
      }
    });
  }

  function replenish(): void {
    if (config.autoReplenishment) {
      throw new Error(
        "Cannot replenish: limiter uses automatic replenishment",
      );
    }
    replenishAndDrain();
  }

  function dispose(): void {
    if (disposed) return;
    disposed = true;

    if (timer !== undefined) {
      clearInterval(timer);
      timer = undefined;
    }

    const lease = createRejectedLease(0, DISPOSED_REASON);
    let waiter = queue.popFront();
    while (waiter !== undefined) {
      resolveWaiter(waiter, lease);
      waiter = queue.popFront();
    }
    queuedPermits = 0;
  }

  return {
    tryAcquire,
    acquire,
    replenish,
    [Symbol.dispose]: dispose,
  };
}
