// Copyright 2018-2026 the Deno authors. MIT license.
import { assert, assertEquals, assertRejects, assertThrows } from "@std/assert";
import { FakeTime } from "@std/testing/time";
import {
  Cache,
  type CacheOptions,
  type CacheOptionsSwr,
  type CacheRemovalReason,
} from "./cache.ts";

// ─── Constructor ─────────────────────────────────────

Deno.test("Cache() creates an unbounded cache with no options", () => {
  const cache = new Cache<string, number>();
  assertEquals(cache.maxSize, undefined);
  assertEquals(cache.size, 0);
});

Deno.test("Cache() creates a bounded cache", () => {
  const cache = new Cache<string, number>({ maxSize: 3 });
  assertEquals(cache.maxSize, 3);
});

Deno.test("Cache() throws on invalid maxSize", () => {
  assertThrows(
    () => new Cache<string, number>({ maxSize: 0 }),
    RangeError,
    "maxSize must be a positive integer",
  );
  assertThrows(
    () => new Cache<string, number>({ maxSize: -1 }),
    RangeError,
  );
  assertThrows(
    () => new Cache<string, number>({ maxSize: 1.5 }),
    RangeError,
  );
});

Deno.test("Cache() throws on invalid ttl", () => {
  assertThrows(
    () => new Cache<string, number>({ ttl: -1 }),
    RangeError,
    "ttl must be a finite non-negative number",
  );
  assertThrows(
    () => new Cache<string, number>({ ttl: NaN }),
    RangeError,
  );
  assertThrows(
    () => new Cache<string, number>({ ttl: Infinity }),
    RangeError,
  );
});

// ─── Pure LRU ────────────────────────────────────────

Deno.test("Cache set/get/has/peek/delete work in pure LRU mode", () => {
  const cache = new Cache<string, number>({ maxSize: 3 });

  cache.set("a", 1);
  cache.set("b", 2);
  cache.set("c", 3);

  assertEquals(cache.get("a"), 1);
  assertEquals(cache.has("b"), true);
  assertEquals(cache.peek("c"), 3);
  assertEquals(cache.size, 3);

  assertEquals(cache.delete("b"), true);
  assertEquals(cache.delete("b"), false);
  assertEquals(cache.size, 2);
});

Deno.test("Cache evicts LRU entry when maxSize exceeded", () => {
  const ejected: [string, number, CacheRemovalReason][] = [];
  const cache = new Cache<string, number>({
    maxSize: 2,
    onRemove: (k, v, r) => ejected.push([k, v, r]),
  });

  cache.set("a", 1);
  cache.set("b", 2);
  cache.set("c", 3);

  assertEquals(cache.has("a"), false);
  assertEquals(cache.get("b"), 2);
  assertEquals(cache.get("c"), 3);
  assertEquals(ejected, [["a", 1, "evicted"]]);
});

Deno.test("Cache get() promotes to MRU", () => {
  const cache = new Cache<string, number>({ maxSize: 2 });

  cache.set("a", 1);
  cache.set("b", 2);
  cache.get("a");
  cache.set("c", 3);

  assertEquals(cache.has("a"), true);
  assertEquals(cache.has("b"), false);
});

Deno.test("Cache peek() does not promote", () => {
  const cache = new Cache<string, number>({ maxSize: 2 });

  cache.set("a", 1);
  cache.set("b", 2);
  cache.peek("a");
  cache.set("c", 3);

  assertEquals(cache.has("a"), false);
  assertEquals(cache.has("b"), true);
});

Deno.test("Cache set() overwrites existing key without onRemove and promotes to MRU", () => {
  const ejected: string[] = [];
  const cache = new Cache<string, number>({
    maxSize: 2,
    onRemove: (k) => ejected.push(k),
  });

  cache.set("a", 1);
  cache.set("b", 2);
  cache.set("a", 99);
  cache.set("c", 3);

  assertEquals(cache.get("a"), 99);
  assertEquals(cache.has("b"), false);
  assertEquals(ejected, ["b"]);
});

Deno.test("Cache set() returns this for chaining", () => {
  const cache = new Cache<string, number>({ maxSize: 10 });
  const result = cache.set("a", 1).set("b", 2);
  assert(result === cache);
});

Deno.test("Cache with maxSize=1 always holds only one entry", () => {
  const cache = new Cache<string, number>({ maxSize: 1 });

  cache.set("a", 1);
  cache.set("b", 2);
  assertEquals(cache.size, 1);
  assertEquals(cache.has("a"), false);
  assertEquals(cache.get("b"), 2);
});

// ─── TTL ─────────────────────────────────────────────

Deno.test("Cache with TTL expires entries on get()", () => {
  using time = new FakeTime(0);
  using cache = new Cache<string, number>({ ttl: 100 });

  cache.set("a", 1);
  assertEquals(cache.get("a"), 1);

  time.tick(101);
  assertEquals(cache.get("a"), undefined);
});

Deno.test("Cache TTL timer fires and removes entries via onRemove", () => {
  using time = new FakeTime(0);
  const ejected: [string, number, CacheRemovalReason][] = [];
  using cache = new Cache<string, number>({
    ttl: 100,
    onRemove: (k, v, r) => ejected.push([k, v, r]),
  });

  cache.set("a", 1);
  time.tick(101);
  assertEquals(cache.size, 0);
  assertEquals(ejected, [["a", 1, "expired"]]);
});

Deno.test("Cache per-entry TTL override", () => {
  using time = new FakeTime(0);
  using cache = new Cache<string, number>({ ttl: 1000 });

  cache.set("short", 1, { ttl: 50 });
  cache.set("normal", 2);

  time.tick(51);
  assertEquals(cache.get("short"), undefined);
  assertEquals(cache.get("normal"), 2);
});

Deno.test("Cache per-entry TTL on non-TTL cache creates a timer", () => {
  using time = new FakeTime(0);
  using cache = new Cache<string, number>({ maxSize: 100 });

  cache.set("timed", 1, { ttl: 100 });
  cache.set("forever", 2);

  time.tick(101);
  assertEquals(cache.get("timed"), undefined);
  assertEquals(cache.get("forever"), 2);
});

Deno.test("Cache set() with ttl: 0 expires immediately", () => {
  using _time = new FakeTime(0);
  using cache = new Cache<string, number>({ ttl: 1000 });

  cache.set("a", 1, { ttl: 0 });
  assertEquals(cache.get("a"), undefined);
  assertEquals(cache.stats.expirations, 1);
});

Deno.test("Cache sliding expiration resets TTL on get()", () => {
  using time = new FakeTime(0);
  using cache = new Cache<string, number>({
    ttl: 100,
    slidingExpiration: true,
  });

  cache.set("a", 1);
  time.tick(80);
  assertEquals(cache.get("a"), 1);

  time.tick(80);
  assertEquals(cache.get("a"), 1);

  time.tick(101);
  assertEquals(cache.get("a"), undefined);
});

Deno.test("Cache sliding expiration not reset by peek()", () => {
  using time = new FakeTime(0);
  using cache = new Cache<string, number>({
    ttl: 100,
    slidingExpiration: true,
  });

  cache.set("a", 1);
  time.tick(80);
  cache.peek("a");

  time.tick(21);
  assertEquals(cache.get("a"), undefined);
});

Deno.test("Cache absoluteExpiration caps sliding window", () => {
  using time = new FakeTime(0);
  using cache = new Cache<string, number>({
    ttl: 100,
    slidingExpiration: true,
  });

  cache.set("a", 1, { absoluteExpiration: 150 });

  time.tick(80);
  assertEquals(cache.get("a"), 1);
  time.tick(60);
  assertEquals(cache.get("a"), 1);

  time.tick(20);
  assertEquals(cache.get("a"), undefined);
});

Deno.test("Cache absoluteExpiration clamps initial deadline without slidingExpiration", () => {
  using time = new FakeTime(0);
  using cache = new Cache<string, number>({ ttl: 1000 });

  cache.set("a", 1, { absoluteExpiration: 200 });

  time.tick(201);
  assertEquals(cache.has("a"), false);
});

Deno.test("Cache multiple TTL entries expire in correct order", () => {
  using time = new FakeTime(0);
  const ejected: string[] = [];
  using cache = new Cache<string, number>({
    ttl: 1000,
    onRemove: (k, _v, r) => {
      if (r === "expired") ejected.push(k);
    },
  });

  cache.set("a", 1, { ttl: 100 });
  cache.set("b", 2, { ttl: 200 });
  cache.set("c", 3, { ttl: 300 });

  time.tick(101);
  assertEquals(ejected, ["a"]);

  time.tick(100);
  assertEquals(ejected, ["a", "b"]);

  time.tick(100);
  assertEquals(ejected, ["a", "b", "c"]);
});

// ─── LRU + TTL combined ─────────────────────────────

Deno.test("Cache LRU + TTL: eviction cleans up heap entry", () => {
  using time = new FakeTime(0);
  const ejected: [string, number, CacheRemovalReason][] = [];
  using cache = new Cache<string, number>({
    maxSize: 2,
    ttl: 1000,
    onRemove: (k, v, r) => ejected.push([k, v, r]),
  });

  cache.set("a", 1);
  cache.set("b", 2);
  cache.set("c", 3);

  assertEquals(ejected, [["a", 1, "evicted"]]);

  // After TTL fires, only surviving entries (b, c) should expire; the already-
  // evicted "a" must not reappear as "expired" (which would indicate a stale
  // heap entry leaking back through).
  time.tick(1001);
  assertEquals(
    ejected.filter(([, , r]) => r === "expired").map(([k]) => k).sort(),
    ["b", "c"],
  );
});

Deno.test("Cache LRU + TTL: expired entry not returned even before timer fires", () => {
  using time = new FakeTime(0);
  using cache = new Cache<string, number>({ maxSize: 100, ttl: 100 });

  cache.set("a", 1);
  time.tick(101);

  assertEquals(cache.get("a"), undefined);
  assertEquals(cache.has("a"), false);
  assertEquals(cache.peek("a"), undefined);
});

// ─── onRemove ─────────────────────────────────────────

Deno.test("Cache onRemove fires with correct reason for delete()", () => {
  const ejected: CacheRemovalReason[] = [];
  const cache = new Cache<string, number>({
    maxSize: 10,
    onRemove: (_k, _v, r) => ejected.push(r),
  });
  cache.set("a", 1);
  cache.delete("a");
  assertEquals(ejected, ["deleted"]);
});

Deno.test("Cache onRemove fires with correct reason for clear()", () => {
  const ejected: CacheRemovalReason[] = [];
  const cache = new Cache<string, number>({
    maxSize: 10,
    onRemove: (_k, _v, r) => ejected.push(r),
  });
  cache.set("a", 1);
  cache.set("b", 2);
  cache.clear();
  assertEquals(ejected, ["cleared", "cleared"]);
});

Deno.test("Cache is not re-entrant during onRemove", () => {
  const cache = new Cache<string, number>({
    maxSize: 10,
    onRemove: () => {
      assertThrows(
        () => cache.set("x", 1),
        TypeError,
        "not re-entrant",
      );
      assertThrows(
        () => cache.delete("x"),
        TypeError,
        "not re-entrant",
      );
      assertThrows(
        () => cache.clear(),
        TypeError,
        "not re-entrant",
      );
    },
  });
  cache.set("a", 1);
  cache.delete("a");
});

Deno.test("Cache onRemove errors during timer-driven expiration are discarded", () => {
  using time = new FakeTime(0);
  const expired: string[] = [];
  using cache = new Cache<string, number>({
    ttl: 1000,
    onRemove: (k, _v, r) => {
      if (r === "expired") {
        expired.push(k);
        if (k === "a") throw new Error("onRemove error");
      }
    },
  });

  cache.set("a", 1, { ttl: 100 });
  cache.set("b", 2, { ttl: 100 });
  cache.set("c", 3, { ttl: 200 });

  // A throw from a timer callback would be uncatchable by the user, so the
  // sweep must swallow it: tick() throwing here fails the test.
  time.tick(101);
  assertEquals(expired, ["a", "b"]);
  assertEquals(cache.stats.expirations, 2);

  time.tick(100);
  assertEquals(expired, ["a", "b", "c"]);
});

Deno.test("Cache clear() onRemove errors surfaced via AggregateError", () => {
  const cache = new Cache<string, number>({
    maxSize: 10,
    onRemove: (k) => {
      throw new Error(`fail:${k}`);
    },
  });

  cache.set("a", 1);
  cache.set("b", 2);

  let caught: unknown;
  try {
    cache.clear();
  } catch (e) {
    caught = e;
  }
  assert(caught instanceof AggregateError);
  assertEquals(caught.errors.length, 2);
});

// ─── size ────────────────────────────────────────────

Deno.test("Cache size excludes expired entries that have not been swept yet", () => {
  using _time = new FakeTime(0);
  using cache = new Cache<string, number>({ maxSize: 10 });

  cache.set("a", 1, { ttl: 0 });
  cache.set("b", 2);

  // The 0ms sweep timer has not fired yet, but "a" is already expired:
  // size must agree with the iterators.
  assertEquals(cache.size, 1);
  assertEquals([...cache.keys()], ["b"]);
});

// ─── Timer hygiene ───────────────────────────────────

Deno.test("Cache delete() of the last pending deadline cancels the sweep timer", () => {
  // No FakeTime and no `using`: a timer left behind fails the leak sanitizer.
  const cache = new Cache<string, number>({ ttl: 60_000 });
  cache.set("a", 1);
  cache.delete("a");
});

Deno.test("Cache set() clearing the last deadline cancels the sweep timer", () => {
  const cache = new Cache<string, number>({ maxSize: 10 });
  cache.set("a", 1, { ttl: 60_000 });
  cache.set("a", 2);
});

// ─── Stats ───────────────────────────────────────────

Deno.test("Cache stats track hits, misses, sets, deletes, evictions", () => {
  const cache = new Cache<string, number>({ maxSize: 2 });

  cache.set("a", 1);
  cache.set("b", 2);
  cache.get("a");
  cache.get("missing");
  cache.set("c", 3);
  cache.delete("c");

  const s = cache.stats;
  assertEquals(s.hits, 1);
  assertEquals(s.misses, 1);
  assertEquals(s.sets, 3);
  assertEquals(s.deletes, 1);
  assertEquals(s.evictions, 1);
});

Deno.test("Cache stats track expirations", () => {
  using time = new FakeTime(0);
  using cache = new Cache<string, number>({ ttl: 100 });

  cache.set("a", 1);
  time.tick(101);
  cache.get("a");

  assertEquals(cache.stats.expirations, 1);
  assertEquals(cache.stats.misses, 1);
});

Deno.test("Cache resetStats() zeros all counters", () => {
  const cache = new Cache<string, number>({ maxSize: 10 });
  cache.set("a", 1);
  cache.get("a");
  cache.resetStats();
  const s = cache.stats;
  assertEquals(s.hits, 0);
  assertEquals(s.misses, 0);
  assertEquals(s.sets, 0);
});

Deno.test("Cache stats returns a snapshot that does not change", () => {
  const cache = new Cache<string, number>({ maxSize: 10 });
  cache.set("a", 1);
  cache.get("a");
  const s1 = cache.stats;
  cache.get("a");
  const s2 = cache.stats;
  assertEquals(s1.hits, 1);
  assertEquals(s2.hits, 2);
});

// ─── Iteration ───────────────────────────────────────

Deno.test("Cache keys/values/entries/forEach/Symbol.iterator", () => {
  const cache = new Cache<string, number>({ maxSize: 10 });
  cache.set("a", 1);
  cache.set("b", 2);

  assertEquals([...cache.keys()], ["a", "b"]);
  assertEquals([...cache.values()], [1, 2]);
  assertEquals([...cache.entries()], [["a", 1], ["b", 2]]);
  assertEquals([...cache], [["a", 1], ["b", 2]]);

  const keys: string[] = [];
  cache.forEach((_v, k) => keys.push(k));
  assertEquals(keys, ["a", "b"]);
});

Deno.test("Cache iteration skips expired entries across all iterators", () => {
  using time = new FakeTime(0);
  using cache = new Cache<string, number>({ ttl: 100 });

  cache.set("a", 1);
  cache.set("b", 2, { ttl: 50 });

  time.tick(51);
  assertEquals([...cache.keys()], ["a"]);
  assertEquals([...cache.values()], [1]);
  assertEquals([...cache.entries()], [["a", 1]]);
  assertEquals([...cache], [["a", 1]]);

  const result: [string, number][] = [];
  cache.forEach((v, k) => result.push([k, v]));
  assertEquals(result, [["a", 1]]);
});

// ─── Symbol.dispose ──────────────────────────────────

Deno.test("Cache Symbol.dispose clears entries and timers", () => {
  using time = new FakeTime(0);
  let disposed: Cache<string, number>;
  {
    using cache = new Cache<string, number>({ maxSize: 10, ttl: 1000 });
    cache.set("a", 1);
    disposed = cache;
  }
  assertEquals(disposed.size, 0);
  void time;
});

// ─── CacheOptions type safety (compile-time checks) ─

Deno.test("Cache type system rejects invalid option combinations", () => {
  const refresh = (_k: string, _v: number) => Promise.resolve(1);

  new Cache<string, number>();
  new Cache<string, number>({});
  new Cache<string, number>({ maxSize: 5 });
  new Cache<string, number>({ ttl: 100 });
  new Cache<string, number>({ maxSize: 5, ttl: 100 });
  new Cache<string, number>({ ttl: 100, slidingExpiration: true });
  new Cache<string, number>({ ttl: 1000, staleTtl: 500, refresh });
  new Cache<string, number>({
    ttl: 1000,
    staleTtl: 500,
    refresh,
    onRefreshError: () => {},
  });

  const _opts: CacheOptions<string, number> = { maxSize: 50, ttl: 1000 };
  void _opts;
  const _swr: CacheOptionsSwr<string, number> = {
    ttl: 1000,
    staleTtl: 500,
    refresh,
  };
  void _swr;
});

// ─── Edge cases ──────────────────────────────────────

Deno.test("Cache clear() on empty cache is a no-op", () => {
  const cache = new Cache<string, number>({ maxSize: 10 });
  cache.clear();
  assertEquals(cache.size, 0);
});

Deno.test("Cache clear() cancels timers and allows new entries", () => {
  using time = new FakeTime(0);
  using cache = new Cache<string, number>({ ttl: 100 });

  cache.set("a", 1);
  cache.clear();

  cache.set("b", 2);
  time.tick(101);
  assertEquals(cache.size, 0);
});

Deno.test("Cache set() with invalid per-entry TTL throws", () => {
  const cache = new Cache<string, number>({ maxSize: 10 });
  assertThrows(() => cache.set("a", 1, { ttl: -1 }), RangeError);
  assertThrows(() => cache.set("a", 1, { ttl: NaN }), RangeError);
  assertThrows(() => cache.set("a", 1, { ttl: Infinity }), RangeError);
});

Deno.test("Cache set() with invalid absoluteExpiration throws", () => {
  const cache = new Cache<string, number>({ maxSize: 10 });
  assertThrows(
    () => cache.set("a", 1, { absoluteExpiration: -1 }),
    RangeError,
  );
  assertThrows(
    () => cache.set("a", 1, { absoluteExpiration: NaN }),
    RangeError,
  );
  assertThrows(
    () => cache.set("a", 1, { absoluteExpiration: Infinity }),
    RangeError,
  );
});

// ─── has()/peek() re-entrancy guard during onRemove ───

Deno.test("Cache has() during onRemove with expired sibling preserves re-entrancy guard", () => {
  using time = new FakeTime(0);
  let setThrew = false;

  using cache = new Cache<string, number>({
    ttl: 1000,
    onRemove: (k) => {
      if (k === "a") {
        assertEquals(cache.has("b"), false);
        try {
          cache.set("x", 999);
        } catch {
          setThrew = true;
        }
      }
    },
  });

  cache.set("a", 1);
  cache.set("b", 2, { ttl: 50 });
  time.tick(51);

  cache.delete("a");
  assertEquals(setThrew, true);
  assertEquals(cache.has("x"), false);
});

Deno.test("Cache peek() during onRemove with expired sibling preserves re-entrancy guard", () => {
  using time = new FakeTime(0);
  let setThrew = false;

  using cache = new Cache<string, number>({
    ttl: 1000,
    onRemove: (k) => {
      if (k === "a") {
        assertEquals(cache.peek("b"), undefined);
        try {
          cache.set("x", 999);
        } catch {
          setThrew = true;
        }
      }
    },
  });

  cache.set("a", 1);
  cache.set("b", 2, { ttl: 50 });
  time.tick(51);

  cache.delete("a");
  assertEquals(setThrew, true);
  assertEquals(cache.has("x"), false);
});

// ─── getOrLoad ───────────────────────────────────────

Deno.test("Cache getOrLoad() loads and caches on miss", async () => {
  const cache = new Cache<string, number>({ maxSize: 100 });
  const value = await cache.getOrLoad("a", () => Promise.resolve(42));
  assertEquals(value, 42);
  assertEquals(cache.get("a"), 42);
});

Deno.test("Cache getOrLoad() returns cached value on hit", async () => {
  const cache = new Cache<string, number>({ maxSize: 100 });
  cache.set("a", 1);
  let called = false;
  const value = await cache.getOrLoad("a", () => {
    called = true;
    return Promise.resolve(99);
  });
  assertEquals(value, 1);
  assertEquals(called, false);
});

Deno.test("Cache getOrLoad() deduplicates concurrent loads", async () => {
  const cache = new Cache<string, number>({ maxSize: 100 });
  let loadCount = 0;
  const loader = () => {
    loadCount++;
    return Promise.resolve(42);
  };

  const [a, b, c] = await Promise.all([
    cache.getOrLoad("x", loader),
    cache.getOrLoad("x", loader),
    cache.getOrLoad("x", loader),
  ]);

  assertEquals(a, 42);
  assertEquals(b, 42);
  assertEquals(c, 42);
  assertEquals(loadCount, 1);
  assertEquals(cache.get("x"), 42);
});

Deno.test("Cache getOrLoad() propagates loader errors to all callers", async () => {
  const cache = new Cache<string, number>({ maxSize: 100 });
  const error = new Error("boom");

  const results = await Promise.allSettled([
    cache.getOrLoad("a", () => Promise.reject(error)),
    cache.getOrLoad("a", () => Promise.reject(error)),
  ]);

  assertEquals(results[0]!.status, "rejected");
  assertEquals(results[1]!.status, "rejected");
  assertEquals(cache.has("a"), false);
});

Deno.test("Cache getOrLoad() clears in-flight entry on error so retry works", async () => {
  const cache = new Cache<string, number>({ maxSize: 100 });
  let attempt = 0;

  await assertRejects(
    () =>
      cache.getOrLoad("a", () => {
        attempt++;
        return Promise.reject(new Error("fail"));
      }),
    Error,
  );
  assertEquals(attempt, 1);

  const value = await cache.getOrLoad("a", () => {
    attempt++;
    return Promise.resolve(99);
  });
  assertEquals(attempt, 2);
  assertEquals(value, 99);
});

Deno.test("Cache getOrLoad() loaded value respects TTL", async () => {
  using time = new FakeTime(0);
  using cache = new Cache<string, number>({ maxSize: 100, ttl: 100 });

  await cache.getOrLoad("a", () => Promise.resolve(42));
  assertEquals(cache.get("a"), 42);

  time.tick(101);
  assertEquals(cache.get("a"), undefined);
});

Deno.test("Cache getOrLoad() updates stats correctly", async () => {
  const cache = new Cache<string, number>({ maxSize: 100 });

  await cache.getOrLoad("a", () => Promise.resolve(1));
  assertEquals(cache.stats.misses, 1);
  assertEquals(cache.stats.sets, 1);

  await cache.getOrLoad("a", () => Promise.resolve(99));
  assertEquals(cache.stats.hits, 1);
  assertEquals(cache.stats.sets, 1);
});

Deno.test("Cache getOrLoad() returns cached undefined value without reloading", async () => {
  const cache = new Cache<string, undefined>({ maxSize: 100 });
  cache.set("a", undefined);

  let loadCount = 0;
  const value = await cache.getOrLoad("a", () => {
    loadCount++;
    return Promise.resolve(undefined);
  });
  assertEquals(value, undefined);
  assertEquals(loadCount, 0);
  assertEquals(cache.stats.hits, 1);
});

Deno.test("Cache getOrLoad() loader does not overwrite explicit set() on same key", async () => {
  const cache = new Cache<string, number>({ maxSize: 100 });

  let resolveLoader!: (v: number) => void;
  const loadPromise = cache.getOrLoad(
    "a",
    () => new Promise<number>((r) => resolveLoader = r),
  );

  cache.set("a", 42);

  resolveLoader(99);
  await loadPromise;
  assertEquals(cache.get("a"), 42);
});

Deno.test("Cache getOrLoad() loader result discarded after delete() on not-yet-cached key", async () => {
  const cache = new Cache<string, number>({ maxSize: 100 });

  let resolveLoader!: (v: number) => void;
  const loadPromise = cache.getOrLoad(
    "a",
    () => new Promise<number>((r) => resolveLoader = r),
  );

  cache.delete("a");

  resolveLoader(42);
  await loadPromise;
  assertEquals(cache.has("a"), false);
  assertEquals(cache.size, 0);
});

Deno.test("Cache getOrLoad() loader does not re-populate after clear()", async () => {
  const cache = new Cache<string, number>({ maxSize: 100 });

  let resolveLoader!: (v: number) => void;
  const loadPromise = cache.getOrLoad(
    "a",
    () => new Promise<number>((r) => resolveLoader = r),
  );

  cache.clear();
  assertEquals(cache.size, 0);

  resolveLoader(42);
  await loadPromise;
  assertEquals(cache.size, 0);
  assertEquals(cache.has("a"), false);
});

Deno.test("Cache getOrLoad() treats a non-promise loader result as a resolved value", async () => {
  const cache = new Cache<string, number>({ maxSize: 100 });
  // Untyped JS callers can return a plain value; it must not throw synchronously.
  const loader = (() => 42) as unknown as () => Promise<number>;
  const promise = cache.getOrLoad("a", loader);
  assert(promise instanceof Promise);
  assertEquals(await promise, 42);
  assertEquals(cache.get("a"), 42);
});

Deno.test("Cache getOrLoad() resolves even when onRemove throws during eviction", async () => {
  const cache = new Cache<string, number>({
    maxSize: 1,
    onRemove: () => {
      throw new Error("dispose failed");
    },
  });
  cache.set("x", 1);
  const results = await Promise.all([
    cache.getOrLoad("y", () => Promise.resolve(7)),
    cache.getOrLoad("y", () => Promise.resolve(7)),
  ]);
  assertEquals(results, [7, 7]);
  assertEquals(cache.peek("y"), 7);
  assertEquals(cache.has("x"), false);
});

// ─── Stale-while-revalidate (SWR) ───────────────────

Deno.test("Cache SWR constructor throws on invalid staleTtl", () => {
  const refresh = (_k: string, _v: number) => Promise.resolve(1);
  assertThrows(
    () => new Cache<string, number>({ ttl: 1000, staleTtl: -1, refresh }),
    RangeError,
    "staleTtl must be a finite non-negative number",
  );
  assertThrows(
    () => new Cache<string, number>({ ttl: 1000, staleTtl: NaN, refresh }),
    RangeError,
  );
  assertThrows(
    () => new Cache<string, number>({ ttl: 1000, staleTtl: Infinity, refresh }),
    RangeError,
  );
});

Deno.test("Cache SWR constructor throws when staleTtl >= ttl", () => {
  const refresh = (_k: string, _v: number) => Promise.resolve(1);
  assertThrows(
    () => new Cache<string, number>({ ttl: 1000, staleTtl: 1000, refresh }),
    RangeError,
    "staleTtl must be less than ttl",
  );
  assertThrows(
    () => new Cache<string, number>({ ttl: 1000, staleTtl: 2000, refresh }),
    RangeError,
    "staleTtl must be less than ttl",
  );
});

Deno.test("Cache SWR get() in fresh window counts as hit", async () => {
  using _time = new FakeTime(0);
  using cache = new Cache<string, number>({
    ttl: 1000,
    staleTtl: 500,
    refresh: () => Promise.resolve(99),
  });

  cache.set("a", 1);
  assertEquals(cache.get("a"), 1);
  assertEquals(cache.stats.hits, 1);
  assertEquals(cache.stats.staleHits, 0);
  await Promise.resolve();
});

Deno.test("Cache SWR get() in stale window returns stale value and triggers refresh", async () => {
  using time = new FakeTime(0);
  let refreshCalls = 0;
  using cache = new Cache<string, number>({
    ttl: 1000,
    staleTtl: 500,
    refresh: (_k, _stale) => {
      refreshCalls++;
      return Promise.resolve(99);
    },
  });

  cache.set("a", 1);
  time.tick(501);
  const value = cache.get("a");
  assertEquals(value, 1);
  assertEquals(cache.stats.staleHits, 1);
  assertEquals(cache.stats.hits, 0);
  assertEquals(refreshCalls, 1);

  await Promise.resolve();
  assertEquals(cache.get("a"), 99);
  assertEquals(cache.stats.refreshes, 1);
  assertEquals(cache.stats.refreshErrors, 0);
});

Deno.test("Cache SWR get() after hard TTL returns undefined", async () => {
  using time = new FakeTime(0);
  using cache = new Cache<string, number>({
    ttl: 1000,
    staleTtl: 500,
    refresh: () => Promise.resolve(99),
  });

  cache.set("a", 1);
  time.tick(1001);
  assertEquals(cache.get("a"), undefined);
  assertEquals(cache.stats.misses, 1);
  assertEquals(cache.stats.expirations, 1);
  await Promise.resolve();
});

Deno.test("Cache SWR concurrent stale reads trigger only one refresh", async () => {
  using time = new FakeTime(0);
  let refreshCalls = 0;
  using cache = new Cache<string, number>({
    ttl: 1000,
    staleTtl: 500,
    refresh: () => {
      refreshCalls++;
      return Promise.resolve(99);
    },
  });

  cache.set("a", 1);
  time.tick(501);

  assertEquals(cache.get("a"), 1);
  assertEquals(cache.get("a"), 1);
  assertEquals(cache.get("a"), 1);

  assertEquals(refreshCalls, 1);
  assertEquals(cache.stats.staleHits, 1);
  assertEquals(cache.stats.hits, 2);
  await Promise.resolve();
});

Deno.test("Cache SWR refresh failure retains stale value and calls onRefreshError", async () => {
  using time = new FakeTime(0);
  const errors: [string, unknown][] = [];
  using cache = new Cache<string, number>({
    ttl: 1000,
    staleTtl: 500,
    refresh: () => Promise.reject(new Error("network")),
    onRefreshError: (k, e) => errors.push([k, e]),
  });

  cache.set("a", 1);
  time.tick(501);
  assertEquals(cache.get("a"), 1);

  await Promise.resolve();

  assertEquals(errors.length, 1);
  assertEquals(errors[0]![0], "a");
  assert(errors[0]![1] instanceof Error);

  assertEquals(cache.get("a"), 1);
  assertEquals(cache.stats.refreshErrors, 1);
});

Deno.test("Cache SWR treats a non-promise refresh result as a resolved value", async () => {
  using time = new FakeTime(0);
  using cache = new Cache<string, number>({
    ttl: 1000,
    staleTtl: 500,
    refresh: (() => 2) as unknown as () => Promise<number>,
  });

  cache.set("a", 1);
  time.tick(501);
  assertEquals(cache.get("a"), 1);

  await Promise.resolve();
  assertEquals(cache.get("a"), 2);
});

Deno.test("Cache SWR refresh resets both deadlines", async () => {
  using time = new FakeTime(0);
  using cache = new Cache<string, number>({
    ttl: 1000,
    staleTtl: 500,
    refresh: () => Promise.resolve(42),
  });

  cache.set("a", 1);
  time.tick(501);
  cache.get("a");

  await Promise.resolve();
  assertEquals(cache.get("a"), 42);

  time.tick(499);
  assertEquals(cache.get("a"), 42);
  assertEquals(cache.stats.staleHits, 1);
  assertEquals(cache.stats.hits, 2);

  time.tick(2);
  assertEquals(cache.get("a"), 42);
  assertEquals(cache.stats.staleHits, 2);
});

Deno.test("Cache SWR per-entry staleTtl override", async () => {
  using time = new FakeTime(0);
  let refreshCalls = 0;
  using cache = new Cache<string, number>({
    ttl: 1000,
    staleTtl: 500,
    refresh: () => {
      refreshCalls++;
      return Promise.resolve(99);
    },
  });

  cache.set("a", 1, { staleTtl: 100 });
  time.tick(101);
  assertEquals(cache.get("a"), 1);
  assertEquals(cache.stats.staleHits, 1);
  assertEquals(refreshCalls, 1);
  await Promise.resolve();
});

Deno.test("Cache SWR per-entry staleTtl with invalid value throws", () => {
  const cache = new Cache<string, number>({
    ttl: 1000,
    staleTtl: 500,
    refresh: () => Promise.resolve(1),
  });
  assertThrows(
    () => cache.set("a", 1, { staleTtl: -1 }),
    RangeError,
    "staleTtl must be a finite non-negative number",
  );
  assertThrows(
    () => cache.set("a", 1, { staleTtl: NaN }),
    RangeError,
  );
  assertThrows(
    () => cache.set("a", 1, { staleTtl: Infinity }),
    RangeError,
    "staleTtl must be a finite non-negative number",
  );
  cache[Symbol.dispose]();
});

Deno.test("Cache SWR stats across success and failure refreshes", async () => {
  using time = new FakeTime(0);
  let callCount = 0;
  using cache = new Cache<string, number>({
    ttl: 1000,
    staleTtl: 500,
    refresh: () => {
      callCount++;
      if (callCount === 1) return Promise.resolve(2);
      return Promise.reject(new Error("fail"));
    },
    onRefreshError: () => {},
  });

  cache.set("a", 1);
  time.tick(501);

  cache.get("a");
  await Promise.resolve();

  assertEquals(cache.stats.staleHits, 1);
  assertEquals(cache.stats.refreshes, 1);
  assertEquals(cache.stats.refreshErrors, 0);

  time.tick(501);
  cache.get("a");
  await Promise.resolve();

  assertEquals(cache.stats.staleHits, 2);
  assertEquals(cache.stats.refreshes, 2);
  assertEquals(cache.stats.refreshErrors, 1);
});

Deno.test("Cache SWR refresh does not update deleted key", async () => {
  using time = new FakeTime(0);
  using cache = new Cache<string, number>({
    ttl: 1000,
    staleTtl: 500,
    refresh: () => Promise.resolve(99),
  });

  cache.set("a", 1);
  time.tick(501);
  cache.get("a");
  cache.delete("a");

  await Promise.resolve();
  assertEquals(cache.has("a"), false);
});

Deno.test("Cache SWR refresh does not overwrite explicit set() between stale-read and completion", async () => {
  using time = new FakeTime(0);
  using cache = new Cache<string, number>({
    ttl: 1000,
    staleTtl: 500,
    refresh: () => Promise.resolve(200),
  });

  cache.set("a", 1);
  time.tick(501);
  cache.get("a");
  cache.set("a", 999);

  await Promise.resolve();
  assertEquals(cache.peek("a"), 999);
});

Deno.test("Cache SWR clear() stops pending refreshes from re-inserting", async () => {
  using time = new FakeTime(0);
  using cache = new Cache<string, number>({
    ttl: 1000,
    staleTtl: 500,
    refresh: () => Promise.resolve(99),
  });

  cache.set("a", 1);
  time.tick(501);
  cache.get("a");
  cache.clear();

  await Promise.resolve();
  assertEquals(cache.size, 0);
});

Deno.test("Cache SWR with LRU eviction", async () => {
  using time = new FakeTime(0);
  using cache = new Cache<string, number>({
    maxSize: 2,
    ttl: 1000,
    staleTtl: 500,
    refresh: () => Promise.resolve(99),
  });

  cache.set("a", 1);
  cache.set("b", 2);
  time.tick(501);
  cache.get("a");
  cache.set("c", 3);

  assertEquals(cache.has("b"), false);
  assertEquals(cache.has("a"), true);
  assertEquals(cache.has("c"), true);
  await Promise.resolve();
});

Deno.test("Cache SWR timer-based expiration still fires", async () => {
  using time = new FakeTime(0);
  const ejected: string[] = [];
  using cache = new Cache<string, number>({
    ttl: 1000,
    staleTtl: 500,
    refresh: () => Promise.resolve(99),
    onRemove: (k, _v, r) => {
      if (r === "expired") ejected.push(k);
    },
  });

  cache.set("a", 1);
  time.tick(1001);
  assertEquals(ejected, ["a"]);
  assertEquals(cache.size, 0);
  await Promise.resolve();
});

Deno.test("Cache SWR with slidingExpiration extends hard deadline but not soft deadline", async () => {
  using time = new FakeTime(0);
  let refreshCalls = 0;
  using cache = new Cache<string, number>({
    ttl: 1000,
    staleTtl: 500,
    slidingExpiration: true,
    refresh: () => {
      refreshCalls++;
      return Promise.resolve(99);
    },
  });

  cache.set("a", 1);

  // At t=400 (before staleTtl=500), get() is a fresh hit and resets hard TTL
  time.tick(400);
  assertEquals(cache.get("a"), 1);
  assertEquals(cache.stats.hits, 1);
  assertEquals(refreshCalls, 0);

  // At t=600 (past original staleTtl=500), slidingExpiration does NOT
  // reset the soft deadline, so this is a stale hit
  time.tick(200);
  assertEquals(cache.get("a"), 1);
  assertEquals(cache.stats.staleHits, 1);
  assertEquals(refreshCalls, 1);

  await Promise.resolve();
  // Refresh completed — set() creates a fresh entry with new deadlines
  assertEquals(cache.get("a"), 99);
  assertEquals(cache.stats.hits, 2);

  await Promise.resolve();
});

Deno.test("Cache SWR refresh failure without onRefreshError only increments stats", async () => {
  using time = new FakeTime(0);
  using cache = new Cache<string, number>({
    ttl: 1000,
    staleTtl: 500,
    refresh: () => Promise.reject(new Error("silent")),
  });

  cache.set("a", 1);
  time.tick(501);
  cache.get("a");

  await Promise.resolve();

  assertEquals(cache.stats.refreshErrors, 1);
  assertEquals(cache.get("a"), 1);
});

// ─── delete() cancels in-flight getOrLoad ────────────

Deno.test("Cache delete() cancels in-flight getOrLoad loader", async () => {
  const cache = new Cache<string, number>({ maxSize: 100 });

  let resolveLoader!: (v: number) => void;
  const loadPromise = cache.getOrLoad(
    "a",
    () => new Promise<number>((r) => resolveLoader = r),
  );

  cache.delete("a");

  resolveLoader(42);
  await loadPromise;
  assertEquals(cache.has("a"), false);
  assertEquals(cache.size, 0);
});

Deno.test("Cache delete() on in-flight key allows fresh getOrLoad", async () => {
  const cache = new Cache<string, number>({ maxSize: 100 });

  let resolveFirst!: (v: number) => void;
  const first = cache.getOrLoad(
    "a",
    () => new Promise<number>((r) => resolveFirst = r),
  );

  cache.delete("a");

  const second = await cache.getOrLoad("a", () => Promise.resolve(99));
  assertEquals(second, 99);
  assertEquals(cache.get("a"), 99);

  resolveFirst(1);
  await first;
  assertEquals(cache.get("a"), 99);
});

// ─── SWR refresh preserves per-entry overrides ───────

Deno.test("Cache SWR refresh preserves per-entry ttl override", async () => {
  using time = new FakeTime(0);
  using cache = new Cache<string, number>({
    ttl: 10000,
    staleTtl: 100,
    refresh: () => Promise.resolve(99),
  });

  cache.set("a", 1, { ttl: 500 });

  time.tick(101);
  cache.get("a");
  await Promise.resolve();

  assertEquals(cache.get("a"), 99);

  time.tick(501);
  assertEquals(cache.get("a"), undefined);
});

Deno.test("Cache SWR refresh preserves per-entry staleTtl override", async () => {
  using time = new FakeTime(0);
  let refreshCount = 0;
  using cache = new Cache<string, number>({
    ttl: 10000,
    staleTtl: 5000,
    refresh: () => {
      refreshCount++;
      return Promise.resolve(refreshCount * 100);
    },
  });

  cache.set("a", 1, { staleTtl: 100 });

  time.tick(101);
  cache.get("a");
  await Promise.resolve();
  assertEquals(refreshCount, 1);
  assertEquals(cache.get("a"), 100);

  time.tick(101);
  cache.get("a");
  await Promise.resolve();
  assertEquals(refreshCount, 2);
});

// ─── Synchronous refresh() throw ─────────────────────

Deno.test("Cache SWR synchronous refresh() throw does not escape get()", async () => {
  using _time = new FakeTime(0);
  const errors: unknown[] = [];
  using cache = new Cache<string, number>({
    ttl: 1000,
    staleTtl: 0,
    refresh: () => {
      throw new Error("sync boom");
    },
    onRefreshError: (_k, e) => errors.push(e),
  });

  cache.set("a", 1);
  const value = cache.get("a");
  assertEquals(value, 1);
  assertEquals(errors.length, 1);
  assert(errors[0] instanceof Error);
  assertEquals(cache.stats.refreshErrors, 1);
  await Promise.resolve();
});

Deno.test("Cache SWR synchronous refresh() throw does not wedge #refreshing", async () => {
  using time = new FakeTime(0);
  let callCount = 0;
  using cache = new Cache<string, number>({
    ttl: 1000,
    staleTtl: 0,
    refresh: () => {
      callCount++;
      if (callCount === 1) throw new Error("sync");
      return Promise.resolve(99);
    },
    onRefreshError: () => {},
  });

  cache.set("a", 1);
  cache.get("a");
  assertEquals(callCount, 1);

  time.tick(1);
  cache.get("a");
  assertEquals(callCount, 2);

  await Promise.resolve();
  assertEquals(cache.get("a"), 99);
});

// ─── onRefreshError throw contained ──────────────────

Deno.test("Cache SWR throwing onRefreshError does not cause unhandled rejection", async () => {
  using _time = new FakeTime(0);
  using cache = new Cache<string, number>({
    ttl: 1000,
    staleTtl: 0,
    refresh: () => Promise.reject(new Error("refresh fail")),
    onRefreshError: () => {
      throw new Error("callback throws");
    },
  });

  cache.set("a", 1);
  cache.get("a");

  await Promise.resolve();
  await Promise.resolve();

  assertEquals(cache.stats.refreshErrors, 1);
  assertEquals(cache.get("a"), 1);
});

Deno.test("Cache SWR throwing onRefreshError on sync refresh throw is contained", async () => {
  using _time = new FakeTime(0);
  using cache = new Cache<string, number>({
    ttl: 1000,
    staleTtl: 0,
    refresh: () => {
      throw new Error("sync fail");
    },
    onRefreshError: () => {
      throw new Error("callback also throws");
    },
  });

  cache.set("a", 1);
  const value = cache.get("a");
  assertEquals(value, 1);
  assertEquals(cache.stats.refreshErrors, 1);
  await Promise.resolve();
});

// ─── getOrLoad with options ──────────────────────────

Deno.test("Cache getOrLoad() forwards ttl option to set()", async () => {
  using time = new FakeTime(0);
  using cache = new Cache<string, number>({ maxSize: 100, ttl: 10000 });

  await cache.getOrLoad("a", () => Promise.resolve(42), { ttl: 50 });
  assertEquals(cache.get("a"), 42);

  time.tick(51);
  assertEquals(cache.get("a"), undefined);
});

Deno.test("Cache getOrLoad() forwards absoluteExpiration option", async () => {
  using time = new FakeTime(0);
  using cache = new Cache<string, number>({
    maxSize: 100,
    ttl: 10000,
    slidingExpiration: true,
  });

  await cache.getOrLoad("a", () => Promise.resolve(42), {
    absoluteExpiration: 150,
  });

  time.tick(80);
  assertEquals(cache.get("a"), 42);
  time.tick(80);
  assertEquals(cache.get("a"), undefined);
});

Deno.test("Cache getOrLoad() forwards staleTtl option", async () => {
  using time = new FakeTime(0);
  let refreshCount = 0;
  using cache = new Cache<string, number>({
    ttl: 10000,
    staleTtl: 5000,
    refresh: () => {
      refreshCount++;
      return Promise.resolve(99);
    },
  });

  await cache.getOrLoad("a", () => Promise.resolve(1), { staleTtl: 50 });

  time.tick(51);
  cache.get("a");
  assertEquals(cache.stats.staleHits, 1);
  assertEquals(refreshCount, 1);
  await Promise.resolve();
});

Deno.test("Cache getOrLoad() options ignored on cache hit", async () => {
  using _time = new FakeTime(0);
  using cache = new Cache<string, number>({ maxSize: 100, ttl: 10000 });

  cache.set("a", 1);
  let called = false;
  const value = await cache.getOrLoad("a", () => {
    called = true;
    return Promise.resolve(99);
  }, { ttl: 1 });

  assertEquals(value, 1);
  assertEquals(called, false);
});

Deno.test("Cache getOrLoad() de-duplicated callers use first caller's options", async () => {
  using time = new FakeTime(0);
  using cache = new Cache<string, number>({ maxSize: 100, ttl: 10000 });

  const [a, b] = await Promise.all([
    cache.getOrLoad("x", () => Promise.resolve(42), { ttl: 50 }),
    cache.getOrLoad("x", () => Promise.resolve(99), { ttl: 9999 }),
  ]);

  assertEquals(a, 42);
  assertEquals(b, 42);

  time.tick(51);
  assertEquals(cache.get("x"), undefined);
});

// ─── Re-entrancy guard depth counter ─────────────────

Deno.test("Cache get() on expired key inside onRemove does not disable re-entrancy guard", () => {
  using _time = new FakeTime(0);
  let setThrew = false;

  using cache = new Cache<string, number>({
    ttl: 1000,
    onRemove: (k) => {
      if (k === "a") {
        cache.get("b");
        try {
          cache.set("x", 999);
        } catch {
          setThrew = true;
        }
      }
    },
  });

  cache.set("a", 1);
  cache.set("b", 2, { ttl: 0 });

  cache.delete("a");
  assertEquals(setThrew, true);
  assertEquals(cache.has("x"), false);
});

Deno.test("Cache nested get() on expired key inside onRemove fires nested onRemove", () => {
  using _time = new FakeTime(0);
  const ejected: [string, CacheRemovalReason][] = [];

  using cache = new Cache<string, number>({
    ttl: 1000,
    onRemove: (k, _v, r) => {
      ejected.push([k, r]);
      if (k === "a") {
        cache.get("b");
      }
    },
  });

  cache.set("a", 1);
  cache.set("b", 2, { ttl: 0 });

  cache.delete("a");
  assertEquals(ejected.length, 2);
  assertEquals(ejected[0], ["a", "deleted"]);
  assertEquals(ejected[1], ["b", "expired"]);
  assertEquals(cache.size, 0);
});

Deno.test("Cache re-entrancy guard survives deeply nested get()-triggered ejections", () => {
  using _time = new FakeTime(0);
  let deepSetThrew = false;

  using cache = new Cache<string, number>({
    ttl: 1000,
    onRemove: (k) => {
      if (k === "a") {
        cache.get("b");
      }
      if (k === "b") {
        cache.get("c");
      }
      if (k === "c") {
        try {
          cache.set("x", 999);
        } catch {
          deepSetThrew = true;
        }
      }
    },
  });

  cache.set("a", 1);
  cache.set("b", 2, { ttl: 0 });
  cache.set("c", 3, { ttl: 0 });

  cache.delete("a");
  assertEquals(deepSetThrew, true);
  assertEquals(cache.has("x"), false);
});

// ─── SWR refresh preserves absoluteExpiration ────────

Deno.test("Cache SWR refresh preserves absoluteExpiration cap", async () => {
  using time = new FakeTime(0);
  using cache = new Cache<string, number>({
    ttl: 10000,
    staleTtl: 100,
    refresh: () => Promise.resolve(99),
  });

  cache.set("a", 1, { absoluteExpiration: 500 });

  time.tick(101);
  cache.get("a");
  await Promise.resolve();

  assertEquals(cache.get("a"), 99);

  time.tick(400);
  assertEquals(cache.get("a"), undefined);
});

Deno.test("Cache SWR refresh with absoluteExpiration expires at original wall-clock time", async () => {
  using time = new FakeTime(0);
  let refreshCount = 0;
  using cache = new Cache<string, number>({
    ttl: 10000,
    staleTtl: 100,
    refresh: () => {
      refreshCount++;
      return Promise.resolve(refreshCount * 100);
    },
  });

  cache.set("a", 1, { absoluteExpiration: 350 });

  time.tick(101);
  cache.get("a");
  await Promise.resolve();
  assertEquals(refreshCount, 1);
  assertEquals(cache.get("a"), 100);

  time.tick(100);
  cache.get("a");
  await Promise.resolve();
  assertEquals(refreshCount, 2);
  assertEquals(cache.get("a"), 200);

  time.tick(150);
  assertEquals(cache.get("a"), undefined);
});

// ─── getOrLoad sync loader throw ─────────────────────

Deno.test("Cache getOrLoad() returns rejected promise when loader throws synchronously", async () => {
  const cache = new Cache<string, number>({ maxSize: 100 });
  const error = new Error("sync boom");

  const result = await cache.getOrLoad("a", () => {
    throw error;
  }).then(
    () => "resolved",
    (e) => e,
  );

  assertEquals(result, error);
  assertEquals(cache.has("a"), false);
});

Deno.test("Cache getOrLoad() sync throw does not leave stale in-flight entry", async () => {
  const cache = new Cache<string, number>({ maxSize: 100 });

  await assertRejects(
    () =>
      cache.getOrLoad("a", () => {
        throw new Error("fail");
      }),
    Error,
  );

  const value = await cache.getOrLoad("a", () => Promise.resolve(42));
  assertEquals(value, 42);
  assertEquals(cache.get("a"), 42);
});

// ─── set() staleTtl >= ttl validation ────────────────

Deno.test("Cache set() throws when per-entry staleTtl >= entry ttl", () => {
  const cache = new Cache<string, number>({
    ttl: 1000,
    staleTtl: 500,
    refresh: () => Promise.resolve(1),
  });
  assertThrows(
    () => cache.set("a", 1, { staleTtl: 1000 }),
    RangeError,
    "staleTtl must be less than ttl",
  );
  assertThrows(
    () => cache.set("a", 1, { staleTtl: 2000 }),
    RangeError,
    "staleTtl must be less than ttl",
  );
  cache[Symbol.dispose]();
});

Deno.test("Cache set() throws when per-entry staleTtl >= per-entry ttl", () => {
  const cache = new Cache<string, number>({
    ttl: 10000,
    staleTtl: 5000,
    refresh: () => Promise.resolve(1),
  });
  assertThrows(
    () => cache.set("a", 1, { ttl: 500, staleTtl: 500 }),
    RangeError,
    "staleTtl must be less than ttl",
  );
  assertThrows(
    () => cache.set("a", 1, { ttl: 500, staleTtl: 600 }),
    RangeError,
    "staleTtl must be less than ttl",
  );
  cache[Symbol.dispose]();
});

Deno.test("Cache set() throws TypeError for per-entry staleTtl without refresh", () => {
  using cache = new Cache<string, number>({ ttl: 1000 });
  assertThrows(
    () => cache.set("a", 1, { staleTtl: 500 }),
    TypeError,
    "staleTtl requires the cache to be constructed with refresh",
  );
  assertThrows(
    () => cache.set("a", 1, { staleTtl: 2000 }),
    TypeError,
    "staleTtl requires the cache to be constructed with refresh",
  );
  assertEquals(cache.has("a"), false);
});

// ─── set() clears stale in-flight entries ────────────

Deno.test("Cache set() clears in-flight getOrLoad so next getOrLoad uses fresh loader", async () => {
  using time = new FakeTime(0);
  using cache = new Cache<string, number>({ maxSize: 100, ttl: 100 });

  let resolveLoader1!: (v: number) => void;
  const p1 = cache.getOrLoad(
    "a",
    () => new Promise<number>((r) => resolveLoader1 = r),
  );

  cache.set("a", 42);

  time.tick(101);
  assertEquals(cache.get("a"), undefined);

  let loader2Called = false;
  const p2 = cache.getOrLoad("a", () => {
    loader2Called = true;
    return Promise.resolve(99);
  });

  assertEquals(loader2Called, true);
  assertEquals(await p2, 99);
  assertEquals(cache.get("a"), 99);

  resolveLoader1(1);
  await p1;
  assertEquals(cache.get("a"), 99);
});

// ─── SWR refresh set() throw contained ───────────────

Deno.test("Cache SWR refresh does not throw when set() overwrites", async () => {
  using time = new FakeTime(0);
  using cache = new Cache<string, number>({
    maxSize: 2,
    ttl: 1000,
    staleTtl: 100,
    refresh: () => Promise.resolve(99),
    onRemove: (_k, _v, r) => {
      if (r === "evicted") throw new Error("onRemove boom");
    },
  });

  cache.set("a", 1);
  cache.set("filler", 2);

  time.tick(101);
  cache.get("a");

  await Promise.resolve();

  assertEquals(cache.stats.refreshes, 1);
  assertEquals(cache.get("a"), 99);
});

// ─── peek()/has() lazy expiry (no timer reaping) ─────

Deno.test("Cache has()/peek() lazily remove expired entries before the timer fires", () => {
  using _time = new FakeTime(0);
  using cache = new Cache<string, number>({ ttl: 1000 });

  cache.set("a", 1, { ttl: 0 });
  cache.set("b", 2, { ttl: 0 });

  assertEquals(cache.has("a"), false);
  assertEquals(cache.peek("b"), undefined);
  assertEquals(cache.size, 0);
  assertEquals(cache.stats.expirations, 2);
});

// ─── clear() single onRemove error thrown directly ────

Deno.test("Cache clear() single onRemove error is thrown directly, not wrapped", () => {
  const err = new Error("solo");
  const cache = new Cache<string, number>({
    maxSize: 10,
    onRemove: () => {
      throw err;
    },
  });

  cache.set("a", 1);

  let caught: unknown;
  try {
    cache.clear();
  } catch (e) {
    caught = e;
  }
  assert(caught === err);
});

Deno.test("Cache iterators are safe against mutation during iteration", () => {
  // Regression: deleting a not-yet-visited entry during iteration must not
  // truncate the iterator or yield the deleted entry. Likewise for set().
  const cache = new Cache<string, number>();
  cache.set("a", 1);
  cache.set("b", 2);
  cache.set("c", 3);
  cache.set("d", 4);

  const visited: string[] = [];
  for (const key of cache.keys()) {
    visited.push(key);
    if (key === "a") {
      cache.delete("b");
      cache.set("c", 30);
    }
  }
  assertEquals(visited, ["a", "b", "c", "d"]);
  assertEquals(cache.get("b"), undefined);
  assertEquals(cache.get("c"), 30);

  // forEach snapshot should also survive deletion of future entries.
  const cache2 = new Cache<string, number>();
  cache2.set("a", 1);
  cache2.set("b", 2);
  cache2.set("c", 3);

  const seen: [string, number][] = [];
  cache2.forEach((v, k) => {
    seen.push([k, v]);
    if (k === "a") cache2.delete("c");
  });
  assertEquals(seen, [["a", 1], ["b", 2], ["c", 3]]);
});

// ─── absoluteExpiration without default TTL ───────────

Deno.test("Cache absoluteExpiration expires entry on non-TTL bounded cache", () => {
  using time = new FakeTime(0);
  using cache = new Cache<string, number>({ maxSize: 100 });

  cache.set("a", 1, { absoluteExpiration: 50 });
  assertEquals(cache.get("a"), 1);

  time.tick(51);
  assertEquals(cache.get("a"), undefined);
});

Deno.test("Cache absoluteExpiration expires entry on unbounded non-TTL cache", () => {
  using time = new FakeTime(0);
  using cache = new Cache<string, number>();

  cache.set("a", 1, { absoluteExpiration: 100 });
  assertEquals(cache.get("a"), 1);

  time.tick(101);
  assertEquals(cache.get("a"), undefined);
});

Deno.test("Cache absoluteExpiration timer fires onRemove on non-TTL cache", () => {
  using time = new FakeTime(0);
  const ejected: [string, CacheRemovalReason][] = [];
  using cache = new Cache<string, number>({
    maxSize: 100,
    onRemove: (k, _v, r) => ejected.push([k, r]),
  });

  cache.set("a", 1, { absoluteExpiration: 100 });
  time.tick(101);

  assertEquals(ejected, [["a", "expired"]]);
  assertEquals(cache.size, 0);
});

Deno.test("Cache absoluteExpiration on non-TTL cache does not affect entries without it", () => {
  using time = new FakeTime(0);
  using cache = new Cache<string, number>({ maxSize: 100 });

  cache.set("a", 1, { absoluteExpiration: 50 });
  cache.set("b", 2);

  time.tick(51);
  assertEquals(cache.get("a"), undefined);
  assertEquals(cache.get("b"), 2);
});

// ─── Coverage: #onTimer skips entries deleted before timer fires ──

Deno.test("Cache #onTimer skips entry that was manually deleted before timer fires", () => {
  using time = new FakeTime(0);
  const removed: [string, CacheRemovalReason][] = [];
  using cache = new Cache<string, number>({
    maxSize: 100,
    ttl: 100,
    onRemove: (k, _v, r) => removed.push([k, r]),
  });

  cache.set("a", 1);
  cache.set("b", 2);
  cache.delete("a");
  assertEquals(removed, [["a", "deleted"]]);

  time.tick(101);
  assertEquals(removed, [["a", "deleted"], ["b", "expired"]]);
  assertEquals(cache.size, 0);
});

// ─── Coverage: getOrLoad() SWR stale hit ─────────────────────────

Deno.test("Cache getOrLoad() in stale window returns stale value and triggers background refresh", async () => {
  using time = new FakeTime(0);
  let refreshCalls = 0;
  using cache = new Cache<string, number>({
    ttl: 1000,
    staleTtl: 200,
    refresh: () => {
      refreshCalls++;
      return Promise.resolve(42);
    },
  });

  await cache.getOrLoad("a", () => Promise.resolve(1));
  assertEquals(cache.get("a"), 1);

  time.tick(201);
  const val = await cache.getOrLoad("a", () => Promise.resolve(999));
  assertEquals(val, 1);
  assertEquals(cache.stats.staleHits, 1);
  assertEquals(refreshCalls, 1);

  await time.tickAsync(0);
  assertEquals(cache.get("a"), 42);
});

// ─── Coverage: getOrLoad() sliding expiration on hit ─────────────

Deno.test("Cache getOrLoad() with slidingExpiration extends TTL on hit", async () => {
  using time = new FakeTime(0);
  using cache = new Cache<string, number>({
    ttl: 100,
    slidingExpiration: true,
  });

  await cache.getOrLoad("a", () => Promise.resolve(1));

  time.tick(80);
  const val = await cache.getOrLoad("a", () => Promise.resolve(999));
  assertEquals(val, 1);

  time.tick(99);
  const val2 = await cache.getOrLoad("a", () => Promise.resolve(888));
  assertEquals(val2, 1);

  time.tick(101);
  assertEquals(cache.get("a"), undefined);
});

// ─── Coverage: getOrLoad() expired entry removal ─────────────────

Deno.test("Cache getOrLoad() eagerly removes expired entry and reloads", async () => {
  using _time = new FakeTime(0);
  const removed: [string, CacheRemovalReason][] = [];
  using cache = new Cache<string, number>({
    maxSize: 100,
    onRemove: (k, _v, r) => removed.push([k, r]),
  });

  cache.set("a", 1, { ttl: 0 });
  assertEquals(cache.size, 0);

  const val = await cache.getOrLoad("a", () => Promise.resolve(42));
  assertEquals(val, 42);
  assertEquals(cache.stats.expirations, 1);
  assertEquals(removed, [["a", "expired"]]);
});
