// Ported from js-yaml v3.13.1:
// https://github.com/nodeca/js-yaml/commit/665aadda42349dcae869f12040d9b10ef18d12da
// Copyright 2011-2015 by Vitaly Puzrin. All rights reserved. MIT license.
// Copyright 2018-2026 the Deno authors. MIT license.

import type { Type } from "../_type.ts";
import { isPlainObject } from "../_utils.ts";

// `Map` entries mean the loader runs with `useMaps`; the plain-object
// branches must stay byte-identical for the legacy loader.
function resolveYamlOmap(data: unknown[]): boolean {
  const objectKeys = new Set<unknown>();
  for (const object of data) {
    if (object instanceof Map) {
      if (object.size !== 1) return false;
      for (const key of object.keys()) {
        if (objectKeys.has(key)) return false;
        objectKeys.add(key);
      }
      continue;
    }
    if (!isPlainObject(object)) return false;
    const keys = Object.keys(object);
    if (keys.length !== 1) return false;
    for (const key of keys) {
      if (objectKeys.has(key)) return false;
      objectKeys.add(key);
    }
  }
  return true;
}

export const omap: Type<
  "sequence",
  Record<PropertyKey, unknown>[] | Map<unknown, unknown>
> = {
  tag: "tag:yaml.org,2002:omap",
  kind: "sequence",
  resolve: resolveYamlOmap,
  construct(data: unknown[]) {
    if (data.some((it) => it instanceof Map)) {
      const result = new Map<unknown, unknown>();
      for (const object of data as Map<unknown, unknown>[]) {
        for (const [key, value] of object) result.set(key, value);
      }
      return result;
    }
    return data as Record<PropertyKey, unknown>[];
  },
};
