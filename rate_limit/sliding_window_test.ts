// Copyright 2018-2026 the Deno authors. MIT license.

import {
  assert,
  assertEquals,
  assertFalse,
  assertRejects,
  assertThrows,
} from "@std/assert";
import { FakeTime } from "@std/testing/time";
import { createSlidingWindow } from "./sliding_window.ts";

// --- Factory validation ---

Deno.test("createSlidingWindow() throws for invalid options", () => {
  const cases: [
    options: Parameters<typeof createSlidingWindow>[0],
    message: string,
  ][] = [
    [
      { limit: 0, window: 1000, segmentsPerWindow: 2 },
      "Cannot create sliding window: 'limit' must be a positive integer, received 0",
    ],
    [
      { limit: -1, window: 1000, segmentsPerWindow: 2 },
      "Cannot create sliding window: 'limit' must be a positive integer, received -1",
    ],
    [
      { limit: 1.5, window: 1000, segmentsPerWindow: 2 },
      "Cannot create sliding window: 'limit' must be a positive integer, received 1.5",
    ],
    [
      { limit: NaN, window: 1000, segmentsPerWindow: 2 },
      "Cannot create sliding window: 'limit' must be a positive integer, received NaN",
    ],
    [
      { limit: Infinity, window: 1000, segmentsPerWindow: 2 },
      "Cannot create sliding window: 'limit' must be a positive integer, received Infinity",
    ],
    [
      { limit: 10, window: 0, segmentsPerWindow: 2 },
      "Cannot create sliding window: 'window' must be a positive finite number, received 0",
    ],
    [
      { limit: 10, window: -100, segmentsPerWindow: 2 },
      "Cannot create sliding window: 'window' must be a positive finite number, received -100",
    ],
    [
      { limit: 10, window: NaN, segmentsPerWindow: 2 },
      "Cannot create sliding window: 'window' must be a positive finite number, received NaN",
    ],
    [
      { limit: 10, window: Infinity, segmentsPerWindow: 2 },
      "Cannot create sliding window: 'window' must be a positive finite number, received Infinity",
    ],
    [
      { limit: 10, window: 1000, segmentsPerWindow: 1 },
      "Cannot create sliding window: 'segmentsPerWindow' must be an integer >= 2, received 1",
    ],
    [
      { limit: 10, window: 1000, segmentsPerWindow: 0 },
      "Cannot create sliding window: 'segmentsPerWindow' must be an integer >= 2, received 0",
    ],
    [
      { limit: 10, window: 1000, segmentsPerWindow: 1.5 },
      "Cannot create sliding window: 'segmentsPerWindow' must be an integer >= 2, received 1.5",
    ],
    [
      { limit: 10, window: 1000, segmentsPerWindow: 2, queueLimit: -1 },
      "Cannot create sliding window: 'queueLimit' must be a non-negative integer, received -1",
    ],
    [
      { limit: 1, window: 2 ** 33, segmentsPerWindow: 2, queueLimit: 1 },
      `Cannot create sliding window: 'window' / 'segmentsPerWindow' (${
        2 ** 32
      }) exceeds the maximum timer interval of ${2 ** 31 - 1} milliseconds`,
    ],
  ];
  for (const [options, message] of cases) {
    assertThrows(() => createSlidingWindow(options), RangeError, message);
  }
});

Deno.test("createSlidingWindow() accepts a window not divisible by segmentsPerWindow", () => {
  let now = 0;
  using limiter = createSlidingWindow({
    limit: 3,
    window: 1000,
    segmentsPerWindow: 3,
    autoReplenishment: false,
    clock: () => now,
  });
  assert(limiter.tryAcquire(3).acquired);
  const lease = limiter.tryAcquire();
  assertFalse(lease.acquired);
  assertEquals(lease.retryAfter, 1000);
  now = 1000;
  assert(limiter.tryAcquire().acquired);
});

Deno.test("createSlidingWindow() accepts a segment duration above the timer maximum when autoReplenishment is false", () => {
  using limiter = createSlidingWindow({
    limit: 1,
    window: 2 ** 33,
    segmentsPerWindow: 2,
    autoReplenishment: false,
  });
  assert(limiter.tryAcquire().acquired);
});

// --- tryAcquire ---

Deno.test("tryAcquire() succeeds within the permit limit", () => {
  using _time = new FakeTime(0);
  using limiter = createSlidingWindow({
    limit: 3,
    window: 1000,
    segmentsPerWindow: 2,
  });

  assert(limiter.tryAcquire().acquired);
  assert(limiter.tryAcquire().acquired);
  assert(limiter.tryAcquire().acquired);
  assertFalse(limiter.tryAcquire().acquired);
});

Deno.test("tryAcquire() acquires multiple permits at once", () => {
  using _time = new FakeTime(0);
  using limiter = createSlidingWindow({
    limit: 5,
    window: 1000,
    segmentsPerWindow: 2,
  });

  assert(limiter.tryAcquire(3).acquired);
  assertFalse(limiter.tryAcquire(3).acquired);
  assert(limiter.tryAcquire(2).acquired);
});

Deno.test("tryAcquire() reports retryAfter as the time until enough permits free", () => {
  let now = 0;
  using limiter = createSlidingWindow({
    limit: 10,
    window: 1000,
    segmentsPerWindow: 4,
    autoReplenishment: false,
    clock: () => now,
  });

  limiter.tryAcquire(10);
  now = 50;
  const lease = limiter.tryAcquire(5);
  assertFalse(lease.acquired);
  // Every permit sits in the first segment, which rotates out at t=1000.
  assertEquals(lease.retryAfter, 950);
  now = 1000;
  assert(limiter.tryAcquire(5).acquired);
});

Deno.test("tryAcquire() rejects with retryAfter equal to the window when the only permit is in the newest segment", () => {
  using _time = new FakeTime(0);
  using limiter = createSlidingWindow({
    limit: 1,
    window: 1000,
    segmentsPerWindow: 4,
  });

  limiter.tryAcquire();
  const lease = limiter.tryAcquire();
  assertFalse(lease.acquired);
  assertEquals(lease.retryAfter, 1000);
  assertEquals(lease.reason, "Insufficient permits");
});

Deno.test("tryAcquire() throws for invalid permits", () => {
  using _time = new FakeTime(0);
  using limiter = createSlidingWindow({
    limit: 5,
    window: 1000,
    segmentsPerWindow: 2,
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
  using limiter = createSlidingWindow({
    limit: 5,
    window: 1000,
    segmentsPerWindow: 2,
  });

  assertThrows(
    () => limiter.tryAcquire(6),
    RangeError,
    "Cannot acquire: 'permits' (6) exceeds the permit limit (5)",
  );
});

// --- Sliding behavior ---

Deno.test("tryAcquire() frees permits only after the full window of rotations", () => {
  using time = new FakeTime(0);
  // 4 segments, each 250ms. Full window = 1000ms.
  using limiter = createSlidingWindow({
    limit: 4,
    window: 1000,
    segmentsPerWindow: 4,
  });

  // Fill all permits in segment 0
  limiter.tryAcquire(4);
  assertFalse(limiter.tryAcquire().acquired);

  // After 1 segment rotation (250ms), segment 0 is still in the window
  time.tick(250);
  assertFalse(limiter.tryAcquire().acquired);

  // After 2 rotations (500ms), segment 0 still in window
  time.tick(250);
  assertFalse(limiter.tryAcquire().acquired);

  // After 3 rotations (750ms), segment 0 still in window
  time.tick(250);
  assertFalse(limiter.tryAcquire().acquired);

  // After 4 rotations (1000ms), segment 0 is evicted — permits freed
  time.tick(250);
  assert(limiter.tryAcquire(4).acquired);
});

Deno.test("tryAcquire() prevents boundary bursts across window edges", () => {
  using time = new FakeTime(0);
  // 2 segments of 500ms each, limit 10.
  using limiter = createSlidingWindow({
    limit: 10,
    window: 1000,
    segmentsPerWindow: 2,
  });

  // Use all 10 permits in segment 0
  limiter.tryAcquire(10);
  assertFalse(limiter.tryAcquire().acquired);

  // After one segment rotation (500ms), only segment 0's permits are still
  // counted. A fixed window would have reset entirely, allowing 10 more.
  // The sliding window only frees what was in the evicted segment — nothing
  // yet, because segment 0 hasn't been evicted (it's now the "oldest" of 2).
  time.tick(500);
  assertFalse(limiter.tryAcquire().acquired);

  // After the second rotation (1000ms total), segment 0 is finally evicted.
  time.tick(500);
  assert(limiter.tryAcquire(10).acquired);
});

Deno.test("tryAcquire() frees permits incrementally as segments rotate", () => {
  using time = new FakeTime(0);
  // 3 segments of 100ms each, limit 6.
  using limiter = createSlidingWindow({
    limit: 6,
    window: 300,
    segmentsPerWindow: 3,
  });

  // Segment 0: use 2
  limiter.tryAcquire(2);
  // Segment 1: use 2
  time.tick(100);
  limiter.tryAcquire(2);
  // Segment 2: use 2 — now at limit
  time.tick(100);
  limiter.tryAcquire(2);
  assertFalse(limiter.tryAcquire().acquired);

  // Rotate once: evicts segment 0 (2 permits), freeing 2
  time.tick(100);
  assert(limiter.tryAcquire(2).acquired);
  assertFalse(limiter.tryAcquire().acquired);

  // Rotate again: evicts segment 1 (2 permits), freeing 2
  time.tick(100);
  assert(limiter.tryAcquire(2).acquired);
  assertFalse(limiter.tryAcquire().acquired);
});

// --- Manual replenishment ---

Deno.test("replenish() throws when autoReplenishment is true", () => {
  using _time = new FakeTime(0);
  using limiter = createSlidingWindow({
    limit: 5,
    window: 1000,
    segmentsPerWindow: 2,
  });

  assertThrows(
    () => limiter.replenish(),
    Error,
    "Cannot replenish: limiter uses automatic replenishment",
  );
});

Deno.test("replenish() rotates the segments elapsed on the clock", () => {
  let now = 0;
  using limiter = createSlidingWindow({
    limit: 4,
    window: 1000,
    segmentsPerWindow: 4,
    autoReplenishment: false,
    clock: () => now,
  });

  limiter.tryAcquire(4);
  assertFalse(limiter.tryAcquire().acquired);

  // Segment 0's count leaves the window only after all 4 segments rotate.
  for (let i = 0; i < 3; i++) {
    now += 250;
    limiter.replenish();
    assertFalse(limiter.tryAcquire().acquired);
  }
  now += 250;
  limiter.replenish();
  assert(limiter.tryAcquire(4).acquired);
});

Deno.test("replenish() is a no-op before a segment elapses", () => {
  let now = 0;
  using limiter = createSlidingWindow({
    limit: 4,
    window: 1000,
    segmentsPerWindow: 4,
    autoReplenishment: false,
    clock: () => now,
  });

  limiter.tryAcquire(4);

  now += 999;
  limiter.replenish();
  assertFalse(limiter.tryAcquire().acquired);

  now += 1;
  limiter.replenish();
  assert(limiter.tryAcquire(4).acquired);
});

Deno.test("replenish() drains queued waiters once enough segments have rotated", async () => {
  let now = 0;
  // 2 segments of 500ms, limit 2.
  using limiter = createSlidingWindow({
    limit: 2,
    window: 1000,
    segmentsPerWindow: 2,
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

  // One rotation: segment 0 is still in the window, nothing freed.
  now += 500;
  limiter.replenish();
  await Promise.resolve();
  assertFalse(resolved);

  // Second rotation evicts segment 0, freeing both permits.
  now += 500;
  limiter.replenish();
  const lease = await promise;
  assert(resolved);
  assert(lease.acquired);
});

// --- acquire (async) ---

Deno.test("acquire() resolves immediately when permits available", async () => {
  using _time = new FakeTime(0);
  using limiter = createSlidingWindow({
    limit: 5,
    window: 1000,
    segmentsPerWindow: 2,
  });

  const lease = await limiter.acquire();
  assert(lease.acquired);
});

Deno.test("acquire() returns rejected lease when queue limit is 0", async () => {
  using _time = new FakeTime(0);
  using limiter = createSlidingWindow({
    limit: 1,
    window: 1000,
    segmentsPerWindow: 2,
    queueLimit: 0,
  });

  limiter.tryAcquire();
  const lease = await limiter.acquire();
  assertFalse(lease.acquired);
  assertEquals(lease.reason, "Queue limit exceeded");
});

Deno.test("acquire() queues and resolves after segment rotation frees capacity", async () => {
  using time = new FakeTime(0);
  // 2 segments of 500ms, limit 1
  using limiter = createSlidingWindow({
    limit: 1,
    window: 1000,
    segmentsPerWindow: 2,
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

  // First rotation doesn't evict the segment with the permit yet
  time.tick(500);
  await Promise.resolve();
  assertFalse(resolved);

  // Second rotation evicts it
  time.tick(500);
  const lease = await promise;
  assert(resolved);
  assert(lease.acquired);
});

Deno.test("acquire() resolves a multi-permit waiter only when enough permits are free", async () => {
  using time = new FakeTime(0);
  // 3 segments of 100ms, limit 3.
  using limiter = createSlidingWindow({
    limit: 3,
    window: 300,
    segmentsPerWindow: 3,
    queueLimit: 5,
  });

  // Segment 0: use 1. Segment 1: use 2 — now at limit.
  limiter.tryAcquire(1);
  time.tick(100);
  limiter.tryAcquire(2);

  let resolved = false;
  const promise = limiter.acquire(3).then((lease) => {
    resolved = true;
    return lease;
  });

  await Promise.resolve();
  assertFalse(resolved);

  // Rotations at 200ms and 300ms free only segment 0's single permit —
  // not enough for a 3-permit waiter.
  time.tick(200);
  await Promise.resolve();
  assertFalse(resolved);

  // Rotation at 400ms evicts segment 1 (2 permits) — all 3 are now free.
  time.tick(100);
  const lease = await promise;
  assert(resolved);
  assert(lease.acquired);
});

Deno.test("acquire() rejects when aborted via signal", async () => {
  using _time = new FakeTime(0);
  using limiter = createSlidingWindow({
    limit: 1,
    window: 1000,
    segmentsPerWindow: 2,
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
  using limiter = createSlidingWindow({
    limit: 1,
    window: 1000,
    segmentsPerWindow: 2,
    queueLimit: 5,
  });

  limiter.tryAcquire();

  await assertRejects(
    () => limiter.acquire(1, { signal: AbortSignal.abort() }),
    DOMException,
  );
});

// --- Disposal ---

Deno.test("dispose() resolves queued waiters with rejected leases", async () => {
  using _time = new FakeTime(0);
  const limiter = createSlidingWindow({
    limit: 1,
    window: 1000,
    segmentsPerWindow: 2,
    queueLimit: 5,
  });

  limiter.tryAcquire();
  const promise = limiter.acquire();
  limiter[Symbol.dispose]();

  const lease = await promise;
  assertFalse(lease.acquired);
  assertEquals(lease.reason, "Rate limiter has been disposed");
  assertEquals(lease.retryAfter, 0);
});

Deno.test("tryAcquire() returns rejected lease after disposal", () => {
  using _time = new FakeTime(0);
  const limiter = createSlidingWindow({
    limit: 5,
    window: 1000,
    segmentsPerWindow: 2,
  });

  limiter[Symbol.dispose]();
  const lease = limiter.tryAcquire();
  assertFalse(lease.acquired);
  assertEquals(lease.reason, "Rate limiter has been disposed");
  assertEquals(lease.retryAfter, 0);
});

Deno.test("acquire() resolves with rejected lease after disposal", async () => {
  using _time = new FakeTime(0);
  const limiter = createSlidingWindow({
    limit: 5,
    window: 1000,
    segmentsPerWindow: 2,
  });

  limiter[Symbol.dispose]();
  const lease = await limiter.acquire();
  assertFalse(lease.acquired);
  assertEquals(lease.reason, "Rate limiter has been disposed");
  assertEquals(lease.retryAfter, 0);
});

Deno.test("dispose() is idempotent", () => {
  using _time = new FakeTime(0);
  const limiter = createSlidingWindow({
    limit: 5,
    window: 1000,
    segmentsPerWindow: 2,
  });

  limiter[Symbol.dispose]();
  limiter[Symbol.dispose]();
});

// --- Queue ordering ---

Deno.test("acquire() resolves oldest-first waiters in FIFO order", async () => {
  using time = new FakeTime(0);
  // 2 segments of 500ms, limit 1.
  using limiter = createSlidingWindow({
    limit: 1,
    window: 1000,
    segmentsPerWindow: 2,
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

  // 4 segment rotations total: first 2 free the original permit (p1 served),
  // next 2 free p1's permit (p2 served).
  time.tick(2000);
  await p1;
  await p2;

  assertEquals(order, [1, 2]);
});

Deno.test("acquire() resolves the newest waiter first when queueOrder is newest-first", async () => {
  using time = new FakeTime(0);
  // 4 segments of 250ms, limit 2. Two permits available at start.
  using limiter = createSlidingWindow({
    limit: 2,
    window: 1000,
    segmentsPerWindow: 4,
    queueLimit: 10,
    queueOrder: "newest-first",
  });

  limiter.tryAcquire(2);

  const order: number[] = [];
  const p1 = limiter.acquire().then((l) => {
    order.push(1);
    return l;
  });
  const p2 = limiter.acquire().then((l) => {
    order.push(2);
    return l;
  });

  // 4 rotations evicts segment 0 (2 permits). newest-first serves p2 first.
  time.tick(1000);
  await p2;
  await p1;

  assertEquals(order, [2, 1]);
});

// --- Eviction ---

Deno.test("acquire() evicts the oldest waiter when a newest-first queue is full", async () => {
  using time = new FakeTime(0);
  // 4 segments of 250ms, limit 3, queue holds 2
  using limiter = createSlidingWindow({
    limit: 3,
    window: 1000,
    segmentsPerWindow: 4,
    queueLimit: 2,
    queueOrder: "newest-first",
  });

  limiter.tryAcquire(3);

  const results: string[] = [];
  const p1 = limiter.acquire().then((l) => {
    results.push(l.acquired ? "p1:acquired" : `p1:${l.reason}`);
    return l;
  });
  const p2 = limiter.acquire().then((l) => {
    results.push(l.acquired ? "p2:acquired" : `p2:${l.reason}`);
    return l;
  });
  const p3 = limiter.acquire().then((l) => {
    results.push(l.acquired ? "p3:acquired" : `p3:${l.reason}`);
    return l;
  });

  await p1;
  assertEquals(results, ["p1:Evicted by newer request"]);

  // 4 rotations evicts segment 0 (3 permits freed). newest-first: p3 then p2.
  time.tick(1000);
  await p3;
  await p2;

  assertEquals(results, [
    "p1:Evicted by newer request",
    "p3:acquired",
    "p2:acquired",
  ]);
});

// --- acquire() validation ---

Deno.test("acquire() rejects for invalid permits", async () => {
  using _time = new FakeTime(0);
  using limiter = createSlidingWindow({
    limit: 5,
    window: 1000,
    segmentsPerWindow: 2,
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
  using limiter = createSlidingWindow({
    limit: 5,
    window: 1000,
    segmentsPerWindow: 2,
  });

  await assertRejects(
    () => limiter.acquire(6),
    RangeError,
    "Cannot acquire: 'permits' (6) exceeds the permit limit (5)",
  );
});

// --- Multiple waiters resolved in single replenishment ---

Deno.test("acquire() drains multiple queued waiters in a single replenishment", async () => {
  using time = new FakeTime(0);
  // 2 segments of 500ms, limit 3.
  using limiter = createSlidingWindow({
    limit: 3,
    window: 1000,
    segmentsPerWindow: 2,
    queueLimit: 10,
  });

  limiter.tryAcquire(3);

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

  // 2 rotations evicts segment 0 (3 permits freed), all 3 waiters drain at once
  time.tick(1000);
  await Promise.all([p1, p2, p3]);

  assertEquals(order, [1, 2, 3]);
  for (const p of [p1, p2, p3]) {
    assert((await p).acquired);
  }
});

// --- Queue edge cases ---

Deno.test("acquire() rejects when permits exceed queueLimit even if queue is empty", async () => {
  using _time = new FakeTime(0);
  using limiter = createSlidingWindow({
    limit: 5,
    window: 1000,
    segmentsPerWindow: 2,
    queueLimit: 2,
  });

  limiter.tryAcquire(5);

  const lease = await limiter.acquire(3);
  assertFalse(lease.acquired);
  assertEquals(lease.reason, "Queue limit exceeded");
});
