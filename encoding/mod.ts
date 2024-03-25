// Copyright 2018-2024 the Deno authors. All rights reserved. MIT license.

/**
 * Utilities for encoding and decoding common formats like hex, base64, and varint.
 *
 * This module is browser compatible.
 *
 * ```ts
 * import { encodeBase64 } from "https://deno.land/std@$STD_VERSION/encoding/base64.ts";
 *
 * encodeBase64("foobar"); // "Zm9vYmFy"
 * ```
 *
 * @module
 */

export * from "./ascii85.ts";
export * from "./base32.ts";
export * from "./base58.ts";
export * from "./base64.ts";
export * from "./base64url.ts";
export * from "./hex.ts";
export * from "./varint.ts";
