// Copyright 2018-2026 the Deno authors. MIT license.

import { assert, assertEquals, assertFalse, assertThrows } from "@std/assert";
import { FakeTime } from "@std/testing/time";
import { createRateLimiter } from "./rate_limiter.ts";
import { createMemoryStore } from "./memory_store.ts";
import type { AlgorithmOptions } from "./store_types.ts";

// --- Factory validation ---

Deno.test("createRateLimiter() throws for invalid limit", () => {
  const cases: [limit: number, message: string][] = [
    [
      0,
      "Cannot create memory store: 'limit' must be a positive integer, received 0",
    ],
    [
      -1,
      "Cannot create memory store: 'limit' must be a positive integer, received -1",
    ],
    [
      1.5,
      "Cannot create memory store: 'limit' must be a positive integer, received 1.5",
    ],
  ];
  for (const [limit, message] of cases) {
    assertThrows(
      () => createRateLimiter({ limit, window: 1000 }),
      RangeError,
      message,
    );
  }
});

Deno.test("createRateLimiter() throws for invalid window", () => {
  const cases: [window: number, message: string][] = [
    [
      0,
      "Cannot create memory store: 'window' must be a positive finite number, received 0",
    ],
    [
      -100,
      "Cannot create memory store: 'window' must be a positive finite number, received -100",
    ],
  ];
  for (const [window, message] of cases) {
    assertThrows(
      () => createRateLimiter({ limit: 10, window }),
      RangeError,
      message,
    );
  }
});

Deno.test("createRateLimiter() throws for invalid segmentsPerWindow", () => {
  const cases: [segmentsPerWindow: number, message: string][] = [
    [
      0,
      "Cannot create sliding window: 'segmentsPerWindow' must be an integer >= 2, received 0",
    ],
    [
      1,
      "Cannot create sliding window: 'segmentsPerWindow' must be an integer >= 2, received 1",
    ],
    [
      2.5,
      "Cannot create sliding window: 'segmentsPerWindow' must be an integer >= 2, received 2.5",
    ],
  ];
  for (const [segmentsPerWindow, message] of cases) {
    assertThrows(
      () =>
        createRateLimiter({
          limit: 10,
          window: 1000,
          algorithm: "sliding-window",
          segmentsPerWindow,
        }),
      RangeError,
      message,
    );
  }
});

// Regression: the default segmentsPerWindow (10) rejected windows it did not
// divide evenly, naming an option the caller never set.
Deno.test("createRateLimiter() accepts a window not divisible by segmentsPerWindow", async () => {
  let now = 0;
  await using limiter = createRateLimiter({
    limit: 10,
    window: 1234,
    evictionTtl: 0,
    clock: () => now,
  });
  assert((await limiter.limit("a", { cost: 10 })).ok);
  const denied = await limiter.limit("a");
  assertFalse(denied.ok);
  assertEquals(denied.retryAfter, 1234);
  now = 1234;
  assert((await limiter.limit("a")).ok);
});

Deno.test("createRateLimiter() throws for invalid tokensPerPeriod", () => {
  const cases: [tokensPerPeriod: number, message: string][] = [
    [
      0,
      "Cannot create memory store: 'tokensPerPeriod' must be a positive integer, received 0",
    ],
    [
      11,
      "Cannot create memory store: 'tokensPerPeriod' (11) exceeds 'limit' (10)",
    ],
  ];
  for (const [tokensPerPeriod, message] of cases) {
    assertThrows(
      () =>
        createRateLimiter({
          limit: 10,
          window: 1000,
          algorithm: "token-bucket",
          tokensPerPeriod,
        }),
      RangeError,
      message,
    );
  }
});

Deno.test("createRateLimiter() throws for invalid eviction options", () => {
  const cases: [
    options: Parameters<typeof createRateLimiter>[0],
    message: string,
  ][] = [
    [
      { limit: 10, window: 1000, evictionTtl: 5000, evictionInterval: 0 },
      "Cannot create memory store: 'evictionInterval' must be a positive integer, received 0",
    ],
    [
      { limit: 10, window: 1000, evictionTtl: 5000, evictionInterval: -100 },
      "Cannot create memory store: 'evictionInterval' must be a positive integer, received -100",
    ],
    [
      { limit: 10, window: 1000, evictionTtl: Infinity },
      "Cannot create memory store: 'evictionTtl' must be a non-negative integer, received Infinity",
    ],
    [
      { limit: 10, window: 1000, evictionTtl: -1 },
      "Cannot create memory store: 'evictionTtl' must be a non-negative integer, received -1",
    ],
    [
      { limit: 10, window: 1000, evictionTtl: NaN },
      "Cannot create memory store: 'evictionTtl' must be a non-negative integer, received NaN",
    ],
  ];
  for (const [options, message] of cases) {
    assertThrows(() => createRateLimiter(options), RangeError, message);
  }
});

Deno.test("createRateLimiter() accepts all algorithms", async () => {
  using _time = new FakeTime();
  for (
    const algorithm of [
      "fixed-window",
      "sliding-window",
      "token-bucket",
      "gcra",
    ] as const
  ) {
    await using limiter = createRateLimiter({
      limit: 10,
      window: 1000,
      algorithm,
    });
    const result = await limiter.limit("key");
    assert(result.ok);
  }
});

Deno.test("createRateLimiter() accepts evictionInterval: 0 when evictionTtl is 0", async () => {
  await using limiter = createRateLimiter({
    limit: 5,
    window: 1000,
    evictionTtl: 0,
    evictionInterval: 0,
    clock: () => 0,
  });
  assert((await limiter.limit("a")).ok);
});

// --- Cost validation ---

Deno.test("limit() throws for invalid cost", async () => {
  using _time = new FakeTime();
  await using limiter = createRateLimiter({ limit: 10, window: 1000 });

  const cases: [cost: number, message: string][] = [
    [0, "Cannot limit: 'cost' must be a positive integer, received 0"],
    [-1, "Cannot limit: 'cost' must be a positive integer, received -1"],
    [1.5, "Cannot limit: 'cost' must be a positive integer, received 1.5"],
    [11, "Cannot limit: 'cost' (11) exceeds the limit (10)"],
  ];
  for (const [cost, message] of cases) {
    assertThrows(() => limiter.limit("a", { cost }), RangeError, message);
  }
});

Deno.test("peek() throws for invalid cost", async () => {
  using _time = new FakeTime();
  await using limiter = createRateLimiter({ limit: 10, window: 1000 });

  const cases: [cost: number, message: string][] = [
    [0, "Cannot peek: 'cost' must be a positive integer, received 0"],
    [-1, "Cannot peek: 'cost' must be a positive integer, received -1"],
    [1.5, "Cannot peek: 'cost' must be a positive integer, received 1.5"],
    [11, "Cannot peek: 'cost' (11) exceeds the limit (10)"],
  ];
  for (const [cost, message] of cases) {
    assertThrows(() => limiter.peek("a", { cost }), RangeError, message);
  }
});

// --- Fixed window ---

Deno.test("limit() allows the first request with fixed-window", async () => {
  const now = 1000;
  await using limiter = createRateLimiter({
    limit: 5,
    window: 1000,
    algorithm: "fixed-window",
    evictionTtl: 0,
    clock: () => now,
  });

  const r = await limiter.limit("a");
  assert(r.ok);
  assertEquals(r.remaining, 4);
  assertEquals(r.limit, 5);
  assertEquals(r.retryAfter, 0);
});

Deno.test("limit() denies requests once the limit is exhausted with fixed-window", async () => {
  const now = 1000;
  await using limiter = createRateLimiter({
    limit: 3,
    window: 1000,
    algorithm: "fixed-window",
    evictionTtl: 0,
    clock: () => now,
  });

  assert((await limiter.limit("a")).ok);
  assert((await limiter.limit("a")).ok);
  assert((await limiter.limit("a")).ok);

  const r = await limiter.limit("a");
  assertFalse(r.ok);
  assertEquals(r.remaining, 0);
  assertEquals(r.retryAfter, 1000); // windowStart + window - now
  assertEquals(r.resetAt, 2000);
});

Deno.test("limit() restores permits after the window elapses with fixed-window", async () => {
  let now = 1000;
  await using limiter = createRateLimiter({
    limit: 2,
    window: 1000,
    algorithm: "fixed-window",
    evictionTtl: 0,
    clock: () => now,
  });

  await limiter.limit("a");
  await limiter.limit("a");
  assertFalse((await limiter.limit("a")).ok);

  now = 2000;
  const r = await limiter.limit("a");
  assert(r.ok);
  assertEquals(r.remaining, 1);
});

Deno.test("limit() consumes multiple permits per cost with fixed-window", async () => {
  const now = 1000;
  await using limiter = createRateLimiter({
    limit: 10,
    window: 1000,
    algorithm: "fixed-window",
    evictionTtl: 0,
    clock: () => now,
  });

  const r = await limiter.limit("a", { cost: 7 });
  assert(r.ok);
  assertEquals(r.remaining, 3);

  assertFalse((await limiter.limit("a", { cost: 4 })).ok);
  assert((await limiter.limit("a", { cost: 3 })).ok);
});

Deno.test("limit() realigns the window after an idle gap with fixed-window", async () => {
  let now = 0;
  await using limiter = createRateLimiter({
    limit: 2,
    window: 1000,
    algorithm: "fixed-window",
    evictionTtl: 0,
    clock: () => now,
  });

  assertEquals((await limiter.limit("a")).resetAt, 1000);

  // 2.5 windows idle: windowStart realigns to 2000, not a stale boundary.
  now = 2500;
  const r = await limiter.limit("a");
  assert(r.ok);
  assertEquals(r.remaining, 1);
  assertEquals(r.resetAt, 3000);
});

// --- Sliding window ---

Deno.test("limit() frees permits incrementally as segments rotate with sliding-window", async () => {
  let now = 0;
  await using limiter = createRateLimiter({
    limit: 4,
    window: 400,
    algorithm: "sliding-window",
    segmentsPerWindow: 4,
    evictionTtl: 0,
    clock: () => now,
  });

  const first = await limiter.limit("a", { cost: 4 });
  assert(first.ok);
  assertEquals(first.remaining, 0);
  assertFalse((await limiter.limit("a")).ok);

  now = 100;
  assertFalse((await limiter.limit("a")).ok);
  now = 200;
  assertFalse((await limiter.limit("a")).ok);
  now = 300;
  assertFalse((await limiter.limit("a")).ok);

  now = 400;
  assert((await limiter.limit("a", { cost: 4 })).ok);
});

Deno.test("limit() prevents boundary bursts with sliding-window", async () => {
  let now = 0;
  await using limiter = createRateLimiter({
    limit: 10,
    window: 1000,
    algorithm: "sliding-window",
    segmentsPerWindow: 2,
    evictionTtl: 0,
    clock: () => now,
  });

  await limiter.limit("a", { cost: 10 });

  now = 500;
  assertFalse((await limiter.limit("a")).ok);

  now = 1000;
  assert((await limiter.limit("a", { cost: 10 })).ok);
});

Deno.test("limit() reports retryAfter as the full window when the only permit is in the newest segment with sliding-window", async () => {
  const now = 0;
  await using limiter = createRateLimiter({
    limit: 1,
    window: 1000,
    algorithm: "sliding-window",
    segmentsPerWindow: 4,
    evictionTtl: 0,
    clock: () => now,
  });

  await limiter.limit("a");
  const r = await limiter.limit("a");
  assertFalse(r.ok);
  assertEquals(r.retryAfter, 1000);
});

// Regression: retryAfter used to report the next rotation even when that
// rotation freed nothing, so a client obeying Retry-After retried for nothing.
Deno.test("limit() reports retryAfter as the time until enough permits free with sliding-window", async () => {
  let now = 0;
  await using limiter = createRateLimiter({
    limit: 10,
    window: 1000,
    algorithm: "sliding-window",
    segmentsPerWindow: 10,
    evictionTtl: 0,
    clock: () => now,
  });

  // Segment 0: 4 permits. Segment 1: 6 permits.
  await limiter.limit("a", { cost: 4 });
  now = 100;
  await limiter.limit("a", { cost: 6 });
  now = 150;

  // Needs 3 permits: segment 0 (4) rotates out at t=1000.
  const r1 = await limiter.limit("a", { cost: 3 });
  assertFalse(r1.ok);
  assertEquals(r1.retryAfter, 850);

  // Needs 5 permits: segment 0 alone is not enough; segment 1 rotates out at t=1100.
  const r2 = await limiter.limit("a", { cost: 5 });
  assertFalse(r2.ok);
  assertEquals(r2.retryAfter, 950);

  now = 1000;
  assert((await limiter.limit("a", { cost: 3 })).ok);
});

Deno.test("limit() reports exact remaining with sliding-window", async () => {
  let now = 0;
  await using limiter = createRateLimiter({
    limit: 10,
    window: 1000,
    algorithm: "sliding-window",
    segmentsPerWindow: 2,
    evictionTtl: 0,
    clock: () => now,
  });

  const r1 = await limiter.limit("a", { cost: 3 });
  assert(r1.ok);
  assertEquals(r1.remaining, 7);

  const r2 = await limiter.limit("a", { cost: 2 });
  assert(r2.ok);
  assertEquals(r2.remaining, 5);

  // One segment rotation: the counts stay within the window.
  now = 500;
  assertEquals((await limiter.peek("a")).remaining, 5);

  // Full window elapsed: all counts rotate out.
  now = 1000;
  assertEquals((await limiter.peek("a")).remaining, 10);
});

// --- Token bucket ---

Deno.test("limit() starts at full capacity with token-bucket", async () => {
  const now = 0;
  await using limiter = createRateLimiter({
    limit: 5,
    window: 1000,
    algorithm: "token-bucket",
    evictionTtl: 0,
    clock: () => now,
  });

  const r = await limiter.limit("a");
  assert(r.ok);
  assertEquals(r.remaining, 4);
  assertEquals(r.resetAt, 1000); // lastRefill + window
});

Deno.test("limit() refills tokens lazily on access with token-bucket", async () => {
  let now = 0;
  await using limiter = createRateLimiter({
    limit: 3,
    window: 1000,
    algorithm: "token-bucket",
    tokensPerPeriod: 1,
    evictionTtl: 0,
    clock: () => now,
  });

  await limiter.limit("a", { cost: 3 });
  assertFalse((await limiter.limit("a")).ok);

  now = 1000;
  const r = await limiter.limit("a");
  assert(r.ok);
  assertEquals(r.resetAt, 2000); // lastRefill advanced to 1000
  assertFalse((await limiter.limit("a")).ok);

  now = 3000;
  assert((await limiter.limit("a", { cost: 2 })).ok);
});

Deno.test("limit() caps refills at the limit with token-bucket", async () => {
  let now = 0;
  await using limiter = createRateLimiter({
    limit: 3,
    window: 1000,
    algorithm: "token-bucket",
    tokensPerPeriod: 3,
    evictionTtl: 0,
    clock: () => now,
  });

  await limiter.limit("a");
  now = 10000;
  const r = await limiter.limit("a");
  assert(r.ok);
  assertEquals(r.remaining, 2);
});

Deno.test("limit() reports retryAfter as the time until enough tokens with token-bucket", async () => {
  const now = 0;
  await using limiter = createRateLimiter({
    limit: 10,
    window: 500,
    algorithm: "token-bucket",
    tokensPerPeriod: 2,
    evictionTtl: 0,
    clock: () => now,
  });

  await limiter.limit("a", { cost: 10 });
  const r = await limiter.limit("a", { cost: 3 });
  assertFalse(r.ok);
  assertEquals(r.retryAfter, 1000);
});

Deno.test("limit() reports integer remaining after partial-cycle elapsed time with token-bucket", async () => {
  let now = 0;
  await using limiter = createRateLimiter({
    limit: 10,
    window: 300,
    algorithm: "token-bucket",
    tokensPerPeriod: 3,
    evictionTtl: 0,
    clock: () => now,
  });

  await limiter.limit("a", { cost: 10 });

  now = 500;
  const r = await limiter.limit("a");
  assert(r.ok);
  assert(
    Number.isInteger(r.remaining),
    `remaining (${r.remaining}) should be integer`,
  );
  assertEquals(r.remaining, 2);
});

Deno.test("limit() handles exact token boundaries across multi-cycle refills with token-bucket", async () => {
  let now = 0;
  await using limiter = createRateLimiter({
    limit: 7,
    window: 1000,
    algorithm: "token-bucket",
    tokensPerPeriod: 3,
    evictionTtl: 0,
    clock: () => now,
  });

  await limiter.limit("a", { cost: 7 });
  assertFalse((await limiter.limit("a")).ok);

  now = 1000;
  assert((await limiter.limit("a", { cost: 3 })).ok);
  assertFalse((await limiter.limit("a")).ok);

  now = 2000;
  assert((await limiter.limit("a", { cost: 3 })).ok);
  assertFalse((await limiter.limit("a")).ok);
});

// --- GCRA ---

Deno.test("limit() always allows the first request with gcra", async () => {
  const now = 0;
  await using limiter = createRateLimiter({
    limit: 10,
    window: 1000,
    algorithm: "gcra",
    evictionTtl: 0,
    clock: () => now,
  });

  const r = await limiter.limit("a");
  assert(r.ok);
  assertEquals(r.limit, 10);
});

Deno.test("limit() allows requests spaced one emission interval apart with gcra", async () => {
  let now = 0;
  const emissionInterval = 100; // window(1000) / limit(10)
  await using limiter = createRateLimiter({
    limit: 10,
    window: 1000,
    algorithm: "gcra",
    evictionTtl: 0,
    clock: () => now,
  });

  for (let i = 0; i < 20; i++) {
    const r = await limiter.limit("a");
    assert(r.ok, `request ${i} at now=${now} should be allowed`);
    now += emissionInterval;
  }
});

Deno.test("limit() allows a burst up to the limit when idle with gcra", async () => {
  const now = 0;
  await using limiter = createRateLimiter({
    limit: 5,
    window: 1000,
    algorithm: "gcra",
    evictionTtl: 0,
    clock: () => now,
  });

  for (let i = 0; i < 5; i++) {
    assert(
      (await limiter.limit("a")).ok,
      `burst request ${i} should be allowed`,
    );
  }
  assertFalse((await limiter.limit("a")).ok);
});

Deno.test("limit() denies requests after a burst until the tat drains with gcra", async () => {
  let now = 0;
  await using limiter = createRateLimiter({
    limit: 5,
    window: 1000,
    algorithm: "gcra",
    evictionTtl: 0,
    clock: () => now,
  });

  for (let i = 0; i < 5; i++) await limiter.limit("a");
  assertFalse((await limiter.limit("a")).ok);

  // emission_interval = 200ms. After 200ms, one slot should free.
  now = 200;
  assert((await limiter.limit("a")).ok);
  assertFalse((await limiter.limit("a")).ok);
});

Deno.test("limit() reports exact retryAfter with gcra", async () => {
  const now = 0;
  await using limiter = createRateLimiter({
    limit: 5,
    window: 1000,
    algorithm: "gcra",
    evictionTtl: 0,
    clock: () => now,
  });

  for (let i = 0; i < 5; i++) await limiter.limit("a");
  const r = await limiter.limit("a");
  assertFalse(r.ok);
  assertEquals(r.retryAfter, 200);
});

Deno.test("limit() advances the tat by emission interval times cost with gcra", async () => {
  const now = 0;
  await using limiter = createRateLimiter({
    limit: 10,
    window: 1000,
    algorithm: "gcra",
    evictionTtl: 0,
    clock: () => now,
  });

  // emission_interval = 100ms. cost=5 advances tat by 500ms.
  const r = await limiter.limit("a", { cost: 5 });
  assert(r.ok);
  assertEquals(r.remaining, 5);

  // 5 more slots remain
  assert((await limiter.limit("a", { cost: 5 })).ok);
  assertFalse((await limiter.limit("a")).ok);
});

Deno.test("limit() derives remaining from the tat with gcra", async () => {
  const now = 0;
  await using limiter = createRateLimiter({
    limit: 10,
    window: 1000,
    algorithm: "gcra",
    evictionTtl: 0,
    clock: () => now,
  });

  const r1 = await limiter.limit("a");
  assert(r1.ok);
  assertEquals(r1.remaining, 9);

  const r2 = await limiter.limit("a", { cost: 4 });
  assert(r2.ok);
  assertEquals(r2.remaining, 5);
});

Deno.test("limit() reports resetAt as the theoretical arrival time with gcra", async () => {
  const now = 1000;
  await using limiter = createRateLimiter({
    limit: 10,
    window: 1000,
    algorithm: "gcra",
    evictionTtl: 0,
    clock: () => now,
  });

  // emission_interval = window / limit = 100ms per permit.
  const r1 = await limiter.limit("a");
  assert(r1.ok);
  assertEquals(r1.resetAt, 1100); // now + emission_interval

  const r2 = await limiter.limit("a", { cost: 3 });
  assert(r2.ok);
  assertEquals(r2.resetAt, 1400); // tat advanced by 3 more intervals
});

Deno.test("limit() never reports remaining above the limit after a long idle with gcra", async () => {
  let now = 0;
  await using limiter = createRateLimiter({
    limit: 10,
    window: 1000,
    algorithm: "gcra",
    evictionTtl: 0,
    clock: () => now,
  });

  await limiter.limit("a");
  now += 100_000;

  const peek = await limiter.peek("a");
  assert(peek.ok);
  assert(
    peek.remaining <= 10,
    `remaining (${peek.remaining}) should not exceed limit (10)`,
  );
  assertEquals(peek.remaining, 10);

  const result = await limiter.limit("a");
  assert(result.ok);
  assert(
    result.remaining <= 10,
    `remaining (${result.remaining}) should not exceed limit (10)`,
  );
});

Deno.test("limit() denies a cost exceeding the remaining burst with gcra", async () => {
  const now = 0;
  await using limiter = createRateLimiter({
    limit: 5,
    window: 1000,
    algorithm: "gcra",
    evictionTtl: 0,
    clock: () => now,
  });

  await limiter.limit("a", { cost: 3 });
  const r = await limiter.limit("a", { cost: 4 });
  assertFalse(r.ok);
  assert(r.retryAfter > 0);
});

Deno.test("limit() keeps a single state entry per key with gcra", async () => {
  const now = 0;
  const store = createMemoryStore({
    limit: 100,
    window: 1000,
    algorithm: "gcra",
    evictionTtl: 0,
    clock: () => now,
  });
  await using limiter = createRateLimiter({ store });

  for (let i = 0; i < 1000; i++) {
    await limiter.limit(`key-${i}`);
  }
  assertEquals(store.size, 1000);
});

// --- peek() ---

Deno.test("peek() returns current state without consuming permits", async () => {
  const now = 0;
  await using limiter = createRateLimiter({
    limit: 5,
    window: 1000,
    algorithm: "fixed-window",
    evictionTtl: 0,
    clock: () => now,
  });

  await limiter.limit("a");
  await limiter.limit("a");

  const p = await limiter.peek("a");
  assert(p.ok);
  assertEquals(p.remaining, 3);

  // peek didn't consume — still 3 remaining
  assertEquals((await limiter.peek("a")).remaining, 3);
});

Deno.test("peek() returns full capacity for unknown key", async () => {
  const now = 0;
  await using limiter = createRateLimiter({
    limit: 10,
    window: 1000,
    algorithm: "gcra",
    evictionTtl: 0,
    clock: () => now,
  });

  const p = await limiter.peek("unknown");
  assert(p.ok);
  assertEquals(p.remaining, 10);
  assertEquals(p.limit, 10);
});

// Regression: peek() on an unknown key must report a forward-looking resetAt
// (the next replenishment event), not `now`. Fixed-window and token-bucket
// replenish at `now + window`; sliding-window rotates at the end of the
// current segment. GCRA has no scheduled replenishment, so resetAt === now
// is correct (the TAT is initialized to now).
Deno.test("peek() on unknown key reports forward-looking resetAt", async () => {
  const now = 1000;

  await using fixed = createRateLimiter({
    limit: 10,
    window: 1000,
    algorithm: "fixed-window",
    evictionTtl: 0,
    clock: () => now,
  });
  assertEquals((await fixed.peek("unknown")).resetAt, now + 1000);

  await using bucket = createRateLimiter({
    limit: 10,
    window: 1000,
    algorithm: "token-bucket",
    evictionTtl: 0,
    clock: () => now,
  });
  assertEquals((await bucket.peek("unknown")).resetAt, now + 1000);

  await using sliding = createRateLimiter({
    limit: 10,
    window: 1000,
    algorithm: "sliding-window",
    segmentsPerWindow: 4,
    evictionTtl: 0,
    clock: () => now,
  });
  assertEquals((await sliding.peek("unknown")).resetAt, now + 250);

  await using gcra = createRateLimiter({
    limit: 10,
    window: 1000,
    algorithm: "gcra",
    evictionTtl: 0,
    clock: () => now,
  });
  assertEquals((await gcra.peek("unknown")).resetAt, now);
});

Deno.test("peek() reflects consumed permits after limit()", async () => {
  const now = 0;
  await using limiter = createRateLimiter({
    limit: 5,
    window: 1000,
    algorithm: "token-bucket",
    evictionTtl: 0,
    clock: () => now,
  });

  await limiter.limit("a", { cost: 3 });
  const p = await limiter.peek("a");
  assert(p.ok);
  assertEquals(p.remaining, 2);
});

Deno.test("peek() reflects refills on an existing key without consuming", async () => {
  let now = 0;
  await using limiter = createRateLimiter({
    limit: 3,
    window: 1000,
    algorithm: "token-bucket",
    tokensPerPeriod: 1,
    evictionTtl: 0,
    clock: () => now,
  });

  await limiter.limit("a", { cost: 3 });
  assertEquals((await limiter.peek("a")).remaining, 0);

  // Two refill cycles elapse: peek reports them without consuming.
  now = 2000;
  const p = await limiter.peek("a");
  assert(p.ok);
  assertEquals(p.remaining, 2);
  assertEquals(p.resetAt, 3000);

  const r = await limiter.limit("a");
  assert(r.ok);
  assertEquals(r.remaining, 1);
});

// --- reset() ---

Deno.test("reset() restores key to full capacity", async () => {
  const now = 0;
  await using limiter = createRateLimiter({
    limit: 3,
    window: 1000,
    algorithm: "gcra",
    evictionTtl: 0,
    clock: () => now,
  });

  await limiter.limit("a", { cost: 3 });
  assertFalse((await limiter.limit("a")).ok);

  await limiter.reset("a");
  assert((await limiter.limit("a")).ok);
});

Deno.test("reset() on unknown key is a no-op", async () => {
  const now = 0;
  await using limiter = createRateLimiter({
    limit: 5,
    window: 1000,
    algorithm: "fixed-window",
    evictionTtl: 0,
    clock: () => now,
  });

  await limiter.reset("nonexistent"); // should not throw
});

// --- Store size ---

Deno.test("MemoryStore.size tracks number of keys", async () => {
  const now = 0;
  const store = createMemoryStore({
    limit: 5,
    window: 1000,
    algorithm: "gcra",
    evictionTtl: 0,
    clock: () => now,
  });
  await using limiter = createRateLimiter({ store });

  assertEquals(store.size, 0);
  await limiter.limit("a");
  assertEquals(store.size, 1);
  await limiter.limit("b");
  assertEquals(store.size, 2);
  await limiter.limit("a"); // same key
  assertEquals(store.size, 2);
  await limiter.reset("a");
  assertEquals(store.size, 1);
});

// --- TTL eviction ---

Deno.test("createMemoryStore() evicts idle keys after evictionTtl", async () => {
  using time = new FakeTime();
  const store = createMemoryStore({
    limit: 5,
    window: 1000,
    algorithm: "fixed-window",
    evictionTtl: 5000,
    evictionInterval: 1000,
  });
  await using limiter = createRateLimiter({ store });

  await limiter.limit("a");
  await limiter.limit("b");
  assertEquals(store.size, 2);

  time.tick(6000);
  assertEquals(store.size, 0);
});

Deno.test("createMemoryStore() does not evict recently active keys", async () => {
  using time = new FakeTime();
  const store = createMemoryStore({
    limit: 5,
    window: 1000,
    algorithm: "fixed-window",
    evictionTtl: 5000,
    evictionInterval: 1000,
  });
  await using limiter = createRateLimiter({ store });

  await limiter.limit("a");
  await limiter.limit("b");

  time.tick(4000);
  await limiter.limit("a"); // refresh "a"

  time.tick(2000); // 6s total — "b" should be evicted, "a" should survive
  assertEquals(store.size, 1);
  assert((await limiter.peek("a")).ok);
});

Deno.test("peek() does not refresh activity for TTL eviction", async () => {
  using time = new FakeTime();
  const store = createMemoryStore({
    limit: 5,
    window: 1000,
    algorithm: "fixed-window",
    evictionTtl: 5000,
    evictionInterval: 1000,
  });
  await using limiter = createRateLimiter({ store });

  await limiter.limit("a");
  assertEquals(store.size, 1);

  time.tick(4000);
  await limiter.peek("a"); // should NOT refresh last-access

  time.tick(2000); // 6s total — "a" should be evicted despite the peek
  assertEquals(store.size, 0);
});

Deno.test("createMemoryStore() disables eviction when evictionTtl is 0", async () => {
  using time = new FakeTime();
  const store = createMemoryStore({
    limit: 5,
    window: 1000,
    algorithm: "fixed-window",
    evictionTtl: 0,
  });
  await using limiter = createRateLimiter({ store });

  await limiter.limit("a");
  time.tick(1_000_000);
  assertEquals(store.size, 1);
});

// --- Disposal ---

Deno.test("[Symbol.asyncDispose]() clears all state", async () => {
  using _time = new FakeTime();
  const store = createMemoryStore({
    limit: 5,
    window: 1000,
    algorithm: "gcra",
  });
  const limiter = createRateLimiter({ store });

  await limiter.limit("a");
  await limiter.limit("b");
  assertEquals(store.size, 2);

  await limiter[Symbol.asyncDispose]();
  assertEquals(store.size, 0);
});

Deno.test("limit() returns ok: false after disposal", async () => {
  using _time = new FakeTime();
  const limiter = createRateLimiter({
    limit: 5,
    window: 1000,
    algorithm: "gcra",
  });

  await limiter[Symbol.asyncDispose]();
  const r = await limiter.limit("a");
  assertFalse(r.ok);
  assertEquals(r.remaining, 0);
  assertEquals(r.resetAt, 0);
  assertEquals(r.retryAfter, 0);

  // Cost validation runs before the disposed check.
  assertThrows(
    () => limiter.limit("a", { cost: 0 }),
    RangeError,
    "Cannot limit: 'cost' must be a positive integer, received 0",
  );
});

Deno.test("peek() returns ok: false after disposal", async () => {
  using _time = new FakeTime();
  const limiter = createRateLimiter({
    limit: 5,
    window: 1000,
    algorithm: "gcra",
  });

  await limiter[Symbol.asyncDispose]();
  const r = await limiter.peek("a");
  assertFalse(r.ok);
  assertEquals(r.remaining, 0);
  assertEquals(r.resetAt, 0);
  assertEquals(r.retryAfter, 0);

  // Cost validation runs before the disposed check.
  assertThrows(
    () => limiter.peek("a", { cost: 0 }),
    RangeError,
    "Cannot peek: 'cost' must be a positive integer, received 0",
  );
});

Deno.test("reset() is a no-op after disposal", async () => {
  using _time = new FakeTime();
  const limiter = createRateLimiter({
    limit: 5,
    window: 1000,
    algorithm: "gcra",
  });

  await limiter[Symbol.asyncDispose]();
  await limiter.reset("a"); // should not throw
});

Deno.test("[Symbol.asyncDispose]() is a no-op when called twice", async () => {
  const limiter = createRateLimiter({
    limit: 5,
    window: 1000,
    algorithm: "gcra",
  });

  await limiter[Symbol.asyncDispose]();
  await limiter[Symbol.asyncDispose]();
});

// --- Metadata correctness ---

Deno.test("limit() and peek() report the configured limit", async () => {
  const now = 0;
  await using limiter = createRateLimiter({
    limit: 42,
    window: 1000,
    algorithm: "gcra",
    evictionTtl: 0,
    clock: () => now,
  });

  assertEquals((await limiter.limit("a")).limit, 42);
  assertEquals((await limiter.peek("a")).limit, 42);
});

Deno.test("limit() reports zero retryAfter when allowed and positive when denied", async () => {
  const now = 0;
  await using limiter = createRateLimiter({
    limit: 1,
    window: 1000,
    algorithm: "fixed-window",
    evictionTtl: 0,
    clock: () => now,
  });

  const allowed = await limiter.limit("a");
  assertEquals(allowed.retryAfter, 0);

  const denied = await limiter.limit("a");
  assert(denied.retryAfter > 0);
});

Deno.test("limit() reports resetAt in the future", async () => {
  const now = 5000;
  await using limiter = createRateLimiter({
    limit: 5,
    window: 1000,
    algorithm: "fixed-window",
    evictionTtl: 0,
    clock: () => now,
  });

  const r = await limiter.limit("a");
  assert(r.resetAt > now);
  assertEquals(r.resetAt, 6000);
});

Deno.test("limit() reports positive retryAfter before and after allowAt with gcra", async () => {
  let now = 0;
  await using limiter = createRateLimiter({
    limit: 5,
    window: 1000,
    algorithm: "gcra",
    evictionTtl: 0,
    clock: () => now,
  });

  // Fill all 5 slots: tat advances to 1000
  for (let i = 0; i < 5; i++) await limiter.limit("a");

  // Advance only 100ms — tat is 1000, allowAt = tat - tau = 0.
  // A request at now=100 is after allowAt, so this exercises the else branch.
  now = 100;
  const r1 = await limiter.limit("a");
  assertFalse(r1.ok);
  assert(r1.retryAfter > 0);

  // Now set now to -100 (simulating clock skew) — now < allowAt exercises
  // the `now < allowAt` branch in result().
  now = -100;
  const r2 = await limiter.peek("a");
  assertFalse(r2.ok);
  assert(r2.retryAfter > 0);
});

// --- Per-key isolation ---

Deno.test("limit() isolates keys from each other", async () => {
  const now = 0;
  await using limiter = createRateLimiter({
    limit: 2,
    window: 1000,
    algorithm: "gcra",
    evictionTtl: 0,
    clock: () => now,
  });

  await limiter.limit("a", { cost: 2 });
  assertFalse((await limiter.limit("a")).ok);

  assert((await limiter.limit("b")).ok);
  assert((await limiter.limit("b")).ok);
});

// --- Default algorithm ---

Deno.test("createRateLimiter() defaults to the sliding-window algorithm", async () => {
  let now = 0;
  await using limiter = createRateLimiter({
    limit: 10,
    window: 1000,
    evictionTtl: 0,
    clock: () => now,
  });

  await limiter.limit("a", { cost: 10 });

  // At half-window, a fixed window would have reset. Sliding window hasn't.
  now = 500;
  assertFalse((await limiter.limit("a")).ok);

  // After full window, sliding window frees permits.
  now = 1000;
  assert((await limiter.limit("a")).ok);
});

// --- Default clock ---

Deno.test("createRateLimiter() defaults to Date.now as the clock", async () => {
  using _time = new FakeTime(0);
  await using limiter = createRateLimiter({
    limit: 5,
    window: 1000,
    algorithm: "fixed-window",
  });

  const r = await limiter.limit("a");
  assert(r.ok);
  assertEquals(r.resetAt, 1000);
});

// --- peek() with cost ---

Deno.test("peek() with cost checks whether that cost would be allowed", async () => {
  const now = 0;
  await using limiter = createRateLimiter({
    limit: 5,
    window: 1000,
    algorithm: "fixed-window",
    evictionTtl: 0,
    clock: () => now,
  });

  await limiter.limit("a", { cost: 3 });

  assert((await limiter.peek("a", { cost: 2 })).ok);
  assertFalse((await limiter.peek("a", { cost: 3 })).ok);
});

// --- maxKeys ---

Deno.test("limit() evicts a key to admit a new key at maxKeys", async () => {
  const now = 0;
  const store = createMemoryStore({
    limit: 5,
    window: 1000,
    algorithm: "gcra",
    evictionTtl: 0,
    maxKeys: 2,
    clock: () => now,
  });
  await using limiter = createRateLimiter({ store });

  assert((await limiter.limit("a")).ok);
  assert((await limiter.limit("b")).ok);
  assertEquals(store.size, 2);

  const r = await limiter.limit("c");
  assert(r.ok);
  assertEquals(store.size, 2);
  assertFalse(store.has("a"));
  assert(store.has("b"));
  assert(store.has("c"));
});

Deno.test("limit() evicts the least-recently-used key at maxKeys", async () => {
  let now = 0;
  const store = createMemoryStore({
    limit: 5,
    window: 1000,
    algorithm: "gcra",
    evictionTtl: 0,
    maxKeys: 3,
    clock: () => now,
  });
  await using limiter = createRateLimiter({ store });

  now = 1;
  await limiter.limit("a");
  now = 2;
  await limiter.limit("b");
  now = 3;
  await limiter.limit("c");
  assertEquals(store.size, 3);

  // Touch "a" so it becomes most-recently-used
  now = 4;
  await limiter.limit("a");

  // Insert "d" — should evict "b" (least-recently-used), not "a"
  now = 5;
  await limiter.limit("d");
  assertEquals(store.size, 3);
  assertFalse(store.has("b"));
  assert(store.has("a"));
  assert(store.has("c"));
  assert(store.has("d"));
});

Deno.test("limit() allows existing keys at maxKeys capacity", async () => {
  const now = 0;
  const store = createMemoryStore({
    limit: 5,
    window: 1000,
    algorithm: "gcra",
    evictionTtl: 0,
    maxKeys: 2,
    clock: () => now,
  });
  await using limiter = createRateLimiter({ store });

  await limiter.limit("a");
  await limiter.limit("b");

  const r = await limiter.limit("a");
  assert(r.ok);
});

// Bounded-memory tradeoff: LRU eviction at maxKeys discards rate-limit
// state, so an exhausted key regains full capacity on its next request.
Deno.test("limit() restores full capacity for an exhausted key evicted at maxKeys", async () => {
  const now = 0;
  const store = createMemoryStore({
    limit: 2,
    window: 1000,
    algorithm: "fixed-window",
    evictionTtl: 0,
    maxKeys: 2,
    clock: () => now,
  });
  await using limiter = createRateLimiter({ store });

  await limiter.limit("a", { cost: 2 });
  assertFalse((await limiter.limit("a")).ok);

  await limiter.limit("b");
  await limiter.limit("c"); // evicts "a" (LRU)
  assertFalse(store.has("a"));

  const r = await limiter.limit("a");
  assert(r.ok);
  assertEquals(r.remaining, 1);
});

Deno.test("createMemoryStore() disables the key limit when maxKeys is 0", async () => {
  const now = 0;
  const store = createMemoryStore({
    limit: 100,
    window: 1000,
    algorithm: "gcra",
    evictionTtl: 0,
    maxKeys: 0,
    clock: () => now,
  });
  await using limiter = createRateLimiter({ store });

  for (let i = 0; i < 1000; i++) {
    assert((await limiter.limit(`key:${i}`)).ok);
  }
  assertEquals(store.size, 1000);
});

Deno.test("createRateLimiter() throws for invalid maxKeys", () => {
  const cases: [maxKeys: number, message: string][] = [
    [
      -1,
      "Cannot create memory store: 'maxKeys' must be a non-negative integer, received -1",
    ],
    [
      1.5,
      "Cannot create memory store: 'maxKeys' must be a non-negative integer, received 1.5",
    ],
  ];
  for (const [maxKeys, message] of cases) {
    assertThrows(
      () => createRateLimiter({ limit: 10, window: 1000, maxKeys }),
      RangeError,
      message,
    );
  }
});

Deno.test("peek() does not evict at maxKeys capacity for an unknown key", async () => {
  const now = 0;
  const store = createMemoryStore({
    limit: 5,
    window: 1000,
    algorithm: "gcra",
    evictionTtl: 0,
    maxKeys: 2,
    clock: () => now,
  });
  await using limiter = createRateLimiter({ store });

  await limiter.limit("a");
  await limiter.limit("b");

  const r = await limiter.peek("c");
  assert(r.ok);
  assertEquals(r.remaining, 5);
  assertEquals(store.size, 2);
  assert(store.has("a"));
  assert(store.has("b"));
});

Deno.test("peek() reads an existing key at maxKeys capacity", async () => {
  const now = 0;
  const store = createMemoryStore({
    limit: 5,
    window: 1000,
    algorithm: "gcra",
    evictionTtl: 0,
    maxKeys: 2,
    clock: () => now,
  });
  await using limiter = createRateLimiter({ store });

  await limiter.limit("a");
  await limiter.limit("b");

  const r = await limiter.peek("a");
  assert(r.ok);
  assertEquals(r.remaining, 4);
});

// --- maxKeys + window reset ---

Deno.test("limit() allows an existing key whose window has reset at maxKeys", async () => {
  let now = 0;
  const store = createMemoryStore({
    limit: 3,
    window: 1000,
    algorithm: "fixed-window",
    evictionTtl: 0,
    maxKeys: 2,
    clock: () => now,
  });
  await using limiter = createRateLimiter({ store });

  await limiter.limit("a");
  await limiter.limit("b");
  assertEquals(store.size, 2);

  // Advance past the window so "a" resets to full capacity
  now = 2000;
  const r = await limiter.limit("a");
  assert(r.ok);
  assertEquals(r.remaining, 2);
});

Deno.test("limit() allows an existing key after full tat drain at maxKeys with gcra", async () => {
  let now = 0;
  const store = createMemoryStore({
    limit: 5,
    window: 1000,
    algorithm: "gcra",
    evictionTtl: 0,
    maxKeys: 2,
    clock: () => now,
  });
  await using limiter = createRateLimiter({ store });

  await limiter.limit("a");
  await limiter.limit("b");

  // Advance well past the window so "a" drains fully
  now = 5000;
  const r = await limiter.limit("a");
  assert(r.ok);
});

// --- peek() unknown key with cost > 1 ---

Deno.test("peek() returns ok for unknown key with cost <= limit", async () => {
  const now = 0;
  await using limiter = createRateLimiter({
    limit: 10,
    window: 1000,
    algorithm: "fixed-window",
    evictionTtl: 0,
    clock: () => now,
  });

  const p = await limiter.peek("unknown", { cost: 5 });
  assert(p.ok);
  assertEquals(p.remaining, 10);
  assertEquals(p.limit, 10);
});

Deno.test("peek() throws for unknown key with cost exceeding the limit", async () => {
  const now = 0;
  await using limiter = createRateLimiter({
    limit: 5,
    window: 1000,
    algorithm: "gcra",
    evictionTtl: 0,
    clock: () => now,
  });

  assertThrows(
    () => limiter.peek("unknown", { cost: 6 }),
    RangeError,
    "Cannot peek: 'cost' (6) exceeds the limit (5)",
  );
});

// --- Unknown algorithm ---

Deno.test("createRateLimiter() throws for unknown algorithm", () => {
  assertThrows(
    () =>
      createRateLimiter({
        limit: 10,
        window: 1000,
        algorithm: "unknown" as "fixed-window",
      }),
    TypeError,
    "Cannot create memory store: unknown algorithm 'unknown'",
  );
});

// --- Store backend integration ---

Deno.test("createRateLimiter() with custom store delegates correctly", async () => {
  const store = createMemoryStore({
    limit: 3,
    window: 1000,
    algorithm: "fixed-window",
    evictionTtl: 0,
  });
  await using limiter = createRateLimiter({ store });

  const r = await limiter.limit("a");
  assert(r.ok);
  assertEquals(r.remaining, 2);
  assertEquals(r.limit, 3);
});

Deno.test("createRateLimiter() reads capacity/window from store", async () => {
  const store = createMemoryStore({
    limit: 42,
    window: 5000,
    algorithm: "gcra",
    evictionTtl: 0,
  });
  await using limiter = createRateLimiter({ store });

  const r = await limiter.limit("a");
  assert(r.ok);
  assertEquals(r.limit, 42);
});

// --- Concurrent limit() calls ---

Deno.test("concurrent limit() calls on the same key respect the limit", async () => {
  const now = 0;
  await using limiter = createRateLimiter({
    limit: 2,
    window: 1000,
    algorithm: "fixed-window",
    evictionTtl: 0,
    clock: () => now,
  });

  const results = await Promise.all([
    limiter.limit("a"),
    limiter.limit("a"),
    limiter.limit("a"),
  ]);

  const allowed = results.filter((r) => r.ok).length;
  const denied = results.filter((r) => !r.ok).length;
  assertEquals(allowed, 2);
  assertEquals(denied, 1);
});

// Regression: accumulating `window / limit` per request drifted the TAT past
// tau by an ULP, so some limits admitted `limit - 1` permits in a burst.
Deno.test("limit() allows exactly limit permits in a burst for every limit with gcra", async () => {
  for (const limit of [3, 7, 11, 12, 13, 14, 30, 60, 100, 1000]) {
    for (const window of [1000, 1234, 60_000]) {
      let now = 0;
      await using limiter = createRateLimiter({
        limit,
        window,
        algorithm: "gcra",
        evictionTtl: 0,
        clock: () => now,
      });
      let allowed = 0;
      while ((await limiter.limit("a")).ok) allowed++;
      assertEquals(allowed, limit, `limit=${limit} window=${window}`);
      now += window;
      allowed = 0;
      while ((await limiter.limit("a")).ok) allowed++;
      assertEquals(allowed, limit, `refill limit=${limit} window=${window}`);
    }
  }
});

// --- GCRA clock regression ---

Deno.test("limit() rejects when the clock regresses past allowAt with gcra", async () => {
  let now = 1000;
  await using limiter = createRateLimiter({
    limit: 5,
    window: 1000,
    algorithm: "gcra",
    evictionTtl: 0,
    clock: () => now,
  });

  // Fill all 5 slots: tat advances to now + window = 2000.
  for (let i = 0; i < 5; i++) await limiter.limit("a");

  // Regress the clock so now < allowAt (allowAt = tat - tau = 2000 - 1000 = 1000).
  now = 500;
  const r = await limiter.limit("a");
  assertFalse(r.ok);
  assert(r.retryAfter > 0);
});

// Regression: a store clock that steps backwards must never report a
// retryAfter longer than the algorithm's own maximum.
Deno.test("limit() clamps retryAfter to the algorithm maximum when the clock regresses", async () => {
  const cases: [
    algorithm: NonNullable<AlgorithmOptions["algorithm"]>,
    max: number,
  ][] = [
    ["fixed-window", 1000],
    ["sliding-window", 1000],
    ["token-bucket", 1000],
    ["gcra", 1000],
  ];
  for (const [algorithm, max] of cases) {
    let now = 10_000;
    await using limiter = createRateLimiter({
      limit: 1,
      window: 1000,
      algorithm,
      segmentsPerWindow: 4,
      evictionTtl: 0,
      clock: () => now,
    });
    await limiter.limit("a");
    now -= 5000;
    const r = await limiter.limit("a");
    assertFalse(r.ok);
    assertEquals(r.retryAfter, max, `${algorithm}`);
  }
});

// --- Memory store metadata ---

Deno.test("createMemoryStore() exposes capacity and window", async () => {
  using _time = new FakeTime();
  const store = createMemoryStore({
    limit: 7,
    window: 2500,
    algorithm: "gcra",
    evictionTtl: 0,
  });

  assertEquals(store.capacity, 7);
  assertEquals(store.window, 2500);

  await store[Symbol.asyncDispose]();
});

// --- Timer interval cap ---

Deno.test("createRateLimiter() throws when evictionInterval exceeds the timer maximum", () => {
  assertThrows(
    () =>
      createRateLimiter({
        limit: 5,
        window: 1000,
        evictionInterval: 2 ** 31,
      }),
    RangeError,
    `Cannot create memory store: 'evictionInterval' (${
      2 ** 31
    }) exceeds the maximum timer interval of ${2 ** 31 - 1} milliseconds`,
  );
});

// --- Eviction TTL default ---

Deno.test("createRateLimiter() extends the default evictionTtl to cover long windows", async () => {
  using time = new FakeTime(0);
  await using limiter = createRateLimiter({
    limit: 1,
    window: 600_000,
    algorithm: "fixed-window",
  });

  assert((await limiter.limit("key")).ok);
  assertFalse((await limiter.limit("key")).ok);

  // Idle past the base 5-minute TTL: eviction scans must not reset the
  // still-limited key, because the default TTL extends to the window.
  time.tick(400_000);
  assertFalse((await limiter.limit("key")).ok);

  // Once the window rolls over, the key is allowed again.
  time.tick(200_000);
  assert((await limiter.limit("key")).ok);
});

Deno.test("createRateLimiter() extends the default evictionTtl to cover the token-bucket refill horizon", async () => {
  using time = new FakeTime(0);
  await using limiter = createRateLimiter({
    limit: 10,
    window: 60_000,
    algorithm: "token-bucket",
    tokensPerPeriod: 1,
  });

  // Drain the bucket; a full refill takes 10 cycles (600s > 5 minutes).
  assert((await limiter.limit("key", { cost: 10 })).ok);
  assertFalse((await limiter.limit("key", { cost: 10 })).ok);

  // Idle past the base 5-minute TTL: the key keeps its refill debt.
  time.tick(360_000); // 6 cycles -> 6 tokens
  assertFalse((await limiter.limit("key", { cost: 10 })).ok);

  time.tick(240_000); // 4 more cycles -> full bucket
  assert((await limiter.limit("key", { cost: 10 })).ok);
});

Deno.test("limit() and peek() preserve a large GCRA burst at epoch time", async () => {
  const limit = 100_000;
  let now = 1_757_000_000_000;
  await using limiter = createRateLimiter({
    limit,
    window: 1000,
    algorithm: "gcra",
    evictionTtl: 0,
    clock: () => now,
  });

  for (let i = 0; i < limit; i++) {
    assert((await limiter.limit("a")).ok);
  }
  const peek = await limiter.peek("a");
  assertFalse(peek.ok);
  assertEquals(peek.remaining, 0);
  assertEquals(peek.retryAfter, 0.01);
  assertEquals(peek.resetAt, now + 1000);
  assertEquals(await limiter.limit("a"), peek);

  for (let i = 0; i < 1000; i++) {
    now++;
    const result = await limiter.limit("a", { cost: 100 });
    assert(result.ok);
    assertEquals(result.remaining, 0);
    assertEquals(result.resetAt, now + 1000);
  }

  now += 2000;
  const idle = await limiter.peek("a");
  assert(idle.ok);
  assertEquals(idle.remaining, limit);
  assertEquals(idle.resetAt, now);
  assert((await limiter.limit("a", { cost: limit })).ok);
  assertFalse((await limiter.limit("a")).ok);
});

Deno.test("createRateLimiter() validates GCRA integer arithmetic", () => {
  for (const window of [0.5, 2 ** 52]) {
    assertThrows(
      () => createRateLimiter({ limit: 2, window, algorithm: "gcra" }),
      RangeError,
      window === 0.5
        ? "Cannot create gcra: 'window' must be a positive integer, received 0.5"
        : `Cannot create gcra: 'window' * 'limit' must be below 2 ** 53, received ${
          2 ** 53
        }`,
    );
  }
});

// --- Process lifetime ---

Deno.test("createRateLimiter() does not keep the process alive when undisposed", async () => {
  const script = `
    import { createRateLimiter } from ${
    JSON.stringify(new URL("./rate_limiter.ts", import.meta.url).href)
  };
    const limiter = createRateLimiter({ limit: 5, window: 1000 });
    await limiter.limit("key");
  `;
  const command = new Deno.Command(Deno.execPath(), {
    args: ["eval", "--no-lock", script],
    stderr: "inherit",
    signal: AbortSignal.timeout(30_000),
  });
  const { success } = await command.output();
  assert(success, "process did not exit with an undisposed rate limiter");
});
