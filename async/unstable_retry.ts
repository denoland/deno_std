// Copyright 2018-2026 the Deno authors. MIT license.
// This module is browser compatible.
import { delay } from "./delay.ts";
import { exponentialBackoffWithJitter } from "./_util.ts";
import {
  RetryError,
  type RetryOptions as StableRetryOptions,
} from "./retry.ts";

export { RetryError };

/**
 * Options for {@linkcode retry}.
 *
 * @experimental **UNSTABLE**: New API, yet to be vetted.
 */
export interface RetryOptions extends StableRetryOptions {
  /**
   * Selects how long to wait before an eligible retry.
   *
   * Called once before each retry, after `isRetriable` accepted the error and
   * the attempt budget was checked, and never on success, on exhaustion, for a
   * non-retriable error, or when `signal` is already aborted. A wait that is
   * selected here can still be cancelled by `signal`.
   *
   * The returned value replaces the whole wait: `minTimeout`, `maxTimeout`
   * and `jitter` shape the `computedDelay` passed in, but are not applied to
   * the result. Returning `computedDelay` keeps the backoff.
   * `Infinity` waits until cancellation rather than stopping the retries.
   *
   * The callback is synchronous and its result is never awaited. If it throws,
   * {@linkcode retry} rejects with that value and makes no further attempts.
   *
   * @default {undefined}
   *
   * @param error The error or other value thrown by the failed attempt.
   * @param attempt The 1-based number of the attempt that just failed,
   * ranging from `1` to `maxAttempts - 1`.
   * @param computedDelay The number of milliseconds the backoff selected for
   * this retry, after capping and jitter.
   * @returns The number of milliseconds to wait before the next attempt.
   */
  getDelay?: (
    error: unknown,
    attempt: number,
    computedDelay: number,
  ) => number;
}

function selectDelay(
  getDelay: (error: unknown, attempt: number, computedDelay: number) => number,
  error: unknown,
  attempt: number,
  computedDelay: number,
): number {
  const selected = getDelay(error, attempt, computedDelay);
  if (typeof selected !== "number") {
    throw new TypeError(
      `Cannot retry as 'getDelay' must return a number: current value is of type ${typeof selected}`,
    );
  }
  if (Number.isNaN(selected) || selected < 0) {
    throw new RangeError(
      `Cannot retry as 'getDelay' must return a non-negative number: current value is ${selected}`,
    );
  }
  return selected;
}

/**
 * Calls the given (possibly asynchronous) function up to `maxAttempts` times.
 * Retries as long as the given function throws. If the attempts are exhausted,
 * throws a {@linkcode RetryError} with `cause` set to the inner exception.
 *
 * @experimental **UNSTABLE**: New API, yet to be vetted.
 *
 * Unlike the stable `retry` from `@std/async/retry`, the wait before each
 * retry can be selected by the `getDelay` option, which is how a caller
 * honors a server's `Retry-After` without owning the retry loop.
 *
 * The backoff is calculated by multiplying `minTimeout` with `multiplier` to the power of the current attempt counter (starting at 0 up to `maxAttempts - 1`). It is capped at `maxTimeout` however.
 * How long the actual delay is, depends on `jitter`.
 *
 * When `jitter` is the default value of `1`, waits between two attempts for a
 * randomized amount between 0 and the backoff time. With the default options
 * the maximal delay will be `15s = 1s + 2s + 4s + 8s`. If all five attempts
 * are exhausted the mean delay will be `9.5s = ½(4s + 15s)`.
 *
 * When `jitter` is `0`, waits the full backoff time.
 *
 * @example Example configuration 1
 * ```ts no-assert
 * import { retry } from "@std/async/unstable-retry";
 * const req = async () => {
 *  // some function that throws sometimes
 * };
 *
 * // Below resolves to the first non-error result of `req`
 * const retryPromise = await retry(req, {
 *  multiplier: 2,
 *  maxTimeout: 60000,
 *  maxAttempts: 5,
 *  minTimeout: 100,
 *  jitter: 1,
 * });
 * ```
 *
 * @example Example configuration 2
 * ```ts no-assert
 * import { retry } from "@std/async/unstable-retry";
 * const req = async () => {
 *  // some function that throws sometimes
 * };
 *
 * // Make sure we wait at least 1 minute, but at most 2 minutes
 * const retryPromise = await retry(req, {
 *  multiplier: 2.34,
 *  maxTimeout: 80000,
 *  maxAttempts: 7,
 *  minTimeout: 1000,
 *  jitter: 0.5,
 * });
 * ```
 *
 * @example Only retry on specific error types
 * ```ts no-assert
 * import { retry } from "@std/async/unstable-retry";
 *
 * class HttpError extends Error {
 *   status: number;
 *   constructor(status: number) {
 *     super(`HTTP ${status}`);
 *     this.status = status;
 *   }
 * }
 *
 * const req = async () => {
 *   // some function that throws HttpError
 * };
 *
 * // Only retry on 429 (rate limit) or 5xx (server) errors
 * const retryPromise = await retry(req, {
 *   isRetriable: (err) =>
 *     err instanceof HttpError && (err.status === 429 || err.status >= 500),
 * });
 * ```
 *
 * @example Waiting as long as the server asked
 *
 * Waiting for the longer of the backoff and the server's instruction keeps the
 * retry from arriving before the server is ready, while the backoff still
 * grows when the server gives no instruction.
 *
 * ```ts
 * import { retry } from "@std/async/unstable-retry";
 * import { assertEquals } from "@std/assert";
 *
 * class RateLimited extends Error {
 *   retryAfterMs: number;
 *   constructor(retryAfterMs: number) {
 *     super("Too many requests");
 *     this.retryAfterMs = retryAfterMs;
 *   }
 * }
 *
 * let attempts = 0;
 * const waits: number[] = [];
 *
 * const result = await retry(() => {
 *   attempts++;
 *   if (attempts === 1) throw new RateLimited(30);
 *   if (attempts === 2) throw new Error("Service unavailable");
 *   return "ok";
 * }, {
 *   minTimeout: 1,
 *   jitter: 0,
 *   getDelay(error, _attempt, computedDelay) {
 *     const wait = error instanceof RateLimited
 *       ? Math.max(computedDelay, error.retryAfterMs)
 *       : computedDelay;
 *     waits.push(wait);
 *     return wait;
 *   },
 * });
 *
 * assertEquals(result, "ok");
 * assertEquals(waits, [30, 2]);
 * ```
 *
 * @typeParam T The return type of the function to retry and returned promise.
 * @param fn The function to retry.
 * @param options Additional options.
 * @returns The promise that resolves with the value returned by the function to retry.
 * @throws {RetryError} If the function fails after `maxAttempts` attempts.
 * @throws If the `signal` is aborted, throws the signal's reason.
 * @throws If `isRetriable` returns `false` for an error, throws that error immediately.
 * @throws If `getDelay` throws, throws that value without further attempts.
 * @throws {TypeError} If `getDelay` returns a non-number.
 * @throws {RangeError} If `getDelay` returns a negative number or `NaN`.
 */
export async function retry<T>(
  fn: (() => Promise<T>) | (() => T),
  options?: RetryOptions,
): Promise<T> {
  const {
    multiplier = 2,
    maxTimeout = 60000,
    maxAttempts = 5,
    minTimeout = 1000,
    jitter = 1,
    isRetriable = () => true,
    signal,
    getDelay,
  } = options ?? {};

  if (!Number.isInteger(maxAttempts) || maxAttempts < 1) {
    throw new RangeError(
      `Cannot retry as 'maxAttempts' must be a positive integer: current value is ${maxAttempts}`,
    );
  }
  if (!Number.isFinite(multiplier) || multiplier < 1) {
    throw new RangeError(
      `Cannot retry as 'multiplier' must be a finite number >= 1: current value is ${multiplier}`,
    );
  }
  if (Number.isNaN(maxTimeout) || maxTimeout <= 0) {
    throw new RangeError(
      `Cannot retry as 'maxTimeout' must be a positive number: current value is ${maxTimeout}`,
    );
  }
  if (Number.isNaN(minTimeout) || minTimeout < 0) {
    throw new RangeError(
      `Cannot retry as 'minTimeout' must be >= 0: current value is ${minTimeout}`,
    );
  }
  if (minTimeout > maxTimeout) {
    throw new RangeError(
      `Cannot retry as 'minTimeout' must be <= 'maxTimeout': current values 'minTimeout=${minTimeout}', 'maxTimeout=${maxTimeout}'`,
    );
  }
  if (Number.isNaN(jitter) || jitter < 0 || jitter > 1) {
    throw new RangeError(
      `Cannot retry as 'jitter' must be between 0 and 1: current value is ${jitter}`,
    );
  }

  let attempt = 0;
  while (true) {
    signal?.throwIfAborted();

    try {
      return await fn();
    } catch (error) {
      if (!isRetriable(error)) {
        throw error;
      }

      if (attempt + 1 >= maxAttempts) {
        throw new RetryError(error, maxAttempts);
      }

      // An aborted signal means no retry follows, so `getDelay` must not fire.
      // Kept inside the hook path so omitting it preserves stable ordering.
      if (getDelay) signal?.throwIfAborted();

      const computedDelay = exponentialBackoffWithJitter(
        maxTimeout,
        minTimeout,
        attempt,
        multiplier,
        jitter,
      );
      const timeout = getDelay
        ? selectDelay(getDelay, error, attempt + 1, computedDelay)
        : computedDelay;
      await delay(timeout, signal ? { signal } : undefined);
    }
    attempt++;
  }
}
