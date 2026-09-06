// Copyright 2018-2026 the Deno authors. MIT license.
// This module is browser compatible.

/**
 * Unref a timer so it does not keep the process alive.
 * Node and Bun return a handle object with `unref()`; Deno returns a number.
 * In browsers there is nothing to unref.
 */
export function unrefTimer(timer: ReturnType<typeof setTimeout>): void {
  if (typeof timer === "object" && timer !== null) {
    (timer as unknown as { unref?: () => void }).unref?.();
  } else {
    (globalThis as { Deno?: { unrefTimer?: (id: number) => void } }).Deno
      ?.unrefTimer?.(timer);
  }
}
