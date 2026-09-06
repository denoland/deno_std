// Copyright 2018-2026 the Deno authors. MIT license.
import { assert, assertEquals, assertRejects, assertThrows } from "@std/assert";
import { type MemoizationCacheResult, memoize } from "./memoize.ts";
import { Cache } from "./cache.ts";

Deno.test("memoize() memoizes nullary function (lazy/singleton)", async (t) => {
  await t.step("async function", async () => {
    let calls = 0;

    const db = {
      connect() {
        ++calls;
        return Promise.resolve({});
      },
    };

    const getConn = memoize(async () => await db.connect());
    const conn = await getConn();
    assertEquals(calls, 1);
    const conn2 = await getConn();
    assert(conn2 === conn);
    assertEquals(calls, 1);
  });

  await t.step("sync function", () => {
    let calls = 0;
    const fn = memoize(() => {
      ++calls;
      return {};
    });

    const result = fn();
    assertEquals(calls, 1);

    const result2 = fn();
    assert(result2 === result);
    assertEquals(calls, 1);
  });
});

Deno.test("memoize() returns cached result for repeated calls", () => {
  let calls = 0;
  const fn = memoize((a: number, b: number) => {
    ++calls;
    return a + b;
  });

  assertEquals(fn(7, 8), 15);
  assertEquals(fn(7, 8), 15);
  assertEquals(calls, 1);

  assertEquals(fn(8, 7), 15);
  assertEquals(calls, 2);
});

Deno.test("memoize() supports recursive self-referential functions", () => {
  const fib = memoize((n: bigint): bigint => {
    return n <= 2n ? 1n : fib(n - 1n) + fib(n - 2n);
  });

  assertEquals(fib(100n), 354224848179261915075n);
});

Deno.test("memoize() caches by all passed args including implicit ones", () => {
  let calls = 0;
  const fn = memoize((n: number) => {
    ++calls;
    return 0 - n;
  });

  assertEquals([1, 1, 2, 2].map(fn), [-1, -1, -2, -2]);
  assertEquals(calls, 4);
});

Deno.test("memoize() allows ...spread primitive args", () => {
  let calls = 0;
  const fn = memoize((...ns: number[]) => {
    ++calls;
    return ns.reduce((total, val) => total + val, 0);
  });

  assertEquals(fn(), 0);
  assertEquals(fn(), 0);
  assertEquals(calls, 1);
  assertEquals(fn(7), 7);
  assertEquals(fn(7), 7);
  assertEquals(calls, 2);
  assertEquals(fn(7, 8), 15);
  assertEquals(fn(7, 8), 15);
  assertEquals(calls, 3);
  assertEquals(fn(7, 8, 9), 24);
  assertEquals(fn(7, 8, 9), 24);
  assertEquals(calls, 4);
});

Deno.test("memoize() preserves `this` binding for function and getKey", () => {
  type Obj = { b: number; c: number; memoized: (a: number) => number };

  let calls = 0;

  const fn = function (this: Obj, a: number) {
    ++calls;
    return a + this.b + this.c;
  };

  const memoized = memoize(fn, {
    getKey(this: Obj, a: number) {
      return JSON.stringify([a, this.b, this.c]);
    },
  });

  const obj: Obj = { memoized, b: 2, c: 3 };
  assertEquals(obj.memoized(1), 6);
  assertEquals(obj.memoized(1), 6);
  assertEquals(calls, 1);

  obj.b = 3;
  obj.c = 5;
  assertEquals(obj.memoized(1), 9);
  assertEquals(calls, 2);
});

Deno.test("memoize() caches single reference arg (symbol) by identity", () => {
  let calls = 0;
  const fn = memoize((sym: symbol) => {
    ++calls;
    return sym;
  });
  const sym1 = Symbol();
  const sym2 = Symbol();

  fn(sym1);
  assertEquals(calls, 1);
  fn(sym1);
  assertEquals(calls, 1);
  fn(sym2);
  assertEquals(calls, 2);
});

Deno.test("memoize() caches by reference identity for non-primitive args", () => {
  let calls = 0;
  const fn = memoize((a: unknown, b: unknown) => {
    ++calls;
    return { a, b };
  });
  const x = {};
  const y = {};

  fn(x, x);
  fn(x, x);
  assertEquals(calls, 1);

  fn(x, y);
  assertEquals(calls, 2);

  fn(y, x);
  assertEquals(calls, 3);
});

Deno.test("memoize() uses custom `getKey` to derive cache key", () => {
  const fn = memoize(({ value }: { cacheKey: number; value: number }) => {
    return value;
  }, { getKey: ({ cacheKey }) => cacheKey });

  assertEquals(fn({ cacheKey: 1, value: 2 }), 2);
  assertEquals(fn({ cacheKey: 1, value: 99 }), 2);
  assertEquals(fn({ cacheKey: 2, value: 99 }), 99);
});

Deno.test("memoize() `getKey` can collapse distinct args to same key", () => {
  let calls = 0;
  const fn = memoize((arg: string | number | boolean) => {
    ++calls;
    try {
      return JSON.parse(String(arg)) as string | number | boolean;
    } catch {
      return arg;
    }
  }, { getKey: (arg) => String(arg) });

  assertEquals(fn("true"), true);
  assertEquals(fn(true), true);
  assertEquals(calls, 1);

  assertEquals(fn("42"), 42);
  assertEquals(fn(42), 42);
  assertEquals(calls, 2);
});

Deno.test("memoize() caches async function results", async () => {
  let calls = 0;
  const fn = memoize(async (n: number) => {
    await Promise.resolve();
    ++calls;
    return 0 - n;
  });

  assertEquals(await fn(42), -42);
  assertEquals(await fn(42), -42);
  assertEquals(calls, 1);

  assertEquals(await fn(888), -888);
  assertEquals(calls, 2);
});

Deno.test("memoize() does not cache rejected promises by default", async () => {
  let rejectNext = true;
  const fn = memoize(async (n: number) => {
    await Promise.resolve();
    const shouldReject = rejectNext;
    rejectNext = !rejectNext;
    if (shouldReject) throw new Error();
    return 0 - n;
  });

  await assertRejects(() => fn(42));
  assertEquals(await fn(42), -42);
  assertEquals(await fn(42), -42);
});

Deno.test("memoize() returns same promise for parallel calls with same args", async () => {
  let rejectNext = true;
  const fn = memoize(async (n: number) => {
    await Promise.resolve();
    if (rejectNext) {
      rejectNext = false;
      throw new Error(`Rejected ${n}`);
    }
    return 0 - n;
  });

  const promises = [42, 42, 888, 888].map((x) => fn(x));
  const results = await Promise.allSettled(promises);

  assert(promises[0] === promises[1]);
  assertEquals(results[1]!.status, "rejected");

  assert(promises[2] === promises[3]);
  assertEquals(results[3]!.status, "fulfilled");
});

Deno.test("memoize() allows passing an explicit `Map` as a cache", () => {
  let calls = 0;
  const cache = new Map();
  const fn = memoize((n: number) => {
    ++calls;
    return 0 - n;
  }, { cache });

  assertEquals(fn(42), -42);
  assertEquals(calls, 1);
  assertEquals(fn(42), -42);
  assertEquals(calls, 1);
});

Deno.test("memoize() works with custom cache implementing CacheLike", () => {
  let calls = 0;

  const neverCache = {
    has: () => false,
    get: () => undefined,
    set: () => {},
    delete: () => {},
  };

  const fn = memoize((n: number) => {
    ++calls;
    return 0 - n;
  }, { cache: neverCache });

  assertEquals(fn(42), -42);
  assertEquals(fn(42), -42);
  assertEquals(calls, 2);
});

Deno.test("memoize() evicts stale entries when used with Cache", () => {
  let calls = 0;
  const MAX_SIZE = 3;

  const fn = memoize((n: number) => {
    ++calls;
    return 0 - n;
  }, {
    cache: new Cache<string, MemoizationCacheResult<number>>({
      maxSize: MAX_SIZE,
    }),
  });

  fn(1);
  fn(2);
  fn(3);
  assertEquals(calls, 3);

  fn(1);
  assertEquals(calls, 3);

  fn(4);
  assertEquals(calls, 4);

  fn(2);
  assertEquals(calls, 5);
});

Deno.test("memoize() only caches single latest result with Cache of maxSize=1", () => {
  let calls = 0;

  const fn = memoize((n: number) => {
    ++calls;
    return 0 - n;
  }, {
    cache: new Cache<string, MemoizationCacheResult<number>>({ maxSize: 1 }),
  });

  assertEquals(fn(0), 0);
  assertEquals(fn(0), 0);
  assertEquals(calls, 1);

  assertEquals(fn(1), -1);
  assertEquals(calls, 2);

  assertEquals(fn(0), 0);
  assertEquals(calls, 3);
});

Deno.test("memoize() exposes the underlying cache", () => {
  const fn = memoize((n: number) => 0 - n);

  fn(1);
  fn(2);

  assertEquals(fn.cache.size, 2);
  fn.cache.clear();
  assertEquals(fn.cache.size, 0);

  let calls = 0;
  const fn2 = memoize((n: number) => {
    ++calls;
    return n;
  });

  fn2(1);
  fn2(1);
  assertEquals(calls, 1);

  fn2.cache.delete([...fn2.cache.keys()][0]!);
  fn2(1);
  assertEquals(calls, 2);
});

Deno.test("memoize() preserves function length and name", () => {
  assertEquals(memoize(() => {}).length, 0);
  assertEquals(memoize((_a: number) => {}).length, 1);
  assertEquals(memoize((_a: number, _b: number) => {}).length, 2);
  assertEquals(memoize((..._args: number[]) => {}).length, 0);
  assertEquals(memoize((_a: number, ..._args: number[]) => {}).length, 1);

  const fn1 = () => {};
  function fn2() {}
  const obj = { ["!"]: () => {} };

  assertEquals(memoize(() => {}).name, "");
  assertEquals(memoize(fn1).name, "fn1");
  assertEquals(memoize(fn1.bind({})).name, "bound fn1");
  assertEquals(memoize(fn2).name, "fn2");
  assertEquals(memoize(function fn3() {}).name, "fn3");
  assertEquals(memoize(obj["!"]).name, "!");
});

Deno.test("memoize() respects `errorIsCacheable` option", async (t) => {
  type ErrKind = "retriable" | "persistent";
  const errorIsCacheable = (err: unknown) => (err as ErrKind) === "persistent";

  await t.step("errors are not cached by default", () => {
    let calls = 0;
    const fn = memoize((val: ErrKind) => {
      ++calls;
      throw val;
    });

    assertThrows(() => fn("retriable"));
    assertThrows(() => fn("retriable"));
    assertEquals(calls, 2);
  });

  await t.step("cacheable sync errors are cached", () => {
    let calls = 0;
    const fn = memoize((val: ErrKind) => {
      ++calls;
      throw val;
    }, { errorIsCacheable });

    assertThrows(() => fn("persistent"));
    assertThrows(() => fn("persistent"));
    assertEquals(calls, 1);

    assertThrows(() => fn("retriable"));
    assertThrows(() => fn("retriable"));
    assertEquals(calls, 3);
  });

  await t.step("cacheable async rejections are cached", async () => {
    let calls = 0;
    const fn = memoize(async (val: ErrKind) => {
      await Promise.resolve();
      ++calls;
      throw val;
    }, { errorIsCacheable });

    await assertRejects(() => fn("persistent"));
    await assertRejects(() => fn("persistent"));
    assertEquals(calls, 1);

    await assertRejects(() => fn("retriable"));
    await assertRejects(() => fn("retriable"));
    assertEquals(calls, 3);
  });
});

Deno.test("memoize() preserves TypeScript types", async (t) => {
  await t.step("preserves parameter, return, and this types", () => {
    void (() => {
      const fn: (this: number, x: number) => number = (_) => 1;
      const memoized = memoize(fn);

      const _fn2: typeof fn = memoized;
      const _fn3: Omit<typeof memoized, "cache"> = fn;

      const _t1: ThisParameterType<typeof fn> = 1;
      // @ts-expect-error Type 'string' is not assignable to type 'number'.
      const _t2: ThisParameterType<typeof fn> = "1";

      const _a1: Parameters<typeof fn>[0] = 1;
      // @ts-expect-error Type 'string' is not assignable to type 'number'.
      const _a2: Parameters<typeof fn>[0] = "1";
      // @ts-expect-error Tuple type '[x: number]' of length '1' has no element at index '1'.
      const _a3: Parameters<typeof fn>[1] = {} as never;

      const _r1: ReturnType<typeof fn> = 1;
      // @ts-expect-error Type 'string' is not assignable to type 'number'.
      const _r2: ReturnType<typeof fn> = "1";
    });
  });

  await t.step("preserves generic types", () => {
    void (() => {
      const fn = <T>(x: T): T => x;
      const memoized = memoize(fn);

      const _fn2: typeof fn = memoized;
      const _fn3: Omit<typeof memoized, "cache"> = fn;

      const _r1: number = fn(1);
      const _r2: string = fn("1");
      // @ts-expect-error Type 'string' is not assignable to type 'number'.
      const _r3: number = fn("1");

      const _fn4: typeof fn<number> = (n: number) => n;
      // @ts-expect-error Type 'string' is not assignable to type 'number'.
      const _fn5: typeof fn<string> = (n: number) => n;
    });
  });
});
