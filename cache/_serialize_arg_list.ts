// Copyright 2018-2026 the Deno authors. MIT license.
import type { CacheLike } from "./cache.ts";

/**
 * Default serialization of arguments list for use as cache keys. Equivalence
 * follows [`SameValueZero`](https://tc39.es/ecma262/multipage/abstract-operations.html#sec-samevaluezero)
 * reference equality, such that `getKey(x, y) === getKey(x, y)` for all values
 * of `x` and `y`, but `getKey({}) !== getKey({})`.
 *
 * @param cache The cache for which the keys will be used.
 * @returns `getKey`, the function for getting cache keys.
 */
export function _serializeArgList<Return>(
  cache: CacheLike<unknown, Return>,
): (this: unknown, ...args: unknown[]) => string {
  // Three cooperating data structures track weak (reference-type) arguments:
  //   1. weakKeyToKeySegmentCache: WeakMap from object/symbol → segment id
  //      (e.g. `"{0}"`) so the same reference always maps to the same segment.
  //   2. weakKeySegmentToKeyCache: Map from segment id → set of composite cache
  //      keys that contain that segment, used by the finalization callback.
  //   3. registry (FinalizationRegistry): when a weak key is garbage-collected,
  //      looks up its segment in (2) and deletes all associated entries from the
  //      caller-provided cache.
  const weakKeyToKeySegmentCache = new WeakMap<WeakKey, string>();
  const weakKeySegmentToKeyCache = new Map<string, Set<string>>();
  let nextWeakKeyId = 0;

  const registry = new FinalizationRegistry<string>((keySegment) => {
    for (const key of weakKeySegmentToKeyCache.get(keySegment) ?? []) {
      cache.delete(key);
    }
    weakKeySegmentToKeyCache.delete(keySegment);
  });

  return function getKey(...args) {
    const weakKeySegments: string[] = [];
    const keySegments = [this, ...args].map((arg) => {
      if (typeof arg === "undefined") return "undefined";
      if (typeof arg === "bigint") return `${arg}n`;

      if (typeof arg === "number") {
        return String(arg);
      }

      if (
        arg === null ||
        typeof arg === "string" ||
        typeof arg === "boolean"
      ) {
        // This branch will need to be updated if further types are added to
        // the language that support value equality,
        // e.g. https://github.com/tc39/proposal-record-tuple
        return JSON.stringify(arg);
      }

      if (typeof arg === "symbol") {
        try {
          new WeakRef(arg);
        } catch {
          return `Symbol.for(${JSON.stringify(arg.description)})`;
        }
      }

      try {
        new WeakRef(arg as WeakKey);
      } catch {
        throw new Error(
          "Should be unreachable: please open an issue at https://github.com/denoland/std/issues/new",
        );
      }

      let keySegment = weakKeyToKeySegmentCache.get(arg as WeakKey);
      if (keySegment === undefined) {
        keySegment = `{${nextWeakKeyId++}}`;
        registry.register(arg as WeakKey, keySegment);
        weakKeyToKeySegmentCache.set(arg as WeakKey, keySegment);
      }
      weakKeySegments.push(keySegment);
      return keySegment;
    });

    const key = keySegments.join(",");

    for (const keySegment of weakKeySegments) {
      let keys = weakKeySegmentToKeyCache.get(keySegment);
      if (keys === undefined) {
        keys = new Set();
        weakKeySegmentToKeyCache.set(keySegment, keys);
      }
      keys.add(key);
    }

    return key;
  };
}
