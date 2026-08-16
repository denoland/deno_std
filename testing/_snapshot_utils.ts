// Copyright 2018-2026 the Deno authors. MIT license.
import type { SnapshotMode, SnapshotOptions } from "./snapshot.ts";
import { diff } from "@std/internal/diff";
import { diffStr } from "@std/internal/diff-str";
import { buildMessage } from "@std/internal/build-message";

export function getErrorMessage(message: string, options: SnapshotOptions) {
  return typeof options.msg === "string" ? options.msg : message;
}

/**
 * Default serializer for `assertSnapshot`.
 *
 * @example Usage
 * ```ts
 * import { serialize } from "@std/testing/snapshot";
 * import { assertEquals } from "@std/assert";
 *
 * assertEquals(serialize({ foo: 42 }), "{\n  foo: 42,\n}")
 * ```
 *
 * @param actual The value to serialize
 * @returns The serialized string
 *
 * @deprecated This will be removed in 2.0.0. The built-in
 * [`t.assertSnapshot()`](https://docs.deno.com/runtime/test/snapshots/)
 * (Deno 2.9+) uses the same serialization by default; for custom
 * serialization, call `Deno.inspect()` directly.
 */
export function serialize(actual: unknown): string {
  return Deno.inspect(actual, {
    depth: Infinity,
    sorted: true,
    trailingComma: true,
    compact: false,
    iterableLimit: Infinity,
    strAbbreviateSize: Infinity,
    breakLength: Infinity,
    escapeSequences: false,
  }).replaceAll("\r", "\\r");
}

/**
 * Converts a string to a valid JavaScript string which can be wrapped in backticks.
 *
 * @example
 *
 * "special characters (\ ` $) will be escaped" -> "special characters (\\ \` \$) will be escaped"
 */
export function escapeStringForJs(str: string) {
  return str
    .replace(/\\/g, "\\\\")
    .replace(/`/g, "\\`")
    .replace(/\$/g, "\\$");
}

let _mode: SnapshotMode;
/**
 * Get the snapshot mode.
 */
export function getMode(options: SnapshotOptions) {
  if (options.mode) {
    return options.mode;
  } else if (_mode) {
    return _mode;
  } else {
    _mode = Deno.args.some((arg) => arg === "--update" || arg === "-u")
      ? "update"
      : "assert";
    return _mode;
  }
}

/**
 * Return `true` when snapshot mode is `update`.
 */
export function getIsUpdate(options: SnapshotOptions) {
  return getMode(options) === "update";
}

export function getOptions<T>(
  msgOrOpts?: string | T,
): T {
  if (msgOrOpts === undefined) return {} as T;

  if (typeof msgOrOpts === "object" && msgOrOpts !== null) {
    return msgOrOpts;
  }

  return { msg: msgOrOpts } as T;
}

export function getSnapshotNotMatchMessage(
  actualSnapshot: string,
  expectedSnapshot: string,
  options: SnapshotOptions,
) {
  const stringDiff = !actualSnapshot.includes("\n");
  const diffResult = stringDiff
    ? diffStr(actualSnapshot, expectedSnapshot)
    : diff(actualSnapshot.split("\n"), expectedSnapshot.split("\n"));
  const diffMsg = buildMessage(diffResult, { stringDiff }).join("\n");
  const message =
    `Snapshot does not match:\n${diffMsg}\nTo update snapshots, run\n    deno test --allow-read --allow-write [files]... -- --update\n`;
  return getErrorMessage(message, options);
}

// TODO(WWRS): Remove this when we drop support for Deno 1.x
export const LINT_SUPPORTED = !Deno.version.deno.startsWith("1.");
