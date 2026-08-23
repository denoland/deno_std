// Copyright 2018-2026 the Deno authors. MIT license.
// This module is browser compatible.

/** Maximum number of objects examined along the `cause` chain. */
const MAX_DEPTH = 8;

/**
 * Exact failed-fetch `TypeError` messages: "fetch failed" is shared by
 * undici (Node.js) and Deno 2.9+; the rest are browser strings.
 * Matching is case-sensitive on purpose: Deno's "Fetch failed: <reason>"
 * (capital F, policy failures such as blocked ports) is a near-collision
 * that must stay excluded because those failures are deterministic on
 * retry.
 */
const FAILED_FETCH_MESSAGES = [
  "fetch failed",
  "Failed to fetch",
  "NetworkError when attempting to fetch resource.",
  "Load failed",
];

/**
 * Message prefix of transport failures in Deno before 2.9, e.g.
 * "error sending request for url (...): ...".
 */
const LEGACY_DENO_MESSAGE_PREFIX = "error sending request";

/**
 * `code` values of transient network failures. Bun's fetch reports
 * transport failures through `code` rather than a fixed message (the DNS
 * failure message even embeds the hostname): "ConnectionRefused" and
 * "Timeout" are Bun's labels, the errno-style names are shared with
 * Node.js, which also exposes them on the `cause` of undici's
 * "fetch failed" TypeError. Deterministic codes such as "ERR_INVALID_URL"
 * are excluded on purpose.
 */
const TRANSIENT_NETWORK_CODES = new Set([
  "ConnectionRefused",
  "Timeout",
  "ECONNREFUSED",
  "ECONNRESET",
  "ETIMEDOUT",
  "ENOTFOUND",
  "EAI_AGAIN",
]);

function isRetriableStatus(status: number): boolean {
  return status === 408 || status === 429 ||
    (status >= 500 && status < 600);
}

function isRetriableValue(value: object): boolean {
  if (value instanceof Response) {
    return isRetriableStatus(value.status);
  }
  if (value instanceof DOMException) {
    return value.name === "TimeoutError";
  }
  if (
    value instanceof TypeError &&
    (FAILED_FETCH_MESSAGES.includes(value.message) ||
      value.message.startsWith(LEGACY_DENO_MESSAGE_PREFIX))
  ) {
    return true;
  }
  if (value instanceof Error) {
    const { status, code } = value as { status?: unknown; code?: unknown };
    if (typeof code === "string" && TRANSIENT_NETWORK_CODES.has(code)) {
      return true;
    }
    if (
      typeof status === "number" && Number.isInteger(status) &&
      status >= 100 && status <= 599
    ) {
      return isRetriableStatus(status);
    }
  }
  return false;
}

/**
 * Returns `true` if the given thrown value looks like a transient fetch
 * failure that is worth retrying, `false` otherwise.
 *
 * @experimental **UNSTABLE**: New API, yet to be vetted.
 *
 * The value and its `cause` chain are examined (up to 8 objects,
 * cycle-safe). A value classifies as retriable if it is any of:
 *
 * - a {@linkcode Response} with status 408, 429, or 5xx, including
 *   nonstandard 5xx codes such as Cloudflare's 522,
 * - an {@linkcode Error} with an integer `status` property in the range
 *   100-599, using the same status test,
 * - an {@linkcode Error} whose `code` names a transient network failure:
 *   "ConnectionRefused" or "Timeout" (Bun), or the errno-style
 *   "ECONNREFUSED", "ECONNRESET", "ETIMEDOUT", "ENOTFOUND", or
 *   "EAI_AGAIN" (Bun and Node.js, including the `cause` of undici's
 *   "fetch failed" TypeError),
 * - a `DOMException` named `TimeoutError`, as thrown by
 *   `AbortSignal.timeout()`,
 * - a {@linkcode TypeError} whose message exactly matches a known
 *   failed-fetch message ("fetch failed" on Node.js and Deno 2.9+;
 *   "Failed to fetch", "NetworkError when attempting to fetch resource.",
 *   and "Load failed" in browsers) or starts with "error sending request"
 *   (Deno before 2.9).
 *
 * Everything else returns `false`. In particular `AbortError` is not
 * retriable (aborting is caller intent), and neither are Deno's
 * "Fetch failed: <reason>" policy errors, which fail deterministically on
 * retry.
 *
 * Note that `fetch()` resolves on 4xx/5xx responses instead of throwing,
 * so status classification only applies when the caller throws the
 * {@linkcode Response} (or an error carrying a `status` property). Errors
 * that keep the response on a `response` property instead, such as those
 * thrown by the ky and got packages, are not covered.
 *
 * @param error The thrown value to classify.
 * @returns `true` if the value indicates a retriable fetch failure,
 * `false` otherwise.
 *
 * @example Use as the `isRetriable` hook of `retry()`
 * ```ts ignore
 * import { retry } from "@std/async/retry";
 * import { isRetriableFetchError } from "@std/http/unstable-is-retriable-fetch-error";
 *
 * const data = await retry(async () => {
 *   const res = await fetch("https://example.com/api");
 *   if (!res.ok) throw res;
 *   return await res.json();
 * }, { isRetriable: isRetriableFetchError });
 * ```
 *
 * @example Classifying thrown values
 * ```ts
 * import { isRetriableFetchError } from "@std/http/unstable-is-retriable-fetch-error";
 * import { assert, assertFalse } from "@std/assert";
 *
 * assert(isRetriableFetchError(new Response(null, { status: 503 })));
 * assert(isRetriableFetchError(new TypeError("fetch failed")));
 * assert(isRetriableFetchError(new DOMException("Timed out", "TimeoutError")));
 * assertFalse(isRetriableFetchError(new Response(null, { status: 404 })));
 * assertFalse(isRetriableFetchError(new DOMException("Aborted", "AbortError")));
 * ```
 */
export function isRetriableFetchError(error: unknown): boolean {
  const seen = new Set<object>();
  let current: unknown = error;
  for (let depth = 0; depth < MAX_DEPTH; depth++) {
    if (typeof current !== "object" || current === null) return false;
    if (seen.has(current)) return false;
    seen.add(current);
    if (isRetriableValue(current)) return true;
    current = (current as { cause?: unknown }).cause;
  }
  return false;
}
