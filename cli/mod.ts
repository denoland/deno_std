// Copyright 2018-2024 the Deno authors. All rights reserved. MIT license.

/**
 * Tools for creating interactive command line tools.
 *
 * ```ts
 * import { parseArgs } from "@std/cli/parse-args";
 * import { assertEquals } from "@std/assert/assert-equals";
 *
 * // Same as running `deno run example.ts --foo --bar=baz ./quux.txt`
 * const args = parseArgs(["--foo", "--bar=baz", "./quux.txt"]);
 * assertEquals(args, { foo: true, bar: "baz", _: ["./quux.txt"] });
 * ```
 *
 * @module
 */

export * from "./parse_args.ts";
export * from "./prompt_secret.ts";
export * from "./spinner.ts";
export * from "./parse.ts";
export * from "./types.ts";
export * from "./unicode_width.ts";
