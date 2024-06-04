// Copyright 2018-2024 the Deno authors. All rights reserved. MIT license.
// This module is browser compatible.

import { isPosixPathSeparator } from "./_util.ts";

/**
 * Verifies whether provided path is absolute.
 *
 * @example Usage
 * ```ts
 * import { isAbsolute } from "@std/path/posix/is-absolute";
 * import { assert, assertFalse } from "@std/assert";
 *
 * assert(isAbsolute("/home/user/Documents/"));
 * assertFalse(isAbsolute("home/user/Documents/"));
 * ```
 *
 * @param path The path to verify.
 * @returns Whether the path is absolute.
 */
export function isAbsolute(path: string): boolean {
  return path.length > 0 && isPosixPathSeparator(path.charCodeAt(0));
}
