// Ported from js-yaml v3.13.1:
// https://github.com/nodeca/js-yaml/commit/665aadda42349dcae869f12040d9b10ef18d12da
// Copyright 2011-2015 by Vitaly Puzrin. All rights reserved. MIT license.
// Copyright 2018-2026 the Deno authors. MIT license.
// This module is browser compatible.

import { DumperState } from "./_dumper_state.ts";
import { getSchema, type ImplicitType, type SchemaType } from "./_schema.ts";
import type { StringifyOptions as StableStringifyOptions } from "./stringify.ts";
import type { KindType, RepresentFn, Type } from "./_type.ts";

export type { ImplicitType, KindType, RepresentFn, SchemaType, Type };

/** Options for {@linkcode stringify}. */
export type StringifyOptions = StableStringifyOptions & {
  /**
   * Strings will be quoted using this quoting style.
   * If you specify single quotes, double quotes will still be used
   * for non-printable characters.
   *
   * @default {`'`}
   */
  quoteStyle?: "'" | '"';

  /**
   * Extra types to be added to the schema.
   */
  extraTypes?: ImplicitType[];
};

/**
 * Converts a JavaScript object or value to a YAML document string.
 *
 * Unlike the stable {@linkcode https://jsr.io/@std/yaml/doc/stringify/~/stringify | stringify},
 * `Map`s are stringified as YAML mappings in insertion order (`sortKeys` does
 * not apply to `Map` entries; its callback is string-keyed) and `Set`s as
 * `!!set` mappings. This is the counterpart of the `useMaps` option of
 * {@linkcode https://jsr.io/@std/yaml/doc/unstable-parse/~/parse | parse}.
 *
 * @experimental **UNSTABLE**: New API, yet to be vetted.
 *
 * @example Usage
 * ```ts
 * import { stringify } from "@std/yaml/stringify";
 * import { assertEquals } from "@std/assert";
 *
 * const data = { id: 1, name: "Alice" };
 * const yaml = stringify(data);
 *
 * assertEquals(yaml, "id: 1\nname: Alice\n");
 * ```
 *
 * @throws {TypeError} If `data` contains invalid types.
 * @param data The data to serialize.
 * @param options The options for serialization.
 * @returns A YAML string.
 */
export function stringify(
  data: unknown,
  options: StringifyOptions = {},
): string {
  const state = new DumperState({
    ...options,
    schema: getSchema(options.schema, options.extraTypes),
    serializeMapsAndSets: true,
  });
  return state.stringify(data);
}
