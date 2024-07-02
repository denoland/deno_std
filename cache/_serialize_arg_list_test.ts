// Copyright 2018-2024 the Deno authors. All rights reserved. MIT license.
import { assertEquals } from "@std/assert";
import { _serializeArgList } from "./memoize.ts";
import { delay } from "@std/async";

Deno.test("_serializeArgList() serializes simple numbers", () => {
  const getKey = _serializeArgList(new Map());
  assertEquals(getKey(1), "undefined,1");
  assertEquals(getKey(1, 2), "undefined,1,2");
  assertEquals(getKey(1, 2, 3), "undefined,1,2,3");
});

Deno.test("_serializeArgList() serializes reference types", () => {
  const getKey = _serializeArgList(new Map());
  const obj = {};
  const arr: [] = [];
  const sym = Symbol("xyz");

  assertEquals(getKey(obj), "undefined,{0}");
  assertEquals(getKey(obj, obj), "undefined,{0},{0}");

  assertEquals(getKey(arr), "undefined,{1}");
  assertEquals(getKey(sym), "undefined,{2}");
  assertEquals(
    getKey(obj, arr, sym),
    "undefined,{0},{1},{2}",
  );
});

Deno.test("_serializeArgList() gives same results as SameValueZero algorithm", async (t) => {
  /**
   * [`SameValueZero`](https://tc39.es/ecma262/multipage/abstract-operations.html#sec-samevaluezero),
   * used by [`Set`](https://tc39.es/ecma262/multipage/keyed-collections.html#sec-set-objects):
   *
   * > Distinct values are discriminated using the SameValueZero comparison algorithm.
   */
  const sameValueZero = (x: unknown, y: unknown) => new Set([x, y]).size === 1;

  const getKey = _serializeArgList(new Map());

  const values = [
    1,
    "1",
    '"1"',
    1n,
    0,
    -0,
    0n,
    true,
    "true",
    null,
    undefined,
    Infinity,
    -Infinity,
    NaN,
    {},
    {},
    Symbol("x"),
    Symbol.for("x"),
  ];

  await t.step("Serialization of values", () => {
    assertEquals(
      getKey(...values),
      'undefined,1,"1","\\"1\\"",1n,0,0,0n,true,"true",null,undefined,Infinity,-Infinity,NaN,{0},{1},{2},Symbol.for("x")',
    );
  });

  await t.step("Gives consistent serialization for each value", () => {
    for (const x of values) {
      assertEquals(getKey(x), getKey(x));
    }
  });

  await t.step("Gives same equivalence for each pair of values", () => {
    for (const x of values) {
      for (const y of values) {
        const expectedEquivalence = sameValueZero(x, y);
        const actualEquivalence = getKey(x) === getKey(y);
        assertEquals(actualEquivalence, expectedEquivalence);
      }
    }
  });
});

Deno.test("_serializeArgList() discriminates on `this` arg", () => {
  const getKey = _serializeArgList(new Map());
  const obj1 = {};
  const obj2 = {};

  assertEquals(getKey(), "undefined");
  assertEquals(getKey.call(obj1), "{0}");
  assertEquals(getKey.call(obj2), "{1}");
  assertEquals(getKey.call(obj1, obj2), "{0},{1}");
});

Deno.test("_serializeArgList() allows garbage collection for weak keys", async () => {
  // @ts-expect-error - Triggering true garbage collection is only available
  // with `--v8-flags="--expose-gc"`, so we mock `FinalizationRegistry` with
  // `using` and some `Symbol.dispose` trickery if it's not available. Run this
  // test with `deno test --v8-flags="--expose-gc"` to test actual gc behavior
  // (however, even calling `globalThis.gc` doesn't _guarantee_ garbage
  // collection, so this may be flaky between v8 versions etc.)
  const gc = globalThis.gc as undefined | (() => void);

  class MockFinalizationRegistry<T> extends FinalizationRegistry<T> {
    #cleanupCallback: (heldValue: T) => void;

    constructor(cleanupCallback: (heldValue: T) => void) {
      super(cleanupCallback);
      this.#cleanupCallback = cleanupCallback;
    }

    override register(target: WeakKey, heldValue: T) {
      Object.assign(target, {
        onCleanup: () => {
          this.#cleanupCallback(heldValue);
        },
      });
    }
  }

  function makeRegisterableObject() {
    const onCleanup = null as (() => void) | null;
    return {
      onCleanup,
      [Symbol.dispose]() {
        this.onCleanup?.();
      },
    };
  }

  const OriginalFinalizationRegistry = FinalizationRegistry;

  try {
    if (!gc) {
      globalThis.FinalizationRegistry = MockFinalizationRegistry;
    }

    const cache = new Map();
    const getKey = _serializeArgList(cache);

    using outerScopeObj = makeRegisterableObject();

    const k1 = getKey(outerScopeObj);
    const k2 = getKey(globalThis);
    const k3 = getKey("primitive");
    const k4 = getKey(globalThis, "primitive");
    const k5 = getKey(globalThis, "primitive", outerScopeObj);

    const persistentKeys = new Set([k1, k2, k3, k4, k5]);

    await (async () => {
      using obj1 = makeRegisterableObject();
      using obj2 = makeRegisterableObject();

      const k6 = getKey(obj1);
      const k7 = getKey(obj2);
      const k8 = getKey(obj1, obj2);
      const k9 = getKey(obj1, globalThis);
      const k10 = getKey(obj1, "primitive");
      const k11 = getKey(obj1, outerScopeObj);

      const ephemeralKeys = new Set([k6, k7, k8, k9, k10, k11]);

      const keys = new Set([...ephemeralKeys, ...persistentKeys]);
      for (const [idx, key] of [...keys].entries()) {
        cache.set(key, idx + 1);
      }

      gc?.();
      // wait for gc to run
      await delay(0);
      assertEquals(cache.size, keys.size);
    })();

    gc?.();
    // wait for gc to run
    await delay(0);
    assertEquals(cache.size, persistentKeys.size);
  } finally {
    globalThis.FinalizationRegistry = OriginalFinalizationRegistry;
  }
});
