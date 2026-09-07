// Copyright 2018-2026 the Deno authors. MIT license.

/**
 * Rate limiting strategies for controlling how many operations can occur over
 * time.
 *
 * The primary API is {@linkcode createRateLimiter}, a keyed rate limiter for
 * the common case of "allow key X at most N requests per window." It supports
 * fixed-window, sliding-window, token-bucket, and GCRA algorithms and accepts
 * a pluggable {@linkcode RateLimitStore} backend (in-memory by default).
 *
 * For single-resource limiting, use the primitives:
 * {@linkcode createTokenBucket}, {@linkcode createFixedWindow},
 * {@linkcode createSlidingWindow}, and {@linkcode createGcra}.
 *
 * ```ts
 * import { createRateLimiter } from "@std/rate-limit";
 * import { assert } from "@std/assert";
 *
 * await using limiter = createRateLimiter({ limit: 100, window: 60_000 });
 *
 * const result = await limiter.limit("user:123");
 * assert(result.ok);
 * ```
 *
 * @module
 */

export * from "./fixed_window.ts";
export * from "./gcra.ts";
export * from "./memory_store.ts";
export * from "./rate_limiter.ts";
export * from "./sliding_window.ts";
export * from "./store_types.ts";
export * from "./token_bucket.ts";
export * from "./types.ts";
