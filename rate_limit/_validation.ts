// Copyright 2018-2026 the Deno authors. MIT license.
// This module is browser compatible.

/**
 * Asserts that `value` is a positive integer (>= 1).
 *
 * @param context Noun phrase for the error prefix, e.g. "token bucket".
 * @param name The option name shown in the error message.
 * @param value The value to check.
 */
export function assertPositiveInteger(
  context: string,
  name: string,
  value: number,
): void {
  if (!Number.isInteger(value) || value < 1) {
    throw new RangeError(
      `Cannot create ${context}: '${name}' must be a positive integer, received ${value}`,
    );
  }
}

/**
 * Asserts that `value` is a non-negative integer (>= 0), if defined.
 *
 * @param context Noun phrase for the error prefix, e.g. "token bucket".
 * @param name The option name shown in the error message.
 * @param value The value to check. Skipped when `undefined`.
 */
export function assertNonNegativeInteger(
  context: string,
  name: string,
  value: number | undefined,
): void {
  if (value !== undefined && (!Number.isInteger(value) || value < 0)) {
    throw new RangeError(
      `Cannot create ${context}: '${name}' must be a non-negative integer, received ${value}`,
    );
  }
}

/**
 * Asserts that `value` is a positive finite number (> 0).
 *
 * @param context Noun phrase for the error prefix, e.g. "token bucket".
 * @param name The option name shown in the error message.
 * @param value The value to check.
 */
export function assertPositiveFinite(
  context: string,
  name: string,
  value: number,
): void {
  if (!Number.isFinite(value) || value <= 0) {
    throw new RangeError(
      `Cannot create ${context}: '${name}' must be a positive finite number, received ${value}`,
    );
  }
}

/**
 * Maximum delay `setInterval` handles portably. Larger delays overflow the
 * 32-bit signed range: Node clamps them to 1ms and Deno wraps them negative,
 * either way firing the timer (near-)immediately.
 */
export const MAX_TIMER_INTERVAL = 2 ** 31 - 1;

/**
 * Asserts that a timer interval does not exceed {@linkcode MAX_TIMER_INTERVAL}.
 *
 * @param context Noun phrase for the error prefix, e.g. "token bucket".
 * @param description The option (or expression) shown in the error message.
 * @param value The interval in milliseconds.
 */
export function assertTimerInterval(
  context: string,
  description: string,
  value: number,
): void {
  if (value > MAX_TIMER_INTERVAL) {
    throw new RangeError(
      `Cannot create ${context}: ${description} (${value}) exceeds the maximum timer interval of ${MAX_TIMER_INTERVAL} milliseconds`,
    );
  }
}
