// Copyright 2018-2026 the Deno authors. MIT license.

import { assert, assertEquals, assertFalse, assertThrows } from "@std/assert";
import { FakeTime } from "@std/testing/time";
import { createGcra } from "./gcra.ts";

// --- Factory validation ---

Deno.test("createGcra() throws for invalid options", () => {
  const cases: [options: Parameters<typeof createGcra>[0], message: string][] =
    [
      [
        { limit: 0, window: 1000 },
        "Cannot create gcra: 'limit' must be a positive integer, received 0",
      ],
      [
        { limit: 1.5, window: 1000 },
        "Cannot create gcra: 'limit' must be a positive integer, received 1.5",
      ],
      [
        { limit: 10, window: 0 },
        "Cannot create gcra: 'window' must be a positive integer, received 0",
      ],
      [
        { limit: 10, window: Infinity },
        "Cannot create gcra: 'window' must be a positive integer, received Infinity",
      ],
      [
        { limit: 10, window: 0.5 },
        "Cannot create gcra: 'window' must be a positive integer, received 0.5",
      ],
      [
        { limit: 10, window: 1000, queueLimit: -1 },
        "Cannot create gcra: 'queueLimit' must be a non-negative integer, received -1",
      ],
      [
        { limit: 1, window: 2 ** 32, queueLimit: 1 },
        `Cannot create gcra: 'window' / 'limit' (${
          2 ** 32
        }) exceeds the maximum timer interval of ${2 ** 31 - 1} milliseconds`,
      ],
    ];
  for (const [options, message] of cases) {
    assertThrows(() => createGcra(options), RangeError, message);
  }
});

Deno.test("createGcra() accepts an emission interval above the timer maximum when autoReplenishment is false", () => {
  using limiter = createGcra({
    limit: 1,
    window: 2 ** 32,
    autoReplenishment: false,
  });
  assert(limiter.tryAcquire().acquired);
});

// --- tryAcquire (sync) ---

Deno.test("tryAcquire() allows an initial burst up to the limit", () => {
  const now = 0;
  using limiter = createGcra({
    limit: 5,
    window: 1000,
    autoReplenishment: false,
    clock: () => now,
  });

  for (let i = 0; i < 5; i++) {
    assert(limiter.tryAcquire().acquired);
  }
  assertFalse(limiter.tryAcquire().acquired);
});

Deno.test("tryAcquire() allows exactly limit permits in a burst for every limit", () => {
  for (const limit of [3, 7, 11, 12, 13, 14, 30, 60, 100, 1000]) {
    for (const window of [1000, 1234, 60_000]) {
      using limiter = createGcra({
        limit,
        window,
        autoReplenishment: false,
        clock: () => 0,
      });
      let allowed = 0;
      while (limiter.tryAcquire().acquired) allowed++;
      assertEquals(allowed, limit, `limit=${limit} window=${window}`);
    }
  }
});

Deno.test("tryAcquire() preserves a large GCRA burst at epoch time", () => {
  const limit = 100_000;
  let now = 1_757_000_000_000;
  using limiter = createGcra({
    limit,
    window: 1000,
    autoReplenishment: false,
    clock: () => now,
  });

  for (let i = 0; i < limit; i++) {
    assert(limiter.tryAcquire().acquired);
  }
  const denied = limiter.tryAcquire();
  assertFalse(denied.acquired);
  assertEquals(denied.retryAfter, 0.01);

  for (let i = 0; i < 1000; i++) {
    now++;
    assert(limiter.tryAcquire(100).acquired);
    assertFalse(limiter.tryAcquire().acquired);
  }

  now += 1000;
  assert(limiter.tryAcquire(limit).acquired);
  assertFalse(limiter.tryAcquire().acquired);
});

Deno.test("createGcra() validates the scaled window boundary", () => {
  assertThrows(
    () => createGcra({ limit: 2, window: 2 ** 52 }),
    RangeError,
    `Cannot create gcra: 'window' * 'limit' must be below 2 ** 53, received ${
      2 ** 53
    }`,
  );
  using limiter = createGcra({
    limit: 2,
    window: 2 ** 52 - 1,
    autoReplenishment: false,
    clock: () => 0,
  });
  assert(limiter.tryAcquire(2).acquired);
  assertFalse(limiter.tryAcquire().acquired);
});

Deno.test("tryAcquire() frees capacity continuously at the emission interval", () => {
  let now = 0;
  using limiter = createGcra({
    limit: 5,
    window: 1000,
    autoReplenishment: false,
    clock: () => now,
  });

  limiter.tryAcquire(5);
  assertFalse(limiter.tryAcquire().acquired);

  // One emission interval (1000 / 5 = 200ms) frees exactly one permit.
  now += 199;
  assertFalse(limiter.tryAcquire().acquired);
  now += 1;
  assert(limiter.tryAcquire().acquired);
  assertFalse(limiter.tryAcquire().acquired);
});

Deno.test("tryAcquire() supports multi-permit costs", () => {
  let now = 0;
  using limiter = createGcra({
    limit: 10,
    window: 1000,
    autoReplenishment: false,
    clock: () => now,
  });

  assert(limiter.tryAcquire(10).acquired);
  assertFalse(limiter.tryAcquire().acquired);

  // A cost of 3 needs 3 emission intervals (300ms) to free up.
  now += 300;
  assert(limiter.tryAcquire(3).acquired);
  assertFalse(limiter.tryAcquire().acquired);
});

Deno.test("tryAcquire() reports retryAfter matching the cost", () => {
  const now = 0;
  using limiter = createGcra({
    limit: 5,
    window: 1000,
    autoReplenishment: false,
    clock: () => now,
  });

  limiter.tryAcquire(5);

  const single = limiter.tryAcquire();
  assertFalse(single.acquired);
  if (!single.acquired) {
    assertEquals(single.retryAfter, 200);
    assertEquals(single.reason, "Insufficient permits");
  }

  const triple = limiter.tryAcquire(3);
  assertFalse(triple.acquired);
  if (!triple.acquired) {
    assertEquals(triple.retryAfter, 600);
  }
});

Deno.test("tryAcquire() throws for invalid permits", () => {
  const now = 0;
  using limiter = createGcra({
    limit: 5,
    window: 1000,
    autoReplenishment: false,
    clock: () => now,
  });

  assertThrows(
    () => limiter.tryAcquire(0),
    RangeError,
    "Cannot acquire: 'permits' must be a positive integer, received 0",
  );
  assertThrows(
    () => limiter.tryAcquire(6),
    RangeError,
    "Cannot acquire: 'permits' (6) exceeds the permit limit (5)",
  );
});

// --- acquire (async) ---

Deno.test("acquire() drains queued waiters as capacity frees up", async () => {
  using time = new FakeTime(0);
  using limiter = createGcra({
    limit: 5,
    window: 1000,
    queueLimit: 5,
  });

  limiter.tryAcquire(5);

  let resolved = false;
  const promise = limiter.acquire().then((lease) => {
    resolved = true;
    return lease;
  });

  await Promise.resolve();
  assertFalse(resolved);

  // The drain timer ticks every emission interval (200ms).
  await time.tickAsync(200);
  const lease = await promise;
  assert(resolved);
  assert(lease.acquired);
});

Deno.test("acquire() returns rejected lease when queue limit is 0", async () => {
  const now = 0;
  using limiter = createGcra({
    limit: 1,
    window: 1000,
    autoReplenishment: false,
    clock: () => now,
  });

  limiter.tryAcquire();

  const lease = await limiter.acquire();
  assertFalse(lease.acquired);
  if (!lease.acquired) {
    assertEquals(lease.reason, "Queue limit exceeded");
    assertEquals(lease.retryAfter, 1000);
  }
});

// --- Manual replenishment ---

Deno.test("replenish() drains queued waiters at the current clock", async () => {
  let now = 0;
  const limiter = createGcra({
    limit: 2,
    window: 1000,
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

  // Not enough time has passed: replenish drains nothing.
  now += 499;
  limiter.replenish();
  await Promise.resolve();
  assertFalse(resolved);

  now += 1;
  limiter.replenish();
  const lease = await promise;
  assert(resolved);
  assert(lease.acquired);

  limiter[Symbol.dispose]();
});

Deno.test("replenish() throws when autoReplenishment is enabled", () => {
  using time = new FakeTime(0);
  using limiter = createGcra({ limit: 5, window: 1000 });
  void time;

  assertThrows(
    () => limiter.replenish(),
    Error,
    "Cannot replenish: limiter uses automatic replenishment",
  );
});

// --- Disposal ---

Deno.test("dispose resolves queued waiters with rejected leases", async () => {
  const now = 0;
  const limiter = createGcra({
    limit: 1,
    window: 1000,
    autoReplenishment: false,
    queueLimit: 5,
    clock: () => now,
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
  const limiter = createGcra({
    limit: 5,
    window: 1000,
    autoReplenishment: false,
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
  const limiter = createGcra({
    limit: 5,
    window: 1000,
    autoReplenishment: false,
  });

  limiter[Symbol.dispose]();
  const lease = await limiter.acquire();
  assertFalse(lease.acquired);
  if (!lease.acquired) {
    assertEquals(lease.reason, "Rate limiter has been disposed");
    assertEquals(lease.retryAfter, 0);
  }
});
