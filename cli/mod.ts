// Copyright 2018-2024 the Deno authors. All rights reserved. MIT license.

/**
 * Tools for creating interactive command line tools.
 *
 * ```ts
 * // $ deno run example.ts --foo --bar=baz ./quux.txt
 * import { parseArgs } from "https://deno.land/std@$STD_VERSION/cli/parse_args.ts";
 *
 * const parsedArgs = parseArgs(Deno.args);
 * parsedArgs; // { foo: true, bar: "baz", _: ["./quux.txt"] }
 * ```
 *
 * @module
 */

export * from "./parse_args.ts";
export * from "./prompt_secret.ts";
export * from "./spinner.ts";
export * from "./parse.ts";
export * from "./types.ts";
