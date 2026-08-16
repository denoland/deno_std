// Ported from js-yaml v3.13.1:
// https://github.com/nodeca/js-yaml/commit/665aadda42349dcae869f12040d9b10ef18d12da
// Copyright 2011-2015 by Vitaly Puzrin. All rights reserved. MIT license.
// Copyright 2018-2026 the Deno authors. MIT license.
// This module is browser compatible.

import { isEOL } from "./_chars.ts";
import { LoaderState } from "./_loader_state.ts";
import type { ParseOptions as StableParseOptions } from "./parse.ts";
import { getSchema, type ImplicitType, type SchemaType } from "./_schema.ts";
import type { KindType, RepresentFn, Type } from "./_type.ts";

export type { ImplicitType, KindType, RepresentFn, SchemaType, Type };

/** Options for {@linkcode parse}. */
export type ParseOptions = StableParseOptions & {
  /**
   * Extra types to be added to the schema.
   */
  extraTypes?: ImplicitType[];
  /**
   * If `true`, YAML mappings are parsed into {@linkcode Map}s instead of
   * plain objects, and keys keep their parsed types instead of being coerced
   * to strings: `3:` yields the number `3`, `"3":` the string `"3"`. Applies
   * at every depth; entries preserve document order. `!!set` becomes a
   * {@linkcode Set}, `!!omap` a `Map`, and `!!pairs` an array of
   * `[key, value]` pairs. Duplicate keys compare like `Map` keys
   * (SameValueZero), so `3` and `"3"` are distinct keys.
   *
   * @experimental **UNSTABLE**: New API, yet to be vetted.
   *
   * @default {false}
   */
  useMaps?: boolean;
};

function sanitizeInput(input: string) {
  input = String(input);

  if (input.length > 0) {
    // Add trailing `\n` if not exists
    if (!isEOL(input.charCodeAt(input.length - 1))) input += "\n";

    // Strip BOM
    if (input.charCodeAt(0) === 0xfeff) input = input.slice(1);
  }

  return input;
}

/**
 * Parse and return a YAML string as a parsed YAML document object.
 *
 * Note: This does not support functions. Untrusted data is safe to parse.
 *
 * @example Usage
 * ```ts
 * import { parse } from "@std/yaml/parse";
 * import { assertEquals } from "@std/assert";
 *
 * const data = parse(`
 * id: 1
 * name: Alice
 * `);
 *
 * assertEquals(data, { id: 1, name: "Alice" });
 * ```
 *
 * @throws {YamlSyntaxError} Throws if the YAML is invalid or contains more
 * than one document.
 * @param content YAML string to parse.
 * @param options Parsing options.
 * @returns Parsed document.
 */
export function parse(
  content: string,
  options: ParseOptions = {},
): unknown {
  content = sanitizeInput(content);
  const state = new LoaderState(content, {
    ...options,
    schema: getSchema(options.schema, options.extraTypes),
  });
  const documents = state.readDocuments({ singleDocument: true });
  const document = documents.next().value;
  documents.next();
  return document ?? null;
}

/**
 * Same as {@linkcode parse}, but understands multi-document YAML sources, and
 * returns multiple parsed YAML document objects.
 *
 * @example Usage
 * ```ts
 * import { parseAll } from "@std/yaml/parse";
 * import { assertEquals } from "@std/assert";
 *
 * const data = parseAll(`
 * ---
 * id: 1
 * name: Alice
 * ---
 * id: 2
 * name: Bob
 * ---
 * id: 3
 * name: Eve
 * `);
 * assertEquals(data, [ { id: 1, name: "Alice" }, { id: 2, name: "Bob" }, { id: 3, name: "Eve" }]);
 * ```
 *
 * @throws {YamlSyntaxError} Throws if the YAML is invalid.
 * @param content YAML string to parse.
 * @param options Parsing options.
 * @returns Array of parsed documents.
 */
export function parseAll(
  content: string,
  options: ParseOptions = {},
): unknown[] {
  content = sanitizeInput(content);
  const state = new LoaderState(content, {
    ...options,
    schema: getSchema(options.schema, options.extraTypes),
  });
  return [...state.readDocuments()];
}
