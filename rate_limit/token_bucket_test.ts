// Copyright 2018-2026 the Deno authors. MIT license.

import {
  assert,
  assertEquals,
  assertFalse,
  assertRejects,
  assertThrows,
} from "@std/assert";
import { FakeTime } from "@std/testing/time";
import { createTokenBucket } from "./token_bucket.ts";

// --- Factory validation ---

Deno.test("createTokenBucket() throws for invalid options", () => {
  const cases: [
    options: Parameters<typeof createTokenBucket>[0],
    message: string,
  ][] = [
    [
      { limit: 0, tokensPerPeriod: 1, replenishmentPeriod: 1000 },
      "Cannot create token bucket: 'limit' must be a positive integer, received 0",
    ],
    [
      { limit: -1, tokensPerPeriod: 1, replenishmentPeriod: 1000 },
      "Cannot create token bucket: 'limit' must be a positive integer, received -1",
    ],
    [
      { limit: 1.5, tokensPerPeriod: 1, replenishmentPeriod: 1000 },
      "Cannot create token bucket: 'limit' must be a positive integer, received 1.5",
    ],
    [
      { limit: NaN, tokensPerPeriod: 1, replenishmentPeriod: 1000 },
      "Cannot create token bucket: 'limit' must be a positive integer, received NaN",
    ],
    [
      { limit: Infinity, tokensPerPeriod: 1, replenishmentPeriod: 1000 },
      "Cannot create token bucket: 'limit' must be a positive integer, received Infinity",
    ],
    [
      { limit: 10, tokensPerPeriod: 0, replenishmentPeriod: 1000 },
      "Cannot create token bucket: 'tokensPerPeriod' must be a positive integer, received 0",
    ],
    [
      { limit: 10, tokensPerPeriod: -1, replenishmentPeriod: 1000 },
      "Cannot create token bucket: 'tokensPerPeriod' must be a positive integer, received -1",
    ],
    [
      { limit: 10, tokensPerPeriod: 1.5, replenishmentPeriod: 1000 },
      "Cannot create token bucket: 'tokensPerPeriod' must be a positive integer, received 1.5",
    ],
    [
      { limit: 10, tokensPerPeriod: 11, replenishmentPeriod: 1000 },
      "Cannot create token bucket: 'tokensPerPeriod' (11) exceeds 'limit' (10)",
    ],
    [
      { limit: 10, tokensPerPeriod: 1, replenishmentPeriod: 0 },
      "Cannot create token bucket: 'replenishmentPeriod' must be a positive finite number, received 0",
    ],
    [
      { limit: 10, tokensPerPeriod: 1, replenishmentPeriod: -100 },
      "Cannot create token bucket: 'replenishmentPeriod' must be a positive finite number, received -100",
    ],
    [
      { limit: 10, tokensPerPeriod: 1, replenishmentPeriod: NaN },
      "Cannot create token bucket: 'replenishmentPeriod' must be a positive finite number, received NaN",
    ],
    [
      { limit: 10, tokensPerPeriod: 1, replenishmentPeriod: Infinity },
      "Cannot create token bucket: 'replenishmentPeriod' must be a positive finite number, received Infinity",
    ],
    [
      {
        limit: 10,
        tokensPerPeriod: 1,
        replenishmentPeriod: 1000,
        queueLimit: -1,
      },
      "Cannot create token bucket: 'queueLimit' must be a non-negative integer, received -1",
    ],
    [
      {
        limit: 1,
        tokensPerPeriod: 1,
        replenishmentPeriod: 2 ** 31,
        queueLimit: 1,
      },
      `Cannot create token bucket: 'replenishmentPeriod' (${
        2 ** 31
      }) exceeds the maximum timer interval of ${2 ** 31 - 1} milliseconds`,
    ],
  ];
  for (const [options, message] of cases) {
    assertThrows(() => createTokenBucket(options), RangeError, message);
  }
});

Deno.test("createTokenBucket() accepts a replenishmentPeriod above the timer maximum when autoReplenishment is false", () => {
  using limiter = createTokenBucket({
    limit: 1,
    tokensPerPeriod: 1,
    replenishmentPeriod: 2 ** 31,
    autoReplenishment: false,
  });
  assert(limiter.tryAcquire().acquired);
});

// --- tryAcquire ---

Deno.test("tryAcquire() succeeds when tokens are available", () => {
  using _time = new FakeTime(0);
  using limiter = createTokenBucket({
    limit: 5,
    tokensPerPeriod: 1,
    replenishmentPeriod: 1000,
  });

  const lease = limiter.tryAcquire();
  assert(lease.acquired);
});

Deno.test("tryAcquire() acquires multiple permits", () => {
  using _time = new FakeTime(0);
  using limiter = createTokenBucket({
    limit: 5,
    tokensPerPeriod: 1,
    replenishmentPeriod: 1000,
  });

  const lease = limiter.tryAcquire(3);
  assert(lease.acquired);

  const lease2 = limiter.tryAcquire(3);
  assertFalse(lease2.acquired);
});

Deno.test("tryAcquire() returns rejected lease when tokens exhausted", () => {
  using _time = new FakeTime(0);
  using limiter = createTokenBucket({
    limit: 1,
    tokensPerPeriod: 1,
    replenishmentPeriod: 1000,
  });

  const first = limiter.tryAcquire();
  assert(first.acquired);

  const second = limiter.tryAcquire();
  assertFalse(second.acquired);
  assert(second.retryAfter > 0);
  assertEquals(second.reason, "Insufficient permits");
});

Deno.test("tryAcquire() throws for invalid permits", () => {
  using _time = new FakeTime(0);
  using limiter = createTokenBucket({
    limit: 5,
    tokensPerPeriod: 1,
    replenishmentPeriod: 1000,
  });

  assertThrows(
    () => limiter.tryAcquire(0),
    RangeError,
    "Cannot acquire: 'permits' must be a positive integer, received 0",
  );
  assertThrows(
    () => limiter.tryAcquire(-1),
    RangeError,
    "Cannot acquire: 'permits' must be a positive integer, received -1",
  );
  assertThrows(
    () => limiter.tryAcquire(1.5),
    RangeError,
    "Cannot acquire: 'permits' must be a positive integer, received 1.5",
  );
});

Deno.test("tryAcquire() throws when permits exceed limit", () => {
  using _time = new FakeTime(0);
  using limiter = createTokenBucket({
    limit: 5,
    tokensPerPeriod: 1,
    replenishmentPeriod: 1000,
  });

  assertThrows(
    () => limiter.tryAcquire(6),
    RangeError,
    "Cannot acquire: 'permits' (6) exceeds the permit limit (5)",
  );
});

// --- Replenishment ---

Deno.test("tryAcquire() grants tokens again after the replenishment period", () => {
  using time = new FakeTime(0);
  using limiter = createTokenBucket({
    limit: 2,
    tokensPerPeriod: 1,
    replenishmentPeriod: 1000,
  });

  limiter.tryAcquire();
  limiter.tryAcquire();
  assertFalse(limiter.tryAcquire().acquired);

  // One period refills exactly tokensPerPeriod (1) tokens.
  time.tick(1000);
  assert(limiter.tryAcquire().acquired);
  assertFalse(limiter.tryAcquire().acquired);
});

Deno.test("tryAcquire() does not exceed the limit after replenishment", () => {
  using time = new FakeTime(0);
  using limiter = createTokenBucket({
    limit: 2,
    tokensPerPeriod: 2,
    replenishmentPeriod: 1000,
  });

  time.tick(5000);

  assert(limiter.tryAcquire(2).acquired);
  assertFalse(limiter.tryAcquire().acquired);
});

Deno.test("tryAcquire() never refills beyond the bucket capacity", () => {
  using time = new FakeTime(0);
  using limiter = createTokenBucket({
    limit: 5,
    tokensPerPeriod: 2,
    replenishmentPeriod: 1000,
  });

  // Drain 1 token, then let many periods pass.
  assert(limiter.tryAcquire().acquired);
  time.tick(10_000);

  assert(limiter.tryAcquire(5).acquired);
  assertFalse(limiter.tryAcquire().acquired);
});

// --- Manual replenishment ---

Deno.test("replenish() throws when autoReplenishment is true", () => {
  using _time = new FakeTime(0);
  using limiter = createTokenBucket({
    limit: 5,
    tokensPerPeriod: 1,
    replenishmentPeriod: 1000,
  });

  assertThrows(
    () => limiter.replenish(),
    Error,
    "Cannot replenish: limiter uses automatic replenishment",
  );
});

Deno.test("replenish() replenishes when autoReplenishment is false", () => {
  let now = 0;
  const limiter = createTokenBucket({
    limit: 5,
    tokensPerPeriod: 2,
    replenishmentPeriod: 1000,
    autoReplenishment: false,
    clock: () => now,
  });

  for (let i = 0; i < 5; i++) limiter.tryAcquire();
  assertFalse(limiter.tryAcquire().acquired);

  now += 1000;
  limiter.replenish();
  assert(limiter.tryAcquire().acquired);
  assert(limiter.tryAcquire().acquired);
  assertFalse(limiter.tryAcquire().acquired);

  limiter[Symbol.dispose]();
});

Deno.test("replenish() is a no-op before the period elapses", () => {
  let now = 0;
  const limiter = createTokenBucket({
    limit: 5,
    tokensPerPeriod: 2,
    replenishmentPeriod: 1000,
    autoReplenishment: false,
    clock: () => now,
  });

  for (let i = 0; i < 5; i++) limiter.tryAcquire();

  now += 999;
  limiter.replenish();
  assertFalse(limiter.tryAcquire().acquired);

  now += 1;
  limiter.replenish();
  assert(limiter.tryAcquire().acquired);

  limiter[Symbol.dispose]();
});

Deno.test("replenish() drains queued acquire() waiters", async () => {
  let now = 0;
  const limiter = createTokenBucket({
    limit: 2,
    tokensPerPeriod: 2,
    replenishmentPeriod: 1000,
    autoReplenishment: false,
    queueLimit: 5,
    clock: () => now,
  });

  limiter.tryAcquire(2);

  let resolved = false;
  const promise = limiter.acquire().then((lease) => {
    resolved = true;
    return lease;
  });

  await Promise.resolve();
  assertFalse(resolved);

  now += 1000;
  limiter.replenish();
  const lease = await promise;
  assert(resolved);
  assert(lease.acquired);

  limiter[Symbol.dispose]();
});

// --- acquire (async) ---

Deno.test("acquire() resolves immediately when tokens available", async () => {
  using _time = new FakeTime(0);
  using limiter = createTokenBucket({
    limit: 5,
    tokensPerPeriod: 1,
    replenishmentPeriod: 1000,
  });

  const lease = await limiter.acquire();
  assert(lease.acquired);
});

Deno.test("acquire() returns rejected lease when queue limit is 0", async () => {
  using _time = new FakeTime(0);
  using limiter = createTokenBucket({
    limit: 1,
    tokensPerPeriod: 1,
    replenishmentPeriod: 1000,
    queueLimit: 0,
  });

  limiter.tryAcquire();
  const lease = await limiter.acquire();
  assertFalse(lease.acquired);
  assertEquals(lease.reason, "Queue limit exceeded");
});

Deno.test("acquire() queues and resolves after replenishment", async () => {
  using time = new FakeTime(0);
  using limiter = createTokenBucket({
    limit: 1,
    tokensPerPeriod: 1,
    replenishmentPeriod: 1000,
    queueLimit: 5,
  });

  limiter.tryAcquire();

  let resolved = false;
  const promise = limiter.acquire().then((lease) => {
    resolved = true;
    return lease;
  });

  await Promise.resolve();
  assertFalse(resolved);

  time.tick(1000);
  const lease = await promise;
  assert(resolved);
  assert(lease.acquired);
});

Deno.test("acquire() rejects when aborted via signal", async () => {
  using _time = new FakeTime(0);
  using limiter = createTokenBucket({
    limit: 1,
    tokensPerPeriod: 1,
    replenishmentPeriod: 1000,
    queueLimit: 5,
  });

  limiter.tryAcquire();

  const controller = new AbortController();
  const promise = limiter.acquire(1, { signal: controller.signal });
  controller.abort();

  await assertRejects(() => promise, DOMException);
});

Deno.test("acquire() rejects when signal is already aborted", async () => {
  using _time = new FakeTime(0);
  using limiter = createTokenBucket({
    limit: 1,
    tokensPerPeriod: 1,
    replenishmentPeriod: 1000,
    queueLimit: 5,
  });

  limiter.tryAcquire();

  await assertRejects(
    () => limiter.acquire(1, { signal: AbortSignal.abort() }),
    DOMException,
  );
});

// --- retryAfter ---

Deno.test("tryAcquire() reports retryAfter reflecting the token deficit", () => {
  using _time = new FakeTime(0);
  using limiter = createTokenBucket({
    limit: 10,
    tokensPerPeriod: 2,
    replenishmentPeriod: 500,
  });

  for (let i = 0; i < 10; i++) limiter.tryAcquire();

  const lease = limiter.tryAcquire(3);
  assertFalse(lease.acquired);
  assertEquals(lease.retryAfter, 1000);
});

// --- Disposal ---

Deno.test("dispose resolves queued waiters with rejected leases", async () => {
  using _time = new FakeTime(0);
  const limiter = createTokenBucket({
    limit: 1,
    tokensPerPeriod: 1,
    replenishmentPeriod: 1000,
    queueLimit: 5,
  });

  limiter.tryAcquire();
  const promise = limiter.acquire();
  limiter[Symbol.dispose]();

  const lease = await promise;
  assertFalse(lease.acquired);
  if (!lease.acquired) {
    assertEquals(lease.reason, "Rate limiter has been disposed");
    assertEquals(lease.retryAfter, 0);
  }
});

Deno.test("tryAcquire() returns rejected lease after disposal", () => {
  using _time = new FakeTime(0);
  const limiter = createTokenBucket({
    limit: 5,
    tokensPerPeriod: 1,
    replenishmentPeriod: 1000,
  });

  limiter[Symbol.dispose]();
  const lease = limiter.tryAcquire();
  assertFalse(lease.acquired);
  if (!lease.acquired) {
    assertEquals(lease.reason, "Rate limiter has been disposed");
    assertEquals(lease.retryAfter, 0);
  }
});

Deno.test("acquire() resolves with rejected lease after disposal", async () => {
  using _time = new FakeTime(0);
  const limiter = createTokenBucket({
    limit: 5,
    tokensPerPeriod: 1,
    replenishmentPeriod: 1000,
  });

  limiter[Symbol.dispose]();
  const lease = await limiter.acquire();
  assertFalse(lease.acquired);
  if (!lease.acquired) {
    assertEquals(lease.reason, "Rate limiter has been disposed");
    assertEquals(lease.retryAfter, 0);
  }
});

// --- Queue ordering ---

Deno.test("acquire() resolves oldest-first waiters in FIFO order", async () => {
  using time = new FakeTime(0);
  using limiter = createTokenBucket({
    limit: 1,
    tokensPerPeriod: 1,
    replenishmentPeriod: 1000,
    queueLimit: 10,
    queueOrder: "oldest-first",
  });

  limiter.tryAcquire();

  const order: number[] = [];
  const p1 = limiter.acquire().then((l) => {
    order.push(1);
    return l;
  });
  const p2 = limiter.acquire().then((l) => {
    order.push(2);
    return l;
  });

  time.tick(1000);
  await p1;
  time.tick(1000);
  await p2;

  assertEquals(order, [1, 2]);
});

Deno.test("acquire() resolves newest-first waiters in LIFO order", async () => {
  using time = new FakeTime(0);
  using limiter = createTokenBucket({
    limit: 1,
    tokensPerPeriod: 1,
    replenishmentPeriod: 1000,
    queueLimit: 10,
    queueOrder: "newest-first",
  });

  limiter.tryAcquire();

  const order: number[] = [];
  const p1 = limiter.acquire().then((l) => {
    order.push(1);
    return l;
  });
  const p2 = limiter.acquire().then((l) => {
    order.push(2);
    return l;
  });

  time.tick(1000);
  await p2;
  time.tick(1000);
  await p1;

  assertEquals(order, [2, 1]);
});

// --- Multi-permit queued waiters ---

Deno.test("acquire() queues multi-permit waiter spanning multiple periods", async () => {
  using time = new FakeTime(0);
  using limiter = createTokenBucket({
    limit: 3,
    tokensPerPeriod: 1,
    replenishmentPeriod: 1000,
    queueLimit: 10,
  });

  limiter.tryAcquire(3);

  let resolved = false;
  const promise = limiter.acquire(3).then((lease) => {
    resolved = true;
    return lease;
  });

  await Promise.resolve();
  assertFalse(resolved);

  time.tick(1000);
  await Promise.resolve();
  assertFalse(resolved);

  time.tick(1000);
  await Promise.resolve();
  assertFalse(resolved);

  time.tick(1000);
  const lease = await promise;
  assert(resolved);
  assert(lease.acquired);
});

// --- Multiple waiters resolved in single replenishment ---

Deno.test("acquire() resolves multiple queued waiters in a single replenishment", async () => {
  using time = new FakeTime(0);
  using limiter = createTokenBucket({
    limit: 5,
    tokensPerPeriod: 5,
    replenishmentPeriod: 1000,
    queueLimit: 10,
  });

  limiter.tryAcquire(5);

  const order: number[] = [];
  const p1 = limiter.acquire(1).then((l) => {
    order.push(1);
    return l;
  });
  const p2 = limiter.acquire(1).then((l) => {
    order.push(2);
    return l;
  });
  const p3 = limiter.acquire(1).then((l) => {
    order.push(3);
    return l;
  });

  await Promise.resolve();
  assertEquals(order, []);

  time.tick(1000);
  await Promise.all([p1, p2, p3]);

  assertEquals(order, [1, 2, 3]);
  for (const p of [p1, p2, p3]) {
    assert((await p).acquired);
  }
});

// --- acquire() validation ---

Deno.test("acquire() rejects for invalid permits", async () => {
  using _time = new FakeTime(0);
  using limiter = createTokenBucket({
    limit: 5,
    tokensPerPeriod: 1,
    replenishmentPeriod: 1000,
  });

  await assertRejects(
    () => limiter.acquire(0),
    RangeError,
    "Cannot acquire: 'permits' must be a positive integer, received 0",
  );
  await assertRejects(
    () => limiter.acquire(-1),
    RangeError,
    "Cannot acquire: 'permits' must be a positive integer, received -1",
  );
  await assertRejects(
    () => limiter.acquire(1.5),
    RangeError,
    "Cannot acquire: 'permits' must be a positive integer, received 1.5",
  );
});

Deno.test("acquire() rejects when permits exceed limit", async () => {
  using _time = new FakeTime(0);
  using limiter = createTokenBucket({
    limit: 5,
    tokensPerPeriod: 1,
    replenishmentPeriod: 1000,
  });

  await assertRejects(
    () => limiter.acquire(6),
    RangeError,
    "Cannot acquire: 'permits' (6) exceeds the permit limit (5)",
  );
});

// --- Queue edge cases ---

Deno.test("acquire() rejects when permits exceed queueLimit even if queue is empty", async () => {
  using _time = new FakeTime(0);
  using limiter = createTokenBucket({
    limit: 5,
    tokensPerPeriod: 1,
    replenishmentPeriod: 1000,
    queueLimit: 2,
  });

  for (let i = 0; i < 5; i++) limiter.tryAcquire();

  const lease = await limiter.acquire(3);
  assertFalse(lease.acquired);
  assertEquals(lease.reason, "Queue limit exceeded");
});

Deno.test("acquire() rejects the incoming request when the oldest-first queue is full", async () => {
  using time = new FakeTime(0);
  using limiter = createTokenBucket({
    limit: 1,
    tokensPerPeriod: 1,
    replenishmentPeriod: 1000,
    queueLimit: 1,
    queueOrder: "oldest-first",
  });

  limiter.tryAcquire();

  const results: string[] = [];
  const p1 = limiter.acquire().then((l) => {
    results.push(l.acquired ? "p1:acquired" : `p1:${l.reason}`);
    return l;
  });
  const p2 = limiter.acquire().then((l) => {
    results.push(l.acquired ? "p2:acquired" : `p2:${l.reason}`);
    return l;
  });

  // The queued waiter keeps its FIFO position; the newcomer is rejected.
  await p2;
  assertEquals(results, ["p2:Queue limit exceeded"]);

  time.tick(1000);
  await p1;

  assertEquals(results, ["p2:Queue limit exceeded", "p1:acquired"]);
});

Deno.test("acquire() evicts multiple waiters for a large request with newest-first", async () => {
  using time = new FakeTime(0);
  using limiter = createTokenBucket({
    limit: 3,
    tokensPerPeriod: 3,
    replenishmentPeriod: 1000,
    queueLimit: 3,
    queueOrder: "newest-first",
  });

  limiter.tryAcquire(3);

  const results: string[] = [];
  const p1 = limiter.acquire(1).then((l) => {
    results.push(l.acquired ? "p1:acquired" : `p1:${l.reason}`);
    return l;
  });
  const p2 = limiter.acquire(1).then((l) => {
    results.push(l.acquired ? "p2:acquired" : `p2:${l.reason}`);
    return l;
  });
  const p3 = limiter.acquire(1).then((l) => {
    results.push(l.acquired ? "p3:acquired" : `p3:${l.reason}`);
    return l;
  });

  await Promise.resolve();
  assertEquals(results, []);

  const p4 = limiter.acquire(3).then((l) => {
    results.push(l.acquired ? "p4:acquired" : `p4:${l.reason}`);
    return l;
  });

  await Promise.all([p1, p2, p3]);
  assertEquals(results, [
    "p1:Evicted by newer request",
    "p2:Evicted by newer request",
    "p3:Evicted by newer request",
  ]);

  time.tick(1000);
  const lease = await p4;
  assert(lease.acquired);
  assertEquals(results, [
    "p1:Evicted by newer request",
    "p2:Evicted by newer request",
    "p3:Evicted by newer request",
    "p4:acquired",
  ]);
});

// --- retryAfter after manual replenish ---

Deno.test("tryAcquire() reports correct retryAfter after manual replenish", () => {
  let now = 0;
  const limiter = createTokenBucket({
    limit: 3,
    tokensPerPeriod: 1,
    replenishmentPeriod: 1000,
    autoReplenishment: false,
    clock: () => now,
  });

  for (let i = 0; i < 3; i++) limiter.tryAcquire();
  now += 1000;
  limiter.replenish();
  limiter.tryAcquire();

  // 0 tokens at t=1000; 3 tokens need 3 refills, the last at t=4000.
  const lease = limiter.tryAcquire(3);
  assertFalse(lease.acquired);
  assertEquals(lease.retryAfter, 3000);

  limiter[Symbol.dispose]();
});

// --- Floating-point boundary ---

Deno.test("tryAcquire() floors remaining tokens at the integer boundary", () => {
  using time = new FakeTime(0);
  using limiter = createTokenBucket({
    limit: 5,
    tokensPerPeriod: 1,
    replenishmentPeriod: 1000,
  });

  for (let i = 0; i < 5; i++) limiter.tryAcquire();
  assertFalse(limiter.tryAcquire().acquired);

  time.tick(1000);
  const lease = limiter.tryAcquire();
  assert(lease.acquired);
});

Deno.test("tryAcquire() denied at exact token boundary after partial refill", () => {
  using time = new FakeTime(0);
  using limiter = createTokenBucket({
    limit: 10,
    tokensPerPeriod: 3,
    replenishmentPeriod: 1000,
  });

  for (let i = 0; i < 10; i++) limiter.tryAcquire();
  assertFalse(limiter.tryAcquire().acquired);

  time.tick(1000);
  assert(limiter.tryAcquire(3).acquired);
  assertFalse(limiter.tryAcquire().acquired);

  time.tick(1000);
  assert(limiter.tryAcquire(3).acquired);
  assertFalse(limiter.tryAcquire().acquired);

  time.tick(1000);
  assert(limiter.tryAcquire(3).acquired);
  assertFalse(limiter.tryAcquire().acquired);
});

Deno.test("tryAcquire() reports correct retryAfter with non-power-of-two tokensPerPeriod", () => {
  using _time = new FakeTime(0);
  using limiter = createTokenBucket({
    limit: 7,
    tokensPerPeriod: 3,
    replenishmentPeriod: 1000,
  });

  for (let i = 0; i < 7; i++) limiter.tryAcquire();

  const lease = limiter.tryAcquire(5);
  assertFalse(lease.acquired);
  assertEquals(lease.retryAfter, 2000);
});

// --- Double dispose ---

Deno.test("dispose() is idempotent", () => {
  using _time = new FakeTime(0);
  const limiter = createTokenBucket({
    limit: 5,
    tokensPerPeriod: 1,
    replenishmentPeriod: 1000,
  });

  limiter[Symbol.dispose]();
  limiter[Symbol.dispose]();
});
