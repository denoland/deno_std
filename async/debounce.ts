// Copyright 2018-2021 the Deno authors. All rights reserved. MIT license.

/**
 * A debounced function that will be delayed by a given `wait`
 * time in milliseconds. If the method is called again before
 * the timeout expires, the previous call will be aborted.
 */
export interface Debounce<T extends Array<unknown>> {
  (...args: T): void;
  /** Clears the debounce timeout and omits calling the debounced function. */
  clear(): void;
  /** Clears the debounce timeout and calls the debounced function immediately. */
  flush(): void;
  /** Returns a boolean wether a debounce call is pending or not. */
  readonly pending: boolean;
}

/**
 * Creates a debounced function that delays the given `func`
 * by a given `wait` time in milliseconds. If the method is called
 * again before the timeout expires, the previous call will be
 * aborted.
 *
 * ```
 * import { debounce } from "https://deno.land/std/async/mod.ts";
 *
 * const log = debounce(
 *   (event: Deno.FsEvent) =>
 *     console.log("[%s] %s", event.kind, event.paths[0]),
 *   200,
 * );
 *
 * for await (const event of Deno.watchFs("./")) {
 *   log(event);
 * }
 * ```
 *
 * @param func The function to debounce.
 * @param wait The time in milliseconds to delay the function.
 */
// deno-lint-ignore no-explicit-any
export function debounce<T extends Array<any>>(
  func: (this: Debounce<T>, ...args: T) => void,
  wait = 100,
): Debounce<T> {
  let timeout: number | null = null;
  let debounced: (() => void) | null = null;

  const debounce: Debounce<T> = ((...args: T): void => {
    debounce.clear();
    debounced = (): void => {
      reset();
      func.call(debounce, ...args);
    };
    timeout = setTimeout(debounced, wait);
  }) as Debounce<T>;

  debounce.clear = (): void => {
    if (typeof timeout === "number") {
      clearTimeout(timeout);
      reset();
    }
  };

  debounce.flush = (): void => {
    if (debounced) {
      const debouncedFn = debounced;
      debounce.clear();
      debouncedFn();
    }
  };

  Object.defineProperty(debounce, "pending", {
    get: () => typeof timeout === "number",
  });

  function reset() {
    timeout = null;
    debounced = null;
  }

  return debounce;
}
