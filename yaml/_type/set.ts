// Ported from js-yaml v3.13.1:
// https://github.com/nodeca/js-yaml/commit/665aadda42349dcae869f12040d9b10ef18d12da
// Copyright 2011-2015 by Vitaly Puzrin. All rights reserved. MIT license.
// Copyright 2018-2026 the Deno authors. MIT license.

import type { Type } from "../_type.ts";

// A `Map` input means the loader runs with `useMaps`; the plain-object
// branches must stay byte-identical for the legacy loader.
export const set: Type<
  "mapping",
  Record<PropertyKey, unknown> | Set<unknown>
> = {
  tag: "tag:yaml.org,2002:set",
  kind: "mapping",
  construct: (
    data: Record<string, unknown> | Map<unknown, unknown> | null,
  ): Record<string, unknown> | Set<unknown> => {
    if (data instanceof Map) return new Set(data.keys());
    return data !== null ? data : {};
  },
  resolve: (
    data: Record<string, unknown> | Map<unknown, unknown> | null,
  ): boolean => {
    if (data === null) return true;
    const values = data instanceof Map
      ? [...data.values()]
      : Object.values(data);
    return values.every((it) => it === null);
  },
};
