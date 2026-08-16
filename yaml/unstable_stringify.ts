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
   * Extra types to be added to the schema.
   */
  extraTypes?: ImplicitType[];
};

/**
 * Converts a JavaScript object or value to a YAML document string.
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
  });
  return state.stringify(data);
}
