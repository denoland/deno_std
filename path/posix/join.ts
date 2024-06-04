// Copyright 2018-2024 the Deno authors. All rights reserved. MIT license.
// This module is browser compatible.

import { normalize } from "./normalize.ts";

/**
 * Join all given a sequence of `paths`,then normalizes the resulting path.
 *
 * @example Usage
 * ```ts
 * import { join } from "@std/path/posix/join";
 * import { assertEquals } from "@std/assert/assert-equals";
 *
 * const path = join("/foo", "bar", "baz/asdf", "quux", "..");
 * assertEquals(path, "/foo/bar/baz/asdf");
 * ```
 *
 * @param paths The paths to join.
 * @returns The joined path.
 */
export function join(...paths: string[]): string {
  if (paths.length === 0) return ".";

  let joined: string | undefined;
  for (let i = 0; i < paths.length; ++i) {
    const path = paths[i]!;
    if (path.length > 0) {
      if (!joined) joined = path;
      else joined += `/${path}`;
    }
  }
  if (!joined) return ".";
  return normalize(joined);
}
