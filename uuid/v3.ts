// Copyright 2018-2024 the Deno authors. All rights reserved. MIT license.
// This module is browser compatible.

import { bytesToUuid, uuidToBytes } from "./_common.ts";
import { concat } from "@std/bytes/concat";
import { assert } from "@std/assert/assert";
import { crypto } from "@std/crypto/crypto";

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[3][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

/**
 * Validates a UUIDv3, according to
 * {@link https://www.rfc-editor.org/rfc/rfc9562.html#section-5.3 | RFC 9562}.
 *
 * @param id UUID value.
 *
 * @returns `true` if the UUID is valid, otherwise `false`.
 *
 * @example Usage
 * ```ts
 * import { validate } from "@std/uuid/v3";
 * import { assert, assertFalse } from "@std/assert";
 *
 * assert(validate("22fe6191-c161-3d86-a432-a81f343eda08"));
 * assertFalse(validate("this-is-not-a-uuid"));
 * ```
 */
export function validate(id: string): boolean {
  return UUID_RE.test(id);
}

/**
 * Generate a UUIDv3, according to
 * {@link https://www.rfc-editor.org/rfc/rfc9562.html#section-5.3 | RFC 9562}.
 *
 * @param namespace The namespace to use, encoded as a UUID.
 * @param data The data to hash to calculate the MD5 digest for the UUID.
 *
 * @returns A UUIDv3 string.
 *
 * @example Usage
 * ```ts
 * import { NAMESPACE_URL } from "@std/uuid/constants";
 * import { generate, validate } from "@std/uuid/v3";
 * import { assert } from "@std/assert";
 *
 * const data = new TextEncoder().encode("python.org");
 * const uuid = await generate(NAMESPACE_URL, data);
 *
 * assert(validate(uuid));
 * ```
 */
export async function generate(
  namespace: string,
  data: Uint8Array,
): Promise<string> {
  // TODO(lino-levan): validate that `namespace` is a valid UUID.

  const space = uuidToBytes(namespace);
  assert(space.length === 16, "namespace must be a valid UUID");

  const toHash = concat([new Uint8Array(space), data]);
  const buffer = await crypto.subtle.digest("MD5", toHash);
  const bytes = new Uint8Array(buffer);

  bytes[6] = (bytes[6]! & 0x0f) | 0x30;
  bytes[8] = (bytes[8]! & 0x3f) | 0x80;

  return bytesToUuid(bytes);
}
