// Copyright 2018-2024 the Deno authors. All rights reserved. MIT license.
// Copyright (c) 2014 Jameson Little. MIT License.
// This module is browser compatible.

/**
 * Utilities for
 * {@link https://www.rfc-editor.org/rfc/rfc4648.html#section-6 | base32}
 * encoding and decoding.
 *
 * Modified from {@link https://github.com/beatgammit/base64-js}.
 *
 * This module is browser compatible.
 *
 * ```ts
 * import { encodeBase32, decodeBase32 } from "@std/encoding/base32";
 * import { assertEquals } from "@std/assert/assert-equals";
 *
 * assertEquals(encodeBase32("foobar"), "MZXW6YTBOI======");
 *
 * assertEquals(
 *   decodeBase32("MZXW6YTBOI======"),
 *   new TextEncoder().encode("foobar")
 * );
 * ```
 *
 * @module
 */

import { validateBinaryLike } from "./_util.ts";

const ALPHABET = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";
const CHAR_CODES = new Map<number, number>();
for (let i = 0; i < ALPHABET.length; i++) {
  CHAR_CODES.set(ALPHABET.charCodeAt(i)!, i);
}

/**
 * Decodes a base32-encoded string.
 *
 * @see {@link https://www.rfc-editor.org/rfc/rfc4648.html#section-6}
 *
 * @param b32 The base32-encoded string to decode.
 * @returns The decoded data.
 *
 * @example Usage
 * ```ts
 * import { decodeBase32 } from "@std/encoding/base32";
 * import { assertEquals } from "@std/assert/assert-equals";
 *
 * assertEquals(
 *   decodeBase32("GZRTMMDDGA======"),
 *   new TextEncoder().encode("6c60c0"),
 * );
 * ```
 */
export function decodeBase32(input: string): Uint8Array {
  // Remove padding characters
  input = input.replace(/=/g, "");

  const length = input.length;
  const output = new Uint8Array((length * 5 / 8) | 0);

  let bits = 0;
  let value = 0;
  let outputIndex = 0;

  for (let i = 0; i < length; i++) {
    value = (value << 5) | CHAR_CODES.get(input.charCodeAt(i))!;
    bits += 5;

    if (bits >= 8) {
      output[outputIndex++] = (value >>> (bits - 8)) & 255;
      bits -= 8;
    }
  }

  return output;
}

/**
 * Converts data into a base32-encoded string.
 *
 * @see {@link https://www.rfc-editor.org/rfc/rfc4648.html#section-6}
 *
 * @param data The data to encode.
 * @returns The base32-encoded string.
 *
 * @example Usage
 * ```ts
 * import { encodeBase32 } from "@std/encoding/base32";
 * import { assertEquals } from "@std/assert/assert-equals";
 *
 * assertEquals(encodeBase32("6c60c0"), "GZRTMMDDGA======");
 * ```
 */
export function encodeBase32(uint8: ArrayBuffer | Uint8Array | string) {
  const data = validateBinaryLike(uint8);

  let bits = 0;
  let value = 0;
  let output = "";

  for (let i = 0; i < data.byteLength; i++) {
    value = (value << 8) | data[i]!;
    bits += 8;

    while (bits >= 5) {
      output += ALPHABET[(value >>> (bits - 5)) & 31];
      bits -= 5;
    }
  }

  if (bits > 0) {
    output += ALPHABET[(value << (5 - bits)) & 31];
  }

  while ((output.length % 8) !== 0) {
    output += "=";
  }

  return output;
}
