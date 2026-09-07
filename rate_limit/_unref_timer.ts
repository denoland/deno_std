// Copyright 2018-2026 the Deno authors. MIT license.

/**
 * Unref an interval timer so it does not keep the process alive.
 * Node and Bun return a handle object with `unref()`; Deno returns a number.
 */
export function unrefTimer(timer: ReturnType<typeof setInterval>): void {
  if (typeof timer === "object" && timer !== null) {
    (timer as unknown as { unref?: () => void }).unref?.();
  } else if (typeof Deno !== "undefined") {
    Deno.unrefTimer(timer);
  }
}
