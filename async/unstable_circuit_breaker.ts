// Copyright 2018-2026 the Deno authors. MIT license.
// This module is browser compatible.

import { RollingCounter } from "@std/data-structures/unstable-rolling-counter";

/**
 * Circuit breaker states following the standard pattern.
 * - `"closed"`: Normal operation, requests pass through
 * - `"open"`: Failing, all requests rejected immediately
 * - `"half_open"`: Testing recovery, limited requests allowed
 *
 * @experimental **UNSTABLE**: New API, yet to be vetted.
 */
export type CircuitState = "closed" | "open" | "half_open";

/**
 * Options for {@linkcode CircuitBreaker}.
 *
 * @experimental **UNSTABLE**: New API, yet to be vetted.
 */
export interface CircuitBreakerOptions<T> {
  /**
   * Failure rate threshold as a ratio between 0 (exclusive) and 1 (inclusive).
   * The circuit opens when the failure rate in the sliding window meets or
   * exceeds this value and at least {@linkcode minimumThroughput} requests
   * have been recorded.
   *
   * @default {0.5}
   */
  failureRateThreshold?: number;

  /**
   * Minimum number of requests in the sliding window before the failure rate
   * is evaluated. Prevents the circuit from tripping on statistically
   * insignificant samples during low traffic.
   *
   * @default {20}
   */
  minimumThroughput?: number;

  /**
   * Duration of the sliding window in milliseconds.
   *
   * @default {60000}
   */
  windowMs?: number;

  /**
   * Number of segments the sliding window is divided into. More segments
   * give finer-grained decay at the cost of slightly more memory.
   *
   * @default {10}
   */
  segmentsPerWindow?: number;

  /**
   * Duration in milliseconds the circuit stays open before entering half-open.
   *
   * @default {30000}
   */
  cooldownMs?: number;

  /**
   * Number of consecutive successes needed to close from half-open state.
   *
   * @default {2}
   */
  successThreshold?: number;

  /**
   * Maximum concurrent requests allowed in half-open state.
   *
   * @default {3}
   */
  halfOpenMaxConcurrent?: number;

  /**
   * Custom predicate to determine if an error should count as a circuit failure.
   * By default, any thrown error is a failure.
   *
   * @param error The error that was thrown.
   * @returns `true` if the error should count as a circuit failure.
   */
  isFailure?: (error: unknown) => boolean;

  /**
   * Custom predicate to determine if a successful result should count as failure.
   * Useful for HTTP responses where status codes indicate logical failures.
   *
   * @param result The successful result.
   * @returns `true` if the result should count as a circuit failure.
   */
  isResultFailure?: (result: T) => boolean;

  /**
   * Callback invoked when circuit state changes.
   *
   * If this callback throws, the error is reported asynchronously
   * without disrupting circuit breaker operation.
   *
   * @param from Previous state.
   * @param to New state.
   */
  onStateChange?: (from: CircuitState, to: CircuitState) => void;

  /**
   * Callback invoked when a failure is recorded.
   *
   * If this callback throws, the error is reported asynchronously
   * without disrupting circuit breaker operation.
   *
   * @param error The error that caused the failure, or a synthetic error
   *   when the result was classified as failure by
   *   {@linkcode CircuitBreakerOptions.isResultFailure | isResultFailure}.
   * @param failureCount Current number of failures in the window.
   * @param totalRequests Current number of total requests in the window.
   */
  onFailure?: (
    error: unknown,
    failureCount: number,
    totalRequests: number,
  ) => void;

  /**
   * Callback invoked when circuit opens.
   *
   * If this callback throws, the error is reported asynchronously
   * without disrupting circuit breaker operation.
   *
   * @param failureCount Number of failures in the window that triggered the open.
   * @param totalRequests Number of total requests in the window.
   */
  onOpen?: (failureCount: number, totalRequests: number) => void;

  /**
   * Callback invoked when circuit enters half-open state (testing recovery).
   *
   * If this callback throws, the error is reported asynchronously
   * without disrupting circuit breaker operation.
   */
  onHalfOpen?: () => void;

  /**
   * Callback invoked when circuit closes (recovery complete).
   *
   * If this callback throws, the error is reported asynchronously
   * without disrupting circuit breaker operation.
   */
  onClose?: () => void;
}

/**
 * Options for {@linkcode CircuitBreaker.execute}.
 *
 * @experimental **UNSTABLE**: New API, yet to be vetted.
 */
export interface CircuitBreakerExecuteOptions {
  /**
   * An optional abort signal that can be used to cancel the operation
   * before it starts. If the signal is already aborted when `execute` is
   * called, the operation will fail immediately without executing the function.
   *
   * Note: This only checks the abort status before execution. It does not
   * interrupt an in-progress operation — pass the signal to your async
   * function for that behavior.
   */
  signal?: AbortSignal;
}

/**
 * Error thrown when {@linkcode CircuitBreaker} is open and rejects a request.
 *
 * @experimental **UNSTABLE**: New API, yet to be vetted.
 *
 * @example Usage
 * ```ts
 * import { CircuitBreaker, CircuitBreakerOpenError } from "@std/async/unstable-circuit-breaker";
 * import { assert } from "@std/assert";
 *
 * const breaker = new CircuitBreaker({
 *   failureRateThreshold: 1,
 *   minimumThroughput: 1,
 * });
 *
 * // Trigger a failure to open the circuit
 * try {
 *   await breaker.execute(() => Promise.reject(new Error("fail")));
 * } catch (_) {
 *   // Expected to fail
 * }
 *
 * // Now the circuit is open
 * try {
 *   await breaker.execute(() => Promise.resolve("ok"));
 * } catch (error) {
 *   assert(error instanceof CircuitBreakerOpenError);
 *   assert(error.remainingCooldownMs >= 0);
 * }
 * ```
 */
export class CircuitBreakerOpenError extends Error {
  /**
   * Milliseconds until the circuit breaker cooldown expires.
   *
   * @experimental **UNSTABLE**: New API, yet to be vetted.
   *
   * @example Usage
   * ```ts
   * import { CircuitBreakerOpenError } from "@std/async/unstable-circuit-breaker";
   * import { assertEquals } from "@std/assert";
   *
   * const error = new CircuitBreakerOpenError(5000);
   * assertEquals(error.remainingCooldownMs, 5000);
   * ```
   */
  readonly remainingCooldownMs: number;

  /**
   * Constructs a new {@linkcode CircuitBreakerOpenError} instance.
   *
   * @experimental **UNSTABLE**: New API, yet to be vetted.
   *
   * @param remainingCooldownMs The number of milliseconds until the circuit breaker exits the open state.
   */
  constructor(remainingCooldownMs: number) {
    super(
      `Circuit breaker is open: retry after ${remainingCooldownMs}ms`,
    );
    this.name = "CircuitBreakerOpenError";
    this.remainingCooldownMs = remainingCooldownMs;
  }
}

/** Internal state managed by the circuit breaker. */
type CircuitBreakerState =
  | {
    readonly state: "closed";
    readonly openedAt: null;
    readonly consecutiveSuccesses: number;
    readonly halfOpenInFlight: number;
  }
  | {
    readonly state: "open";
    readonly openedAt: number;
    readonly consecutiveSuccesses: number;
    readonly halfOpenInFlight: number;
  }
  | {
    readonly state: "half_open";
    readonly openedAt: number;
    readonly consecutiveSuccesses: number;
    readonly halfOpenInFlight: number;
  };

/** Creates initial circuit breaker state. */
function createInitialState(): CircuitBreakerState & { state: "closed" } {
  return {
    state: "closed",
    consecutiveSuccesses: 0,
    openedAt: null,
    halfOpenInFlight: 0,
  };
}

/** Validates that a value is a finite non-negative number. */
function validateNonNegative(name: string, value: number): void {
  if (!Number.isFinite(value) || value < 0) {
    throw new RangeError(
      `Cannot create circuit breaker: "${name}" must be a finite non-negative number, received ${value}`,
    );
  }
}

/** Validates that a value is a positive integer. */
function validatePositiveInteger(name: string, value: number): void {
  if (!Number.isInteger(value) || value < 1) {
    throw new RangeError(
      `Cannot create circuit breaker: "${name}" must be a positive integer, received ${value}`,
    );
  }
}

/** Validates that a value is in the range (0, 1]. */
function validateRate(name: string, value: number): void {
  if (!Number.isFinite(value) || value <= 0 || value > 1) {
    throw new RangeError(
      `Cannot create circuit breaker: "${name}" must be a finite number in (0, 1], received ${value}`,
    );
  }
}

/**
 * Wraps a notification callback so that if it throws, the error is
 * re-thrown asynchronously (as an uncaught exception) without
 * disrupting the circuit breaker's synchronous control flow.
 */
function safeCallback<A extends unknown[]>(
  fn: ((...args: A) => void) | undefined,
): ((...args: A) => void) | undefined {
  if (!fn) return undefined;
  return (...args: A) => {
    try {
      fn(...args);
    } catch (error) {
      queueMicrotask(() => {
        throw error;
      });
    }
  };
}

/**
 * Calls `fn(arg)` and returns the result. If `fn` throws, the error is
 * reported asynchronously and `undefined` is returned.
 */
function tryCall<A, R>(fn: (arg: A) => R, arg: A): R | undefined {
  try {
    return fn(arg);
  } catch (error) {
    queueMicrotask(() => {
      throw error;
    });
    return undefined;
  }
}

/**
 * A circuit breaker that wraps async operations to prevent cascading failures.
 *
 * The circuit breaker monitors the failure rate within a sliding window and
 * "trips" (opens) when the rate exceeds a threshold, rejecting subsequent
 * requests immediately without executing them. After a cooldown period, it
 * enters a "half-open" state to test if the service has recovered.
 *
 * The failure rate is only evaluated once at least
 * {@linkcode CircuitBreakerOptions.minimumThroughput | minimumThroughput}
 * requests have been recorded in the window, preventing false positives
 * during low traffic.
 *
 * When state changes occur, callbacks fire in a fixed order:
 * - Circuit trips open: `onFailure` → `onStateChange` → `onOpen`
 * - Cooldown expires: `onStateChange` → `onHalfOpen`
 * - Recovery completes: `onStateChange` → `onClose`
 *
 * @experimental **UNSTABLE**: New API, yet to be vetted.
 *
 * @example Usage
 * ```ts
 * import { CircuitBreaker } from "@std/async/unstable-circuit-breaker";
 * import { assertEquals } from "@std/assert";
 *
 * const breaker = new CircuitBreaker({
 *   failureRateThreshold: 0.5,
 *   minimumThroughput: 20,
 *   cooldownMs: 30000,
 * });
 *
 * assertEquals(breaker.state, "closed");
 *
 * const result = await breaker.execute(() => Promise.resolve("success"));
 * assertEquals(result, "success");
 * ```
 *
 * @example Handling open circuit
 * ```ts ignore
 * import { CircuitBreaker, CircuitBreakerOpenError } from "@std/async/unstable-circuit-breaker";
 *
 * const breaker = new CircuitBreaker();
 *
 * try {
 *   const result = await breaker.execute(() => fetch("https://api.example.com"));
 * } catch (error) {
 *   if (error instanceof CircuitBreakerOpenError) {
 *     console.log(`Service unavailable, retry in ${error.remainingCooldownMs}ms`);
 *   }
 * }
 * ```
 *
 * @example With custom failure detection
 * ```ts no-assert
 * import { CircuitBreaker } from "@std/async/unstable-circuit-breaker";
 *
 * const breaker = new CircuitBreaker<Response>({
 *   failureRateThreshold: 0.1,
 *   isResultFailure: (response) => response.status >= 500,
 *   onStateChange: (from, to) => console.log(`Circuit: ${from} → ${to}`),
 * });
 * ```
 *
 * @example Composing with retry and AbortSignal
 * ```ts ignore
 * import { retry } from "@std/async/retry";
 * import { CircuitBreaker } from "@std/async/unstable-circuit-breaker";
 *
 * const breaker = new CircuitBreaker();
 *
 * // Timeout applies to the entire operation (circuit breaker + retries)
 * const signal = AbortSignal.timeout(5000);
 *
 * const result = await breaker.execute(
 *   () => retry(() => fetch("https://api.example.com"), { signal }),
 *   { signal },
 * );
 * ```
 *
 * @example Waiting out the cooldown with delay
 * ```ts ignore
 * import { delay } from "@std/async/delay";
 * import { CircuitBreaker, CircuitBreakerOpenError } from "@std/async/unstable-circuit-breaker";
 *
 * const breaker = new CircuitBreaker();
 *
 * try {
 *   return await breaker.execute(() => fetch("https://api.example.com"));
 * } catch (error) {
 *   if (error instanceof CircuitBreakerOpenError) {
 *     // Wait for the circuit to transition to half-open, then retry
 *     await delay(error.remainingCooldownMs);
 *     return await breaker.execute(() => fetch("https://api.example.com"));
 *   }
 *   throw error;
 * }
 * ```
 *
 * @typeParam T The type of value returned by the executed function.
 */
export class CircuitBreaker<T = unknown> {
  #failureRateThreshold: number;
  #minimumThroughput: number;
  #cooldownMs: number;
  #successThreshold: number;
  #halfOpenMaxConcurrent: number;
  #isFailure: (error: unknown) => boolean;
  #isResultFailure: (result: T) => boolean;
  #onStateChange: ((from: CircuitState, to: CircuitState) => void) | undefined;
  #onFailure:
    | ((error: unknown, failureCount: number, totalRequests: number) => void)
    | undefined;
  #onOpen: ((failureCount: number, totalRequests: number) => void) | undefined;
  #onHalfOpen: (() => void) | undefined;
  #onClose: (() => void) | undefined;
  #state: CircuitBreakerState;
  #requests: RollingCounter;
  #failures: RollingCounter;
  #lastRotationMs: number;
  #msPerSegment: number;

  /**
   * Constructs a new {@linkcode CircuitBreaker} instance.
   *
   * @experimental **UNSTABLE**: New API, yet to be vetted.
   *
   * @param options Configuration options for the circuit breaker.
   * @throws {RangeError} If any numeric option is not a finite number within its valid range.
   */
  constructor(options: CircuitBreakerOptions<T> = {}) {
    const {
      failureRateThreshold = 0.5,
      minimumThroughput = 20,
      windowMs = 60_000,
      segmentsPerWindow = 10,
      cooldownMs = 30_000,
      successThreshold = 2,
      halfOpenMaxConcurrent = 3,
      isFailure = () => true,
      isResultFailure = () => false,
      onStateChange,
      onFailure,
      onOpen,
      onHalfOpen,
      onClose,
    } = options;

    validateRate("failureRateThreshold", failureRateThreshold);
    validatePositiveInteger("minimumThroughput", minimumThroughput);
    validatePositiveInteger("windowMs", windowMs);
    validatePositiveInteger("segmentsPerWindow", segmentsPerWindow);
    validateNonNegative("cooldownMs", cooldownMs);
    validatePositiveInteger("successThreshold", successThreshold);
    validatePositiveInteger("halfOpenMaxConcurrent", halfOpenMaxConcurrent);

    this.#failureRateThreshold = failureRateThreshold;
    this.#minimumThroughput = minimumThroughput;
    this.#cooldownMs = cooldownMs;
    this.#successThreshold = successThreshold;
    this.#halfOpenMaxConcurrent = halfOpenMaxConcurrent;
    this.#isFailure = isFailure;
    this.#isResultFailure = isResultFailure;
    this.#onStateChange = safeCallback(onStateChange);
    this.#onFailure = safeCallback(onFailure);
    this.#onOpen = safeCallback(onOpen);
    this.#onHalfOpen = safeCallback(onHalfOpen);
    this.#onClose = safeCallback(onClose);
    this.#state = createInitialState();
    this.#requests = new RollingCounter(segmentsPerWindow);
    this.#failures = new RollingCounter(segmentsPerWindow);
    this.#msPerSegment = windowMs / segmentsPerWindow;
    this.#lastRotationMs = Date.now();
  }

  /**
   * Current state of the circuit breaker.
   *
   * Time-based transitions (e.g. open to half-open after cooldown) are
   * resolved lazily when this property is read.
   *
   * @experimental **UNSTABLE**: New API, yet to be vetted.
   *
   * @example Usage
   * ```ts
   * import { CircuitBreaker } from "@std/async/unstable-circuit-breaker";
   * import { assertEquals } from "@std/assert";
   *
   * const breaker = new CircuitBreaker();
   * assertEquals(breaker.state, "closed");
   * ```
   *
   * @returns The current {@linkcode CircuitState}.
   */
  get state(): CircuitState {
    return this.#advanceState(Date.now()).state;
  }

  /**
   * Executes a function through the circuit breaker.
   *
   * The function can be synchronous or asynchronous. The result is always
   * returned as a promise.
   *
   * @experimental **UNSTABLE**: New API, yet to be vetted.
   *
   * @example Usage with async function
   * ```ts ignore
   * import { CircuitBreaker } from "@std/async/unstable-circuit-breaker";
   *
   * const breaker = new CircuitBreaker();
   * const response = await breaker.execute(() => fetch("https://api.example.com"));
   * ```
   *
   * @example With timeout
   * ```ts ignore
   * import { CircuitBreaker } from "@std/async/unstable-circuit-breaker";
   *
   * const breaker = new CircuitBreaker();
   *
   * // Abort if operation takes longer than 5 seconds
   * const response = await breaker.execute(
   *   () => fetch("https://api.example.com"),
   *   { signal: AbortSignal.timeout(5000) },
   * );
   * ```
   *
   * @typeParam R The return type of the function, must extend T.
   * @param fn The function to execute through the circuit breaker.
   * @param options Options for this execution, such as an abort signal.
   * @returns A promise that resolves to the result of the operation.
   * @throws {CircuitBreakerOpenError} If circuit is open.
   * @throws {DOMException} If the abort signal is already aborted.
   */
  async execute<R extends T>(
    fn: () => R | Promise<R>,
    options?: CircuitBreakerExecuteOptions,
  ): Promise<R> {
    options?.signal?.throwIfAborted();

    const currentTime = Date.now();
    const currentState = this.#advanceState(currentTime);

    if (currentState.state === "open") {
      const cooldownEnd = currentState.openedAt + this.#cooldownMs;
      const remainingMs = Math.max(0, cooldownEnd - currentTime);
      throw new CircuitBreakerOpenError(Math.round(remainingMs));
    }

    if (currentState.state === "half_open") {
      if (currentState.halfOpenInFlight >= this.#halfOpenMaxConcurrent) {
        throw new CircuitBreakerOpenError(0);
      }
      this.#state = {
        ...this.#state,
        halfOpenInFlight: this.#state.halfOpenInFlight + 1,
      };
    }

    let result: R;
    try {
      result = await fn();
    } catch (error) {
      this.#recordRequest();
      if (tryCall(this.#isFailure, error)) {
        this.#handleFailure(error, currentState.state);
      }
      throw error;
    } finally {
      if (currentState.state === "half_open") {
        this.#state = {
          ...this.#state,
          halfOpenInFlight: Math.max(0, this.#state.halfOpenInFlight - 1),
        };
      }
    }

    this.#recordRequest();
    const isResultFail = tryCall(this.#isResultFailure, result);
    if (isResultFail) {
      this.#handleFailure(undefined, currentState.state);
    } else if (isResultFail === false) {
      this.#handleSuccess(currentState.state);
    }
    return result;
  }

  /**
   * Forces the circuit breaker to open state.
   * Useful for maintenance or known outages.
   *
   * @experimental **UNSTABLE**: New API, yet to be vetted.
   *
   * @example Usage
   * ```ts
   * import { CircuitBreaker } from "@std/async/unstable-circuit-breaker";
   * import { assertEquals } from "@std/assert";
   *
   * const breaker = new CircuitBreaker();
   * breaker.forceOpen();
   * assertEquals(breaker.state, "open");
   * ```
   *
   * @returns void
   */
  forceOpen(): void {
    const previous = this.#state.state;
    const now = Date.now();
    this.#rotateToNow(now);
    this.#state = {
      ...this.#state,
      state: "open",
      openedAt: now,
      consecutiveSuccesses: 0,
    };
    if (previous === "open") return;
    this.#onStateChange?.(previous, "open");
    this.#onOpen?.(this.#failures.total, this.#requests.total);
  }

  /**
   * Forces the circuit breaker to closed state and notifies observers.
   *
   * This is an operational transition that fires
   * {@linkcode CircuitBreakerOptions.onStateChange | onStateChange} and
   * {@linkcode CircuitBreakerOptions.onClose | onClose} callbacks. Use this
   * when the protected service
   * has recovered and you want observers to be notified.
   *
   * For silent resets (e.g., in tests), use {@linkcode reset} instead.
   *
   * @experimental **UNSTABLE**: New API, yet to be vetted.
   *
   * @example Usage
   * ```ts
   * import { CircuitBreaker } from "@std/async/unstable-circuit-breaker";
   * import { assertEquals } from "@std/assert";
   *
   * const breaker = new CircuitBreaker();
   * breaker.forceOpen();
   * breaker.forceClose();
   * assertEquals(breaker.state, "closed");
   * ```
   *
   * @returns void
   */
  forceClose(): void {
    const previous = this.#state.state;
    this.#state = createInitialState();
    this.#clearCounters();
    if (previous === "closed") return;
    this.#onStateChange?.(previous, "closed");
    this.#onClose?.();
  }

  /**
   * Silently resets the circuit breaker to initial state.
   *
   * Unlike {@linkcode forceClose}, this does not fire any callbacks
   * (`onStateChange`, `onClose`). Use this for testing or administrative
   * resets where observers should not be notified.
   *
   * @experimental **UNSTABLE**: New API, yet to be vetted.
   *
   * @example Usage
   * ```ts
   * import { CircuitBreaker } from "@std/async/unstable-circuit-breaker";
   * import { assertEquals } from "@std/assert";
   *
   * const breaker = new CircuitBreaker();
   * breaker.reset();
   * assertEquals(breaker.state, "closed");
   * ```
   *
   * @returns void
   */
  reset(): void {
    this.#state = createInitialState();
    this.#clearCounters();
  }

  /** Advances both counters to the current time, evicting stale segments. */
  #rotateToNow(now: number): void {
    const elapsed = now - this.#lastRotationMs;
    const steps = Math.floor(elapsed / this.#msPerSegment);
    if (steps > 0) {
      this.#requests.rotate(steps);
      this.#failures.rotate(steps);
      this.#lastRotationMs += steps * this.#msPerSegment;
    }
  }

  /**
   * Counts a completed request. Requests are recorded on completion, in the
   * same segment as their outcome, so failures can never outnumber requests.
   */
  #recordRequest(): void {
    this.#rotateToNow(Date.now());
    this.#requests.increment();
  }

  /** Resets both counters and the rotation timestamp. */
  #clearCounters(): void {
    this.#requests.clear();
    this.#failures.clear();
    this.#lastRotationMs = Date.now();
  }

  /**
   * Advances the state machine, transitioning OPEN -> HALF_OPEN when
   * the cooldown has expired. No-op for other states.
   */
  #advanceState(now: number): CircuitBreakerState {
    if (this.#state.state !== "open") {
      return this.#state;
    }

    const cooldownEnd = this.#state.openedAt + this.#cooldownMs;
    if (now < cooldownEnd) {
      return this.#state;
    }

    this.#state = {
      ...this.#state,
      state: "half_open",
      consecutiveSuccesses: 0,
      halfOpenInFlight: 0,
    };
    this.#onStateChange?.("open", "half_open");
    this.#onHalfOpen?.();
    return this.#state;
  }

  /** Records a failure and potentially opens the circuit. */
  #handleFailure(
    error: unknown,
    previousState: CircuitState,
  ): void {
    this.#failures.increment();
    const totalRequests = this.#requests.total;
    const failureCount = this.#failures.total;

    const shouldOpen = previousState === "half_open" ||
      (totalRequests >= this.#minimumThroughput &&
        failureCount / totalRequests >= this.#failureRateThreshold);

    const existingOpenedAt = this.#state.state === "open"
      ? this.#state.openedAt
      : undefined;

    if (shouldOpen) {
      this.#state = {
        ...this.#state,
        state: "open",
        openedAt: existingOpenedAt ?? Date.now(),
        consecutiveSuccesses: 0,
      };
    } else {
      this.#state = {
        ...this.#state,
        consecutiveSuccesses: 0,
      };
    }

    this.#onFailure?.(
      error ?? new Error("Result classified as failure"),
      failureCount,
      totalRequests,
    );
    if (shouldOpen && existingOpenedAt === undefined) {
      this.#onStateChange?.(previousState, "open");
      this.#onOpen?.(failureCount, totalRequests);
    }
  }

  /** Records a success and potentially closes the circuit from half-open. */
  #handleSuccess(previousState: CircuitState): void {
    if (previousState === "closed") return;
    if (this.#state.state !== "half_open") return;

    const newSuccessCount = this.#state.consecutiveSuccesses + 1;
    if (newSuccessCount >= this.#successThreshold) {
      this.#state = createInitialState();
      this.#clearCounters();
      this.#onStateChange?.("half_open", "closed");
      this.#onClose?.();
      return;
    }

    this.#state = { ...this.#state, consecutiveSuccesses: newSuccessCount };
  }
}
