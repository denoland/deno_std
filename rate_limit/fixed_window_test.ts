// Copyright 2018-2026 the Deno authors. MIT license.

import {
  assert,
  assertEquals,
  assertFalse,
  assertRejects,
  assertStrictEquals,
  assertThrows,
} from "@std/assert";
import { FakeTime } from "@std/testing/time";
import { createFixedWindow } from "./fixed_window.ts";

// --- Factory validation ---

Deno.test("createFixedWindow() throws for invalid options", () => {
  const cases: [
    options: Parameters<typeof createFixedWindow>[0],
    message: string,
  ][] = [
    [
      { limit: 0, window: 1000 },
      "Cannot create fixed window: 'limit' must be a positive integer, received 0",
    ],
    [
      { limit: -1, window: 1000 },
      "Cannot create fixed window: 'limit' must be a positive integer, received -1",
    ],
    [
      { limit: 1.5, window: 1000 },
      "Cannot create fixed window: 'limit' must be a positive integer, received 1.5",
    ],
    [
      { limit: NaN, window: 1000 },
      "Cannot create fixed window: 'limit' must be a positive integer, received NaN",
    ],
    [
      { limit: Infinity, window: 1000 },
      "Cannot create fixed window: 'limit' must be a positive integer, received Infinity",
    ],
    [
      { limit: 10, window: 0 },
      "Cannot create fixed window: 'window' must be a positive finite number, received 0",
    ],
    [
      { limit: 10, window: -100 },
      "Cannot create fixed window: 'window' must be a positive finite number, received -100",
    ],
    [
      { limit: 10, window: NaN },
      "Cannot create fixed window: 'window' must be a positive finite number, received NaN",
    ],
    [
      { limit: 10, window: Infinity },
      "Cannot create fixed window: 'window' must be a positive finite number, received Infinity",
    ],
    [
      { limit: 10, window: 1000, queueLimit: -1 },
      "Cannot create fixed window: 'queueLimit' must be a non-negative integer, received -1",
    ],
  ];
  for (const [options, message] of cases) {
    assertThrows(() => createFixedWindow(options), RangeError, message);
  }
});

Deno.test("createFixedWindow() throws for unknown queueOrder", () => {
  assertThrows(
    () =>
      createFixedWindow({
        limit: 10,
        window: 1000,
        queueOrder: "random" as "oldest-first",
      }),
    TypeError,
    "Cannot create limiter: unknown queueOrder 'random'",
  );
});

// --- tryAcquire ---

Deno.test("tryAcquire() succeeds within the window limit", () => {
  using _time = new FakeTime(0);
  using limiter = createFixedWindow({
    limit: 3,
    window: 1000,
  });

  assert(limiter.tryAcquire().acquired);
  assert(limiter.tryAcquire().acquired);
  assert(limiter.tryAcquire().acquired);
  assertFalse(limiter.tryAcquire().acquired);
});

Deno.test("tryAcquire() acquires multiple permits at once", () => {
  using _time = new FakeTime(0);
  using limiter = createFixedWindow({
    limit: 5,
    window: 1000,
  });

  assert(limiter.tryAcquire(3).acquired);
  assertFalse(limiter.tryAcquire(3).acquired);
  assert(limiter.tryAcquire(2).acquired);
});

Deno.test("tryAcquire() rejects with retryAfter equal to window duration", () => {
  using _time = new FakeTime(0);
  using limiter = createFixedWindow({
    limit: 1,
    window: 5000,
  });

  limiter.tryAcquire();
  const lease = limiter.tryAcquire();
  assertFalse(lease.acquired);
  if (!lease.acquired) {
    assertEquals(lease.retryAfter, 5000);
    assertEquals(lease.reason, "Insufficient permits");
  }
});

Deno.test("tryAcquire() throws for invalid permits", () => {
  using _time = new FakeTime(0);
  using limiter = createFixedWindow({
    limit: 5,
    window: 1000,
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
  using limiter = createFixedWindow({
    limit: 5,
    window: 1000,
  });

  assertThrows(
    () => limiter.tryAcquire(6),
    RangeError,
    "Cannot acquire: 'permits' (6) exceeds the permit limit (5)",
  );
});

// --- Window reset ---

Deno.test("tryAcquire() grants permits again after the window elapses", () => {
  using time = new FakeTime(0);
  using limiter = createFixedWindow({ limit: 2, window: 1000 });

  limiter.tryAcquire();
  limiter.tryAcquire();
  assertFalse(limiter.tryAcquire().acquired);

  time.tick(1000);

  assert(limiter.tryAcquire().acquired);
  assert(limiter.tryAcquire().acquired);
  assertFalse(limiter.tryAcquire().acquired);
});

Deno.test("tryAcquire() restores the full permit count each window", () => {
  using time = new FakeTime(0);
  using limiter = createFixedWindow({ limit: 5, window: 500 });

  for (let i = 0; i < 5; i++) limiter.tryAcquire();
  assertFalse(limiter.tryAcquire().acquired);

  time.tick(500);

  assert(limiter.tryAcquire(5).acquired);
});

// --- Manual replenishment ---

Deno.test("replenish() throws when autoReplenishment is true", () => {
  using _time = new FakeTime(0);
  using limiter = createFixedWindow({
    limit: 5,
    window: 1000,
  });

  assertThrows(
    () => limiter.replenish(),
    Error,
    "Cannot replenish: limiter uses automatic replenishment",
  );
});

Deno.test("replenish() drains queued acquire() waiters", async () => {
  let now = 0;
  const limiter = createFixedWindow({
    limit: 3,
    window: 1000,
    autoReplenishment: false,
    queueLimit: 5,
    clock: () => now,
  });

  limiter.tryAcquire(3);

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

Deno.test("replenish() resets the window when autoReplenishment is false", () => {
  let now = 0;
  const limiter = createFixedWindow({
    limit: 3,
    window: 1000,
    autoReplenishment: false,
    clock: () => now,
  });

  limiter.tryAcquire();
  limiter.tryAcquire();
  limiter.tryAcquire();
  assertFalse(limiter.tryAcquire().acquired);

  now += 1000;
  limiter.replenish();
  assert(limiter.tryAcquire().acquired);

  limiter[Symbol.dispose]();
});

Deno.test("replenish() is a no-op before the window elapses", () => {
  let now = 0;
  const limiter = createFixedWindow({
    limit: 3,
    window: 1000,
    autoReplenishment: false,
    clock: () => now,
  });

  limiter.tryAcquire(3);

  now += 999;
  limiter.replenish();
  assertFalse(limiter.tryAcquire().acquired);

  now += 1;
  limiter.replenish();
  assert(limiter.tryAcquire().acquired);

  limiter[Symbol.dispose]();
});

// --- acquire (async) ---

Deno.test("acquire() resolves immediately when permits available", async () => {
  using _time = new FakeTime(0);
  using limiter = createFixedWindow({ limit: 5, window: 1000 });

  const lease = await limiter.acquire();
  assert(lease.acquired);
});

Deno.test("acquire() returns rejected lease when queue limit is 0", async () => {
  using _time = new FakeTime(0);
  using limiter = createFixedWindow({
    limit: 1,
    window: 1000,
    queueLimit: 0,
  });

  limiter.tryAcquire();
  const lease = await limiter.acquire();
  assertFalse(lease.acquired);
  if (!lease.acquired) {
    assertEquals(lease.reason, "Queue limit exceeded");
  }
});

Deno.test("acquire() queues and resolves after window reset", async () => {
  using time = new FakeTime(0);
  using limiter = createFixedWindow({
    limit: 1,
    window: 1000,
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

Deno.test("acquire() rejects with an AbortError when aborted mid-wait", async () => {
  using time = new FakeTime(0);
  using limiter = createFixedWindow({
    limit: 1,
    window: 1000,
    queueLimit: 1,
  });

  limiter.tryAcquire();

  const controller = new AbortController();
  const promise = limiter.acquire(1, { signal: controller.signal });
  controller.abort();

  const error = await assertRejects(() => promise, DOMException);
  assertEquals(error.name, "AbortError");

  // The aborted waiter released its queue slot (queueLimit is 1).
  const queued = limiter.acquire();
  time.tick(1000);
  assert((await queued).acquired);
});

Deno.test("acquire() rejects with the custom abort reason when aborted mid-wait", async () => {
  using _time = new FakeTime(0);
  using limiter = createFixedWindow({
    limit: 1,
    window: 1000,
    queueLimit: 5,
  });

  limiter.tryAcquire();

  const controller = new AbortController();
  const promise = limiter.acquire(1, { signal: controller.signal });
  const reason = new Error("stop");
  controller.abort(reason);

  const error = await assertRejects(() => promise, Error, "stop");
  assertStrictEquals(error, reason);
});

Deno.test("acquire() rejects when signal is already aborted", async () => {
  using _time = new FakeTime(0);
  using limiter = createFixedWindow({
    limit: 1,
    window: 1000,
    queueLimit: 5,
  });

  limiter.tryAcquire();

  await assertRejects(
    () => limiter.acquire(1, { signal: AbortSignal.abort() }),
    DOMException,
  );
});

Deno.test("acquire() with already-aborted signal rejects even when permits are available", async () => {
  using _time = new FakeTime(0);
  using limiter = createFixedWindow({
    limit: 5,
    window: 1000,
    queueLimit: 5,
  });

  await assertRejects(
    () => limiter.acquire(1, { signal: AbortSignal.abort() }),
    DOMException,
  );

  assert(
    limiter.tryAcquire(5).acquired,
    "all 5 permits should still be available",
  );
});

Deno.test("acquire() with already-aborted signal does not evict queued waiters", async () => {
  using time = new FakeTime(0);
  using limiter = createFixedWindow({
    limit: 1,
    window: 1000,
    queueLimit: 1,
    queueOrder: "newest-first",
  });

  limiter.tryAcquire();

  const existingPromise = limiter.acquire();

  await assertRejects(
    () => limiter.acquire(1, { signal: AbortSignal.abort() }),
    DOMException,
  );

  time.tick(1000);
  const lease = await existingPromise;
  assert(lease.acquired, "existing waiter should not have been evicted");
});

// --- Disposal ---

Deno.test("dispose() resolves queued waiters with rejected leases", async () => {
  using _time = new FakeTime(0);
  const limiter = createFixedWindow({
    limit: 1,
    window: 1000,
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

Deno.test("dispose() resolves a queued waiter carrying a signal and removes its abort listener", async () => {
  using _time = new FakeTime(0);
  const limiter = createFixedWindow({
    limit: 1,
    window: 1000,
    queueLimit: 5,
  });

  limiter.tryAcquire();

  const controller = new AbortController();
  const promise = limiter.acquire(1, { signal: controller.signal });
  limiter[Symbol.dispose]();

  const lease = await promise;
  assertFalse(lease.acquired);
  if (!lease.acquired) {
    assertEquals(lease.reason, "Rate limiter has been disposed");
    assertEquals(lease.retryAfter, 0);
  }

  // The abort listener was removed on dispose; aborting now is a no-op.
  controller.abort();
});

Deno.test("tryAcquire() returns rejected lease after disposal", () => {
  using _time = new FakeTime(0);
  const limiter = createFixedWindow({ limit: 5, window: 1000 });

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
  const limiter = createFixedWindow({ limit: 5, window: 1000 });

  limiter[Symbol.dispose]();
  const lease = await limiter.acquire();
  assertFalse(lease.acquired);
  if (!lease.acquired) {
    assertEquals(lease.reason, "Rate limiter has been disposed");
    assertEquals(lease.retryAfter, 0);
  }
});

// --- Queue ordering ---

Deno.test("acquire() resolves waiters in FIFO order with oldest-first", async () => {
  using time = new FakeTime(0);
  using limiter = createFixedWindow({
    limit: 1,
    window: 1000,
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

Deno.test("acquire() resolves the newest waiter first with newest-first", async () => {
  using time = new FakeTime(0);
  using limiter = createFixedWindow({
    limit: 1,
    window: 1000,
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

Deno.test("acquire() blocks smaller older waiters behind a large newest waiter with newest-first", async () => {
  using time = new FakeTime(0);
  using limiter = createFixedWindow({
    limit: 3,
    window: 1000,
    queueLimit: 10,
    queueOrder: "newest-first",
  });

  limiter.tryAcquire(3);

  const order: string[] = [];
  const small = limiter.acquire(1).then((l) => {
    order.push("small");
    return l;
  });
  const large = limiter.acquire(3).then((l) => {
    order.push("large");
    return l;
  });

  // The drain stops at the first waiter that does not fit: the large newest
  // waiter consumes the whole fresh window, stalling the older small one.
  time.tick(1000);
  assert((await large).acquired);
  assertEquals(order, ["large"]);

  time.tick(1000);
  assert((await small).acquired);
  assertEquals(order, ["large", "small"]);
});

// --- Eviction ---

Deno.test("acquire() evicts the oldest waiter when the queue is full with newest-first", async () => {
  using time = new FakeTime(0);
  using limiter = createFixedWindow({
    limit: 1,
    window: 1000,
    queueLimit: 2,
    queueOrder: "newest-first",
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
  const p3 = limiter.acquire().then((l) => {
    results.push(l.acquired ? "p3:acquired" : `p3:${l.reason}`);
    return l;
  });

  const evicted = await p1;
  assertEquals(results, ["p1:Evicted by newer request"]);
  assertFalse(evicted.acquired);
  if (!evicted.acquired) {
    // The window was consumed at t=0, so a retry helps at t=1000.
    assertEquals(evicted.retryAfter, 1000);
  }

  time.tick(1000);
  await p3;
  time.tick(1000);
  await p2;

  assertEquals(results, [
    "p1:Evicted by newer request",
    "p3:acquired",
    "p2:acquired",
  ]);
});

Deno.test("acquire() rejects the incoming request when the queue is full with oldest-first", async () => {
  using time = new FakeTime(0);
  using limiter = createFixedWindow({
    limit: 1,
    window: 1000,
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

Deno.test("acquire() rejects permits exceeding the queue limit when the queue is non-empty with oldest-first", async () => {
  using time = new FakeTime(0);
  using limiter = createFixedWindow({
    limit: 5,
    window: 1000,
    queueLimit: 2,
  });

  limiter.tryAcquire(5);

  const queued = limiter.acquire(1);
  const lease = await limiter.acquire(3);
  assertFalse(lease.acquired);
  if (!lease.acquired) {
    assertEquals(lease.reason, "Queue limit exceeded");
  }

  time.tick(1000);
  assert((await queued).acquired);
});

Deno.test("acquire() does not evict when incoming permits exceed the queue limit with newest-first", async () => {
  using time = new FakeTime(0);
  using limiter = createFixedWindow({
    limit: 5,
    window: 1000,
    queueLimit: 2,
    queueOrder: "newest-first",
  });

  limiter.tryAcquire(5);

  const queued = limiter.acquire(1);
  const lease = await limiter.acquire(3);
  assertFalse(lease.acquired);
  if (!lease.acquired) {
    assertEquals(lease.reason, "Queue limit exceeded");
  }

  time.tick(1000);
  assert(
    (await queued).acquired,
    "queued waiter should not have been evicted",
  );
});

// --- Multi-permit queued waiters ---

Deno.test("acquire() resolves a queued multi-permit waiter after the window resets", async () => {
  using time = new FakeTime(0);
  using limiter = createFixedWindow({
    limit: 2,
    window: 1000,
    queueLimit: 10,
  });

  limiter.tryAcquire(2);

  let resolved = false;
  const promise = limiter.acquire(2).then((lease) => {
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

// --- Multiple waiters resolved in single replenishment ---

Deno.test("acquire() resolves multiple queued waiters in a single replenishment", async () => {
  using time = new FakeTime(0);
  using limiter = createFixedWindow({
    limit: 3,
    window: 1000,
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
  using limiter = createFixedWindow({ limit: 5, window: 1000 });

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
  using limiter = createFixedWindow({ limit: 5, window: 1000 });

  await assertRejects(
    () => limiter.acquire(6),
    RangeError,
    "Cannot acquire: 'permits' (6) exceeds the permit limit (5)",
  );
});

// --- Double dispose ---

Deno.test("dispose() is idempotent", () => {
  using _time = new FakeTime(0);
  const limiter = createFixedWindow({ limit: 5, window: 1000 });

  limiter[Symbol.dispose]();
  limiter[Symbol.dispose]();
});

Deno.test("replenish() after dispose is a no-op", () => {
  const limiter = createFixedWindow({
    limit: 5,
    window: 1000,
    autoReplenishment: false,
  });

  limiter[Symbol.dispose]();
  limiter.replenish();
});

// --- Lease disposal ---

Deno.test("tryAcquire() lease dispose is a no-op", () => {
  using _time = new FakeTime(0);
  using limiter = createFixedWindow({ limit: 5, window: 1000 });

  {
    using lease = limiter.tryAcquire();
    assert(lease.acquired);
  }
});

Deno.test("tryAcquire() rejected lease dispose is a no-op", () => {
  using _time = new FakeTime(0);
  using limiter = createFixedWindow({ limit: 1, window: 1000 });

  assert(limiter.tryAcquire().acquired);
  {
    using lease = limiter.tryAcquire();
    assertFalse(lease.acquired);
  }
});

// --- Signal cleanup on normal drain ---

Deno.test("acquire() drains a queued waiter with a non-aborted signal cleanly", async () => {
  using time = new FakeTime(0);
  using limiter = createFixedWindow({
    limit: 1,
    window: 1000,
    queueLimit: 5,
  });

  limiter.tryAcquire();

  const controller = new AbortController();
  const promise = limiter.acquire(1, { signal: controller.signal });

  time.tick(1000);
  const lease = await promise;
  assert(lease.acquired);

  controller.abort();
});

// --- Replenishment timer ---

Deno.test("createFixedWindow() does not start a timer when queueLimit is 0", () => {
  using time = new FakeTime(0);
  using limiter = createFixedWindow({ limit: 1, window: 1000 });
  // `next()` returns false when no timer is pending.
  assertFalse(time.next());
  limiter.tryAcquire();
  time.tick(1000);
  assert(limiter.tryAcquire().acquired);
});

Deno.test("createFixedWindow() starts a timer when queueLimit is set", () => {
  using time = new FakeTime(0);
  using _limiter = createFixedWindow({ limit: 1, window: 1000, queueLimit: 1 });
  assert(time.next());
});

// --- Timer interval cap ---

Deno.test("createFixedWindow() throws when window exceeds the timer maximum", () => {
  assertThrows(
    () => createFixedWindow({ limit: 1, window: 2 ** 31, queueLimit: 1 }),
    RangeError,
    `Cannot create fixed window: 'window' (${
      2 ** 31
    }) exceeds the maximum timer interval of ${2 ** 31 - 1} milliseconds`,
  );
});

Deno.test("createFixedWindow() accepts a window above the timer maximum when autoReplenishment is false", () => {
  using limiter = createFixedWindow({
    limit: 1,
    window: 2 ** 31,
    autoReplenishment: false,
  });
  assert(limiter.tryAcquire().acquired);
});

// --- Process lifetime ---

Deno.test("an undisposed limiter does not keep the process alive", async () => {
  const script = `
    import { createFixedWindow } from ${
    JSON.stringify(new URL("./fixed_window.ts", import.meta.url).href)
  };
    createFixedWindow({ limit: 1, window: 60_000 });
  `;
  const command = new Deno.Command(Deno.execPath(), {
    args: ["eval", "--no-lock", script],
    stderr: "inherit",
    signal: AbortSignal.timeout(30_000),
  });
  const { success } = await command.output();
  assert(success, "process did not exit with an undisposed limiter");
});
