// Copyright 2018-2026 the Deno authors. MIT license.

import {
  assert,
  assertEquals,
  assertInstanceOf,
  assertRejects,
  assertThrows,
} from "@std/assert";
import { FakeTime } from "@std/testing/time";
import {
  CircuitBreaker,
  CircuitBreakerOpenError,
  type CircuitState,
} from "./unstable_circuit_breaker.ts";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

async function failN(
  breaker: CircuitBreaker,
  n: number,
): Promise<void> {
  for (let i = 0; i < n; i++) {
    try {
      await breaker.execute(() => Promise.reject(new Error("fail")));
    } catch { /* expected */ }
  }
}

async function succeedN(
  breaker: CircuitBreaker,
  n: number,
): Promise<void> {
  for (let i = 0; i < n; i++) {
    await breaker.execute(() => Promise.resolve("ok"));
  }
}

// ---------------------------------------------------------------------------
// Validation
// ---------------------------------------------------------------------------

Deno.test("CircuitBreaker() throws for invalid rate options", () => {
  for (const value of [0, -0.1, 1.01, NaN, Infinity]) {
    assertThrows(
      () => new CircuitBreaker({ failureRateThreshold: value }),
      RangeError,
      '"failureRateThreshold" must be a finite number in (0, 1]',
    );
  }
});

Deno.test("CircuitBreaker() throws for invalid positive integer options", () => {
  const fields = [
    "minimumThroughput",
    "windowMs",
    "segmentsPerWindow",
    "successThreshold",
    "halfOpenMaxConcurrent",
  ] as const;

  for (const field of fields) {
    for (const value of [0, -1, 1.5]) {
      assertThrows(
        () => new CircuitBreaker({ [field]: value }),
        RangeError,
        `"${field}" must be a positive integer`,
      );
    }
  }
});

Deno.test("CircuitBreaker() throws for invalid cooldownMs", () => {
  for (const value of [-1, NaN, Infinity]) {
    assertThrows(
      () => new CircuitBreaker({ cooldownMs: value }),
      RangeError,
      '"cooldownMs" must be a finite non-negative number',
    );
  }
});

Deno.test("CircuitBreaker() accepts edge-case valid options", () => {
  const breaker = new CircuitBreaker({
    failureRateThreshold: 1,
    cooldownMs: 0,
  });
  assertEquals(breaker.state, "closed");
});

// ---------------------------------------------------------------------------
// Closed state basics
// ---------------------------------------------------------------------------

Deno.test("CircuitBreaker() defaults to closed state", () => {
  assertEquals(new CircuitBreaker().state, "closed");
});

Deno.test("CircuitBreaker.execute() returns result from sync and async functions", async () => {
  const breaker = new CircuitBreaker();
  assertEquals(await breaker.execute(() => "sync"), "sync");
  assertEquals(await breaker.execute(() => Promise.resolve("async")), "async");
});

Deno.test("CircuitBreaker.execute() propagates thrown errors", async () => {
  const breaker = new CircuitBreaker();
  await assertRejects(
    () => breaker.execute(() => Promise.reject(new Error("boom"))),
    Error,
    "boom",
  );
});

Deno.test("CircuitBreaker.execute() propagates synchronous throws and counts them as failures", async () => {
  const breaker = new CircuitBreaker({
    failureRateThreshold: 1,
    minimumThroughput: 1,
  });

  await assertRejects(
    () =>
      breaker.execute(() => {
        throw new Error("sync boom");
      }),
    Error,
    "sync boom",
  );
  assertEquals(breaker.state, "open");
});

// ---------------------------------------------------------------------------
// Failure-rate tripping
// ---------------------------------------------------------------------------

Deno.test("CircuitBreaker.execute() opens when failure rate meets threshold and minimum throughput", async () => {
  const breaker = new CircuitBreaker({
    failureRateThreshold: 0.5,
    minimumThroughput: 4,
    windowMs: 60_000,
    segmentsPerWindow: 1,
  });

  // 1S + 1F = 50% but only 2 requests (below minimum of 4)
  await succeedN(breaker, 1);
  await failN(breaker, 1);
  assertEquals(breaker.state, "closed");

  // 2S + 2F = 50% rate, 4 requests (meets minimum) — trips
  await succeedN(breaker, 1);
  await failN(breaker, 1);
  assertEquals(breaker.state, "open");
});

Deno.test("CircuitBreaker.execute() stays closed when rate is below threshold", async () => {
  const breaker = new CircuitBreaker({
    failureRateThreshold: 0.5,
    minimumThroughput: 4,
    windowMs: 60_000,
    segmentsPerWindow: 1,
  });

  await succeedN(breaker, 3);
  await failN(breaker, 1);
  assertEquals(breaker.state, "closed"); // 25% < 50%
});

Deno.test("CircuitBreaker.execute() throws CircuitBreakerOpenError when open", async () => {
  const breaker = new CircuitBreaker({
    failureRateThreshold: 1,
    minimumThroughput: 1,
    cooldownMs: 30_000,
  });

  await failN(breaker, 1);
  const err = await assertRejects(
    () => breaker.execute(() => Promise.resolve("ignored")),
    CircuitBreakerOpenError,
    "Circuit breaker is open: retry after",
  );
  assert(err.remainingCooldownMs > 0);
});

// ---------------------------------------------------------------------------
// Sliding window expiry
// ---------------------------------------------------------------------------

Deno.test("CircuitBreaker.execute() evicts old failures as segments rotate", async () => {
  using time = new FakeTime();

  const breaker = new CircuitBreaker({
    failureRateThreshold: 0.5,
    minimumThroughput: 2,
    windowMs: 1000,
    segmentsPerWindow: 2,
  });

  // 1 failure (below minimum)
  await failN(breaker, 1);
  assertEquals(breaker.state, "closed");

  // Advance past the full window so the failure is evicted
  time.tick(1001);

  // 1 success + 1 failure = 50% rate, 2 requests — trips
  await succeedN(breaker, 1);
  await failN(breaker, 1);
  assertEquals(breaker.state, "open");
});

Deno.test("CircuitBreaker.execute() tracks segment rotation with onFailure counts", async () => {
  using time = new FakeTime();

  const failures: Array<{ count: number; total: number }> = [];
  const breaker = new CircuitBreaker({
    failureRateThreshold: 0.8,
    minimumThroughput: 3,
    windowMs: 1000,
    segmentsPerWindow: 2,
    onFailure: (_error, count, total) => failures.push({ count, total }),
  });

  // 2 failures in first segment
  await failN(breaker, 2);
  assertEquals(failures, [{ count: 1, total: 1 }, { count: 2, total: 2 }]);

  // Advance to second segment, add 1 success (3 total, 2 failures = 66% < 80%)
  time.tick(501);
  await succeedN(breaker, 1);
  assertEquals(breaker.state, "closed");

  // Advance past first segment's lifetime (evicts the 2 failures)
  time.tick(500);

  // 1 failure here: window has only the old success + this failure
  await failN(breaker, 1);
  assertEquals(breaker.state, "closed");
  assertEquals(failures[2], { count: 1, total: 2 });
});

// ---------------------------------------------------------------------------
// Half-open transitions
// ---------------------------------------------------------------------------

Deno.test("CircuitBreaker.execute() transitions open -> half_open -> closed after cooldown and successes", async () => {
  using time = new FakeTime();

  const transitions: Array<[CircuitState, CircuitState]> = [];
  const breaker = new CircuitBreaker({
    failureRateThreshold: 1,
    minimumThroughput: 1,
    cooldownMs: 1000,
    successThreshold: 2,
    onStateChange: (from, to) => transitions.push([from, to]),
  });

  await failN(breaker, 1);
  assertEquals(breaker.state, "open");

  time.tick(1001);

  // First success enters half_open
  await breaker.execute(() => Promise.resolve("ok"));
  assertEquals(breaker.state, "half_open");

  // Second success closes
  await breaker.execute(() => Promise.resolve("ok"));
  assertEquals(breaker.state, "closed");

  assertEquals(transitions, [
    ["closed", "open"],
    ["open", "half_open"],
    ["half_open", "closed"],
  ]);
});

Deno.test("CircuitBreaker.state resolves time-based transitions lazily", async () => {
  using time = new FakeTime();

  const transitions: Array<[CircuitState, CircuitState]> = [];
  const breaker = new CircuitBreaker({
    failureRateThreshold: 1,
    minimumThroughput: 1,
    cooldownMs: 1000,
    onStateChange: (from, to) => transitions.push([from, to]),
  });

  await failN(breaker, 1);
  time.tick(1001);

  // Reading .state triggers the transition
  assertEquals(breaker.state, "half_open");
  assertEquals(transitions, [["closed", "open"], ["open", "half_open"]]);

  // Repeated reads don't re-fire
  assertEquals(breaker.state, "half_open");
  assertEquals(transitions.length, 2);
});

Deno.test("CircuitBreaker.execute() reopens from half_open on failure", async () => {
  using time = new FakeTime();

  const breaker = new CircuitBreaker({
    failureRateThreshold: 1,
    minimumThroughput: 1,
    cooldownMs: 1000,
  });

  await failN(breaker, 1);
  time.tick(1001);

  try {
    await breaker.execute(() => Promise.reject(new Error("still broken")));
  } catch { /* expected */ }

  assertEquals(breaker.state, "open");
});

Deno.test("CircuitBreaker.execute() resets consecutive successes on half_open failure", async () => {
  using time = new FakeTime();

  const breaker = new CircuitBreaker({
    failureRateThreshold: 1,
    minimumThroughput: 1,
    cooldownMs: 1000,
    successThreshold: 2,
    halfOpenMaxConcurrent: 3,
  });

  await failN(breaker, 1);
  time.tick(1001);

  // 1 success in half_open
  await breaker.execute(() => Promise.resolve("ok"));
  assertEquals(breaker.state, "half_open");

  // Failure reopens — consecutive successes reset
  try {
    await breaker.execute(() => Promise.reject(new Error("fail")));
  } catch { /* expected */ }
  assertEquals(breaker.state, "open");

  // After another cooldown, need full 2 successes again
  time.tick(1001);
  await breaker.execute(() => Promise.resolve("ok"));
  assertEquals(breaker.state, "half_open");
  await breaker.execute(() => Promise.resolve("ok"));
  assertEquals(breaker.state, "closed");
});

Deno.test("CircuitBreaker.execute() transitions immediately with cooldownMs 0", async () => {
  const breaker = new CircuitBreaker({
    failureRateThreshold: 1,
    minimumThroughput: 1,
    cooldownMs: 0,
    successThreshold: 1,
  });

  await failN(breaker, 1);
  assertEquals(breaker.state, "half_open");

  await breaker.execute(() => Promise.resolve("ok"));
  assertEquals(breaker.state, "closed");
});

// ---------------------------------------------------------------------------
// Half-open concurrency
// ---------------------------------------------------------------------------

Deno.test("CircuitBreaker.execute() limits concurrent requests in half_open", async () => {
  using time = new FakeTime();

  const breaker = new CircuitBreaker({
    failureRateThreshold: 1,
    minimumThroughput: 1,
    cooldownMs: 1000,
    halfOpenMaxConcurrent: 1,
    successThreshold: 2,
  });

  await failN(breaker, 1);
  time.tick(1001);

  let resolveFirst: (() => void) | undefined;
  const firstPromise = breaker.execute(
    () =>
      new Promise<string>((resolve) => {
        resolveFirst = () => resolve("first");
      }),
  );

  // Second request exceeds concurrency limit — rejected with remainingCooldownMs 0
  const err = await assertRejects(
    () => breaker.execute(() => Promise.resolve("second")),
    CircuitBreakerOpenError,
  );
  assertEquals(err.remainingCooldownMs, 0);

  resolveFirst?.();
  await firstPromise;
});

Deno.test("CircuitBreaker.execute() frees half_open concurrency slot on failure", async () => {
  using time = new FakeTime();

  const breaker = new CircuitBreaker({
    failureRateThreshold: 1,
    minimumThroughput: 1,
    cooldownMs: 1000,
    halfOpenMaxConcurrent: 1,
    successThreshold: 1,
  });

  await failN(breaker, 1);
  time.tick(1001);

  // First request fails — should free the slot
  try {
    await breaker.execute(() => Promise.reject(new Error("fail")));
  } catch { /* expected */ }

  // Circuit reopened, wait for cooldown again
  time.tick(1001);

  // Slot is free, this should succeed
  await breaker.execute(() => Promise.resolve("recovered"));
  assertEquals(breaker.state, "closed");
});

Deno.test("CircuitBreaker.execute() opens when a success brings the window to minimumThroughput", async () => {
  const opens: [number, number][] = [];
  const changes: string[] = [];
  const breaker = new CircuitBreaker({
    failureRateThreshold: 0.5,
    minimumThroughput: 3,
    onOpen: (failures, requests) => opens.push([failures, requests]),
    onStateChange: (from, to) => changes.push(`${from}->${to}`),
  });

  await failN(breaker, 2);
  assertEquals(breaker.state, "closed");

  await succeedN(breaker, 1);
  assertEquals(breaker.state, "open");
  assertEquals(opens, [[2, 3]]);
  assertEquals(changes, ["closed->open"]);
});

Deno.test("CircuitBreaker.execute() stays closed when a success keeps the rate below the threshold", async () => {
  const breaker = new CircuitBreaker({
    failureRateThreshold: 0.5,
    minimumThroughput: 3,
  });

  await failN(breaker, 1);
  await succeedN(breaker, 2);
  assertEquals(breaker.state, "closed");
});

Deno.test("CircuitBreaker.execute() prevents stale half_open success from closing after concurrent failure", async () => {
  using time = new FakeTime();

  const breaker = new CircuitBreaker({
    failureRateThreshold: 1,
    minimumThroughput: 1,
    cooldownMs: 1000,
    halfOpenMaxConcurrent: 2,
    successThreshold: 1,
  });

  await failN(breaker, 1);
  time.tick(1001);

  let resolveA: (() => void) | undefined;
  let rejectB: ((err: Error) => void) | undefined;

  const promiseA = breaker.execute(
    () =>
      new Promise<string>((r) => {
        resolveA = () => r("ok");
      }),
  );
  const promiseB = breaker.execute(
    () =>
      new Promise<string>((_r, rej) => {
        rejectB = (e) => rej(e);
      }),
  );

  // B fails first — reopens circuit
  rejectB?.(new Error("still broken"));
  try {
    await promiseB;
  } catch { /* expected */ }
  assertEquals(breaker.state, "open");

  // A resolves later — state is already open, success is stale
  resolveA?.();
  await promiseA;
  assertEquals(breaker.state, "open");
});

Deno.test("CircuitBreaker.execute() fires callbacks once when concurrent half_open requests both fail", async () => {
  using time = new FakeTime();

  const transitions: Array<[CircuitState, CircuitState]> = [];
  let openCallCount = 0;

  const breaker = new CircuitBreaker({
    failureRateThreshold: 1,
    minimumThroughput: 1,
    cooldownMs: 1000,
    halfOpenMaxConcurrent: 2,
    onStateChange: (from, to) => transitions.push([from, to]),
    onOpen: () => openCallCount++,
  });

  await failN(breaker, 1);
  time.tick(1001);

  let rejectA: ((e: Error) => void) | undefined;
  let rejectB: ((e: Error) => void) | undefined;

  const promiseA = breaker.execute(
    () =>
      new Promise<string>((_r, rej) => {
        rejectA = (e) => rej(e);
      }),
  );
  const promiseB = breaker.execute(
    () =>
      new Promise<string>((_r, rej) => {
        rejectB = (e) => rej(e);
      }),
  );

  rejectA?.(new Error("fail A"));
  rejectB?.(new Error("fail B"));

  try {
    await promiseA;
  } catch { /* expected */ }
  try {
    await promiseB;
  } catch { /* expected */ }

  assertEquals(breaker.state, "open");
  assertEquals(
    transitions.filter(([from, to]) => from === "half_open" && to === "open")
      .length,
    1,
  );
  assertEquals(openCallCount, 2); // 1 initial trip + 1 half_open reopen
});

// ---------------------------------------------------------------------------
// Predicates: isFailure / isResultFailure
// ---------------------------------------------------------------------------

Deno.test("CircuitBreaker.execute() filters errors with isFailure predicate", async () => {
  const failures: unknown[] = [];
  const breaker = new CircuitBreaker({
    failureRateThreshold: 0.5,
    minimumThroughput: 1,
    isFailure: (error) => !(error instanceof TypeError),
    onFailure: (error) => failures.push(error),
  });

  // TypeError is excluded — not counted as failure, but still a request
  try {
    await breaker.execute(() => Promise.reject(new TypeError("ignored")));
  } catch { /* expected */ }
  assertEquals(failures.length, 0);
  assertEquals(breaker.state, "closed");

  // Regular Error is counted — 1 failure / 2 total = 50%, meets 0.5 threshold
  try {
    await breaker.execute(() => Promise.reject(new Error("counted")));
  } catch { /* expected */ }
  assertEquals(failures.length, 1);
  assertEquals(breaker.state, "open");
});

Deno.test("CircuitBreaker.execute() counts results as failures via isResultFailure and still returns the result", async () => {
  const failures: unknown[] = [];
  const breaker = new CircuitBreaker<number>({
    failureRateThreshold: 0.5,
    minimumThroughput: 1,
    isResultFailure: (result) => result < 0,
    onFailure: (error) => failures.push(error),
  });

  // Positive result — not a failure
  assertEquals(await breaker.execute(() => 42), 42);
  assertEquals(breaker.state, "closed");

  // Negative result — counted as failure, but result is still returned
  assertEquals(await breaker.execute(() => Promise.resolve(-1)), -1);
  assertEquals(breaker.state, "open");

  // onFailure receives the synthetic error
  assertEquals(failures.length, 1);
  assertInstanceOf(failures[0], Error);
});

Deno.test("CircuitBreaker.execute() reopens circuit via isResultFailure in half_open", async () => {
  using time = new FakeTime();

  const breaker = new CircuitBreaker<number>({
    failureRateThreshold: 1,
    minimumThroughput: 1,
    cooldownMs: 1000,
    isResultFailure: (result) => result < 0,
  });

  try {
    await breaker.execute(() => Promise.reject(new Error("fail")));
  } catch { /* expected */ }

  time.tick(1001);

  const result = await breaker.execute(() => Promise.resolve(-1));
  assertEquals(result, -1);
  assertEquals(breaker.state, "open");
});

// ---------------------------------------------------------------------------
// Predicate error isolation
// ---------------------------------------------------------------------------

Deno.test("CircuitBreaker.execute() isolates isFailure predicate errors and still throws original error", async () => {
  const asyncErrors: Error[] = [];
  const predicateError = new Error("isFailure bug");

  const onError = (event: ErrorEvent) => {
    event.preventDefault();
    asyncErrors.push(event.error);
  };
  globalThis.addEventListener("error", onError);

  try {
    const breaker = new CircuitBreaker({
      isFailure: () => {
        throw predicateError;
      },
    });

    const originalError = new Error("service down");
    await assertRejects(
      () => breaker.execute(() => Promise.reject(originalError)),
      Error,
      "service down",
    );

    await new Promise<void>((resolve) => queueMicrotask(resolve));
    assertEquals(asyncErrors.length, 1);
    assertEquals(asyncErrors[0], predicateError);
  } finally {
    globalThis.removeEventListener("error", onError);
  }
});

Deno.test("CircuitBreaker.execute() isolates isResultFailure predicate errors and still returns result", async () => {
  const asyncErrors: Error[] = [];
  const predicateError = new Error("isResultFailure bug");

  const onError = (event: ErrorEvent) => {
    event.preventDefault();
    asyncErrors.push(event.error);
  };
  globalThis.addEventListener("error", onError);

  try {
    const breaker = new CircuitBreaker<string>({
      isResultFailure: () => {
        throw predicateError;
      },
    });

    const result = await breaker.execute(() => Promise.resolve("ok"));
    assertEquals(result, "ok");

    await new Promise<void>((resolve) => queueMicrotask(resolve));
    assertEquals(asyncErrors.length, 1);
    assertEquals(asyncErrors[0], predicateError);
  } finally {
    globalThis.removeEventListener("error", onError);
  }
});

// ---------------------------------------------------------------------------
// forceOpen / forceClose / reset
// ---------------------------------------------------------------------------

Deno.test("CircuitBreaker.forceOpen() opens the circuit from any state", () => {
  using time = new FakeTime();

  const transitions: Array<[CircuitState, CircuitState]> = [];
  const openCalls: Array<{ failures: number; total: number }> = [];
  const breaker = new CircuitBreaker({
    failureRateThreshold: 1,
    minimumThroughput: 1,
    cooldownMs: 1000,
    onStateChange: (from, to) => transitions.push([from, to]),
    onOpen: (failures, total) => openCalls.push({ failures, total }),
  });

  // From closed
  breaker.forceOpen();
  assertEquals(breaker.state, "open");
  assertEquals(openCalls, [{ failures: 0, total: 0 }]);

  // Duplicate — no extra callback
  breaker.forceOpen();
  assertEquals(openCalls.length, 1);

  // From half_open
  time.tick(1001);
  assertEquals(breaker.state, "half_open");
  breaker.forceOpen();
  assertEquals(breaker.state, "open");
  assertEquals(transitions, [
    ["closed", "open"],
    ["open", "half_open"],
    ["half_open", "open"],
  ]);
});

Deno.test("CircuitBreaker.forceClose() closes the circuit from any state", async () => {
  using time = new FakeTime();

  const transitions: Array<[CircuitState, CircuitState]> = [];
  let closeCalled = 0;
  const breaker = new CircuitBreaker({
    failureRateThreshold: 1,
    minimumThroughput: 1,
    cooldownMs: 1000,
    onStateChange: (from, to) => transitions.push([from, to]),
    onClose: () => closeCalled++,
  });

  // From closed — no callback
  breaker.forceClose();
  assertEquals(closeCalled, 0);

  // From open
  await failN(breaker, 1);
  breaker.forceClose();
  assertEquals(breaker.state, "closed");
  assertEquals(closeCalled, 1);

  // From half_open
  await failN(breaker, 1);
  time.tick(1001);
  assertEquals(breaker.state, "half_open");
  breaker.forceClose();
  assertEquals(breaker.state, "closed");
  assertEquals(closeCalled, 2);
});

Deno.test("CircuitBreaker.reset() silently resets without invoking callbacks", async () => {
  const transitions: Array<[CircuitState, CircuitState]> = [];
  let closeCalled = false;
  const breaker = new CircuitBreaker({
    failureRateThreshold: 1,
    minimumThroughput: 1,
    onStateChange: (from, to) => transitions.push([from, to]),
    onClose: () => closeCalled = true,
  });

  await failN(breaker, 1);
  assertEquals(breaker.state, "open");

  breaker.reset();
  assertEquals(breaker.state, "closed");
  assertEquals(transitions, [["closed", "open"]]);
  assertEquals(closeCalled, false);
});

// ---------------------------------------------------------------------------
// Callbacks
// ---------------------------------------------------------------------------

Deno.test("CircuitBreaker.execute() invokes onFailure with correct counts", async () => {
  const failures: Array<{ error: unknown; count: number; total: number }> = [];
  const breaker = new CircuitBreaker({
    failureRateThreshold: 1,
    minimumThroughput: 10,
    windowMs: 60_000,
    segmentsPerWindow: 1,
    onFailure: (error, count, total) => failures.push({ error, count, total }),
  });

  const err1 = new Error("fail1");
  const err2 = new Error("fail2");
  try {
    await breaker.execute(() => Promise.reject(err1));
  } catch { /* expected */ }
  try {
    await breaker.execute(() => Promise.reject(err2));
  } catch { /* expected */ }

  assertEquals(failures, [
    { error: err1, count: 1, total: 1 },
    { error: err2, count: 2, total: 2 },
  ]);
});

Deno.test("CircuitBreaker.execute() invokes onOpen with failure counts", async () => {
  const openCalls: Array<{ failures: number; total: number }> = [];
  const breaker = new CircuitBreaker({
    failureRateThreshold: 0.5,
    minimumThroughput: 2,
    windowMs: 60_000,
    segmentsPerWindow: 1,
    onOpen: (failures, total) => openCalls.push({ failures, total }),
  });

  await failN(breaker, 2);
  assertEquals(openCalls, [{ failures: 2, total: 2 }]);
});

Deno.test("CircuitBreaker.execute() invokes onHalfOpen and onClose callbacks", async () => {
  using time = new FakeTime();

  let halfOpenCalled = false;
  let closeCalled = false;
  const breaker = new CircuitBreaker({
    failureRateThreshold: 1,
    minimumThroughput: 1,
    cooldownMs: 1000,
    successThreshold: 1,
    onHalfOpen: () => halfOpenCalled = true,
    onClose: () => closeCalled = true,
  });

  await failN(breaker, 1);
  assertEquals(halfOpenCalled, false);

  time.tick(1001);
  await breaker.execute(() => Promise.resolve("ok"));

  assertEquals(halfOpenCalled, true);
  assertEquals(closeCalled, true);
});

// ---------------------------------------------------------------------------
// Abort signal
// ---------------------------------------------------------------------------

Deno.test("CircuitBreaker.execute() rejects immediately if signal already aborted", async () => {
  const breaker = new CircuitBreaker();
  const controller = new AbortController();
  controller.abort();

  let fnCalled = false;
  await assertRejects(
    () =>
      breaker.execute(() => {
        fnCalled = true;
        return Promise.resolve("ignored");
      }, { signal: controller.signal }),
    DOMException,
    "aborted",
  );

  assertEquals(fnCalled, false);
  assertEquals(breaker.state, "closed");
});

// ---------------------------------------------------------------------------
// Callback error isolation
// ---------------------------------------------------------------------------

Deno.test("CircuitBreaker callbacks that throw are reported asynchronously without disrupting operation", async () => {
  const asyncErrors: Error[] = [];
  const callbackError = new Error("callback bug");

  const onError = (event: ErrorEvent) => {
    event.preventDefault();
    asyncErrors.push(event.error);
  };
  globalThis.addEventListener("error", onError);

  try {
    const breaker = new CircuitBreaker({
      failureRateThreshold: 1,
      minimumThroughput: 1,
      onFailure: () => {
        throw callbackError;
      },
    });

    const originalError = new Error("service down");
    await assertRejects(
      () => breaker.execute(() => Promise.reject(originalError)),
      Error,
      "service down",
    );

    await new Promise<void>((resolve) => queueMicrotask(resolve));

    assertEquals(breaker.state, "open");
    assertEquals(asyncErrors.length, 1);
    assertEquals(asyncErrors[0], callbackError);
  } finally {
    globalThis.removeEventListener("error", onError);
  }
});

Deno.test("CircuitBreaker onStateChange that throws is reported asynchronously", async () => {
  const asyncErrors: Error[] = [];
  const callbackError = new Error("state change bug");

  const onError = (event: ErrorEvent) => {
    event.preventDefault();
    asyncErrors.push(event.error);
  };
  globalThis.addEventListener("error", onError);

  try {
    const breaker = new CircuitBreaker({
      onStateChange: () => {
        throw callbackError;
      },
    });

    breaker.forceOpen();
    await new Promise<void>((resolve) => queueMicrotask(resolve));

    assertEquals(breaker.state, "open");
    assertEquals(asyncErrors.length, 1);
    assertEquals(asyncErrors[0], callbackError);
  } finally {
    globalThis.removeEventListener("error", onError);
  }
});

// ---------------------------------------------------------------------------
// CircuitBreakerOpenError
// ---------------------------------------------------------------------------

Deno.test("CircuitBreakerOpenError() has correct properties", () => {
  const error = new CircuitBreakerOpenError(5000);

  assertEquals(error.name, "CircuitBreakerOpenError");
  assertEquals(error.remainingCooldownMs, 5000);
  assert(error.message.includes("5000ms"));
  assertInstanceOf(error, Error);
});
