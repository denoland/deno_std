// Copyright 2018-2026 the Deno authors. MIT license.
// This module is browser compatible.

/** Options for {@linkcode truncate}. */
export interface TruncateOptions {
  /**
   * The string used to indicate where truncation occurred.
   *
   * @default {"…"}
   */
  suffix?: string;
  /**
   * Where to truncate.
   *
   * - `"end"`:    `"very long te…"`
   * - `"middle"`: `"very l…g text"` (useful for file paths)
   * - `"start"`:  `"…ery long text"`
   *
   * @default {"end"}
   */
  position?: "end" | "middle" | "start";
}

/**
 * Truncates a string to at most `maxLength` UTF-16 code units. When truncation
 * occurs the suffix is included within the `maxLength` budget. Surrogate pairs
 * are never split, so the result may be shorter than `maxLength` when a cut
 * would land inside a pair. When the suffix itself contains surrogate pairs and
 * `maxLength` is very small, the result can even be empty.
 *
 * Note: this function is not grapheme-cluster-aware. Combining characters, flag
 * emoji, and ZWJ sequences may still be visually split.
 *
 * @param str The string to truncate.
 * @param maxLength The maximum length of the returned string (must be a
 * non-negative integer).
 * @param options The truncation options.
 * @returns The truncated string.
 * @throws {RangeError} If `maxLength` is not a non-negative integer.
 * @throws {TypeError} If `position` is not a valid position.
 *
 * @example End truncation (default)
 * ```ts
 * import { truncate } from "@std/text/truncate";
 * import { assertEquals } from "@std/assert";
 *
 * assertEquals(truncate("Hello, world!", 8), "Hello, …");
 * assertEquals(truncate("Short", 10), "Short");
 * ```
 *
 * @example Middle truncation
 * ```ts
 * import { truncate } from "@std/text/truncate";
 * import { assertEquals } from "@std/assert";
 *
 * assertEquals(
 *   truncate("src/components/Button.tsx", 18, { position: "middle" }),
 *   "src/comp…utton.tsx",
 * );
 * ```
 *
 * @example Start truncation
 * ```ts
 * import { truncate } from "@std/text/truncate";
 * import { assertEquals } from "@std/assert";
 *
 * assertEquals(
 *   truncate("Hello, world!", 8, { position: "start" }),
 *   "… world!",
 * );
 * ```
 *
 * @example Custom suffix
 * ```ts
 * import { truncate } from "@std/text/truncate";
 * import { assertEquals } from "@std/assert";
 *
 * assertEquals(
 *   truncate("Hello, world!", 10, { suffix: "→" }),
 *   "Hello, wo→",
 * );
 * ```
 */
export function truncate(
  str: string,
  maxLength: number,
  options?: TruncateOptions,
): string {
  if (!Number.isInteger(maxLength) || maxLength < 0) {
    throw new RangeError(
      `Cannot truncate: maxLength must be a non-negative integer, received ${maxLength}`,
    );
  }
  if (maxLength === 0) return "";
  if (str.length <= maxLength) return str;

  const suffix = options?.suffix ?? "\u2026";
  const position = options?.position ?? "end";

  if (maxLength <= suffix.length) {
    return suffix.slice(0, adjustSplitBack(suffix, maxLength));
  }

  const budget = maxLength - suffix.length;

  switch (position) {
    case "start": {
      const start = str.length - budget;
      return suffix + str.slice(adjustSplitForward(str, start));
    }
    case "middle": {
      const leftLen = Math.floor(budget / 2);
      const rightLen = budget - leftLen;
      const rightStart = str.length - rightLen;
      return str.slice(0, adjustSplitBack(str, leftLen)) + suffix +
        str.slice(adjustSplitForward(str, rightStart));
    }
    case "end":
      return str.slice(0, adjustSplitBack(str, budget)) + suffix;
    default:
      throw new TypeError(
        `Cannot truncate: position must be "end", "middle", or "start", received "${position}"`,
      );
  }
}

/**
 * If `index` lands on a low surrogate, back up one position so we don't split
 * a surrogate pair.
 */
function adjustSplitBack(str: string, index: number): number {
  if (index > 0 && index < str.length) {
    const code = str.charCodeAt(index);
    if (code >= 0xDC00 && code <= 0xDFFF) return index - 1;
  }
  return index;
}

/**
 * If `index` lands on a low surrogate, advance one position so we don't split
 * a surrogate pair.
 */
function adjustSplitForward(str: string, index: number): number {
  if (index > 0 && index < str.length) {
    const code = str.charCodeAt(index);
    if (code >= 0xDC00 && code <= 0xDFFF) return index + 1;
  }
  return index;
}
