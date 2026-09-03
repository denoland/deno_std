// Copyright 2018-2026 the Deno authors. MIT license.
// This module is browser compatible.

/**
 * Provides tools for working with
 * {@link https://code.visualstudio.com/docs/languages/json#_json-with-comments | JSONC}
 * (JSON with comments).
 *
 * On top of what JSON allows, this module accepts line comments (`//`), block
 * comments, and a trailing comma after the last member of an object or array.
 * Comments are discarded when parsing.
 *
 * Currently, this module only provides a means of parsing JSONC. JSONC
 * serialization is not yet supported.
 *
 * ```ts
 * import { parse } from "@std/jsonc";
 * import { assertEquals } from "@std/assert";
 *
 * assertEquals(parse('{"foo": "bar", } // comment'), { foo: "bar" });
 * assertEquals(parse('{"foo": "bar", } /* comment *\/'), { foo: "bar" });
 * ```
 *
 * @module
 */
export * from "./parse.ts";
