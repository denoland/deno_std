// Ported from js-yaml v3.13.1:
// https://github.com/nodeca/js-yaml/commit/665aadda42349dcae869f12040d9b10ef18d12da
// Copyright 2011-2015 by Vitaly Puzrin. All rights reserved. MIT license.
// Copyright 2018-2024 the Deno authors. All rights reserved. MIT license.
// This module is browser compatible.

import { load, loadDocuments } from "./_loader/loader.ts";
import { SCHEMA_MAP } from "./_schema.ts";

/**
 * Options for parsing YAML.
 */
export interface ParseOptions {
  /** Name of the schema to use.*/
  schema?: "core" | "default" | "failsafe" | "json" | "extended";
  /** function to call on warning messages. */
  onWarning?(this: null, e?: Error): void;
}

/**
 * Parse `content` as single YAML document, and return it.
 *
 * This function does not support regexps, functions, and undefined by default.
 * This method is safe for parsing untrusted data.
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
 * @throws {YamlError} Throws error on invalid YAML.
 * @param content YAML string to parse.
 * @param options Parsing options.
 * @returns Parsed document.
 */
export function parse(
  content: string,
  options: ParseOptions = {},
): unknown {
  return load(content, { ...options, schema: SCHEMA_MAP.get(options.schema!) });
}

/**
 * Same as `parse()`, but understands multi-document sources.
 * Applies iterator to each document if specified, or returns array of documents.
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
 * @param content YAML string to parse.
 * @param options Parsing options.
 * @returns Array of parsed documents.
 */
export function parseAll(content: string, options: ParseOptions = {}): unknown {
  return loadDocuments(content, {
    ...options,
    schema: SCHEMA_MAP.get(options.schema!),
  });
}
