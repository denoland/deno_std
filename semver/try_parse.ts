// Copyright 2018-2024 the Deno authors. All rights reserved. MIT license.
import type { SemVer } from "./types.ts";
import { parse } from "./parse.ts";

/**
 * Returns the parsed version, or undefined if it's not valid.
 * @param version The version string to parse
 * @returns A valid SemVer or `undefined`
 * @deprecated (will be removed after 0.213.0) Use {@linkcode parse} inside a try-catch statement instead.
 */
export function tryParse(version?: string): SemVer | undefined {
  if (version === undefined) {
    return undefined;
  }
  try {
    return parse(version);
  } catch {
    return undefined;
  }
}
