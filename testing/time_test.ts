// Copyright 2018-2026 the Deno authors. MIT license.
import {
  assert,
  assertAlmostEquals,
  assertEquals,
  assertInstanceOf,
  assertMatch,
  assertNotEquals,
  assertRejects,
  assertStrictEquals,
  assertThrows,
} from "@std/assert";
import { FakeTime, TimeError } from "./time.ts";
import { _internals } from "./_time.ts";
import { assertSpyCall, spy, type SpyCall } from "./mock.ts";
import { deadline, delay } from "@std/async";

function fromNow(): (..._args: unknown[]) => number {
  const start: number = Date.now();
  return () => Date.now() - start;
}

Deno.test("FakeTime doesn't affect Date unchanged if uninitialized", () => {
  assertStrictEquals(Date, _internals.Date);
});

Deno.test("FakeTime fakes Date", () => {
  {
    using _time = new FakeTime(9001);
    assertNotEquals(Date, _internals.Date);
  }
  assertStrictEquals(Date, _internals.Date);
});

Deno.test("FakeTime causes date parse and UTC behave the same", () => {
  const expectedUTC = Date.UTC(96, 1, 2, 3, 4, 5);
  const expectedParse = Date.parse("04 Dec 1995 00:12:00 GMT");

  using _time = new FakeTime();
  assertEquals(
    Date.UTC(96, 1, 2, 3, 4, 5),
    expectedUTC,
  );
  assertEquals(
    Date.parse("04 Dec 1995 00:12:00 GMT"),
    expectedParse,
  );
});

Deno.test("FakeTime causes Date.now() returns current fake time", () => {
  const time: FakeTime = new FakeTime(9001);
  const now = spy(_internals.Date, "now");
  try {
    try {
      assertEquals(Date.now(), 9001);
      assertEquals(now.calls.length, 0);
      time.tick(1523);
      assertEquals(Date.now(), 10524);
      assertEquals(now.calls.length, 0);
    } finally {
      time.restore();
    }
    assertNotEquals(Date.now(), 10524);
    assertEquals(now.calls.length, 1);
  } finally {
    now.restore();
  }
});

Deno.test("FakeTime causes Date instance methods passthrough to real Date instance methods", () => {
  using _time = new FakeTime();
  const now = new Date("2020-05-25T05:00:00.12345Z");
  assertEquals(now.toISOString(), "2020-05-25T05:00:00.123Z");

  const func1 = spy(
    _internals.Date.prototype,
    "toISOString",
  );
  try {
    now.toISOString();
    assertSpyCall(func1, 0, {
      args: [],
      returned: "2020-05-25T05:00:00.123Z",
    });
    assertInstanceOf(func1.calls?.[0]?.self, _internals.Date);
  } finally {
    func1.restore();
  }

  const func2 = spy(
    _internals.Date.prototype,
    Symbol.toPrimitive,
  );
  try {
    Number(now);
    assertSpyCall(func2, 0, {
      args: ["number"],
      returned: 1590382800123,
    });
  } finally {
    func2.restore();
  }
});

Deno.test("FakeTime causes Date function to return the string representation of the current faked time", () => {
  using _time = new FakeTime(24 * 60 * 60 * 1000);
  assertMatch(Date(), /(Fri|Thu) Jan 0(1|2) 1970/);
});

Deno.test("FakeTime preserves the prototype of Date subclasses", () => {
  using _time = new FakeTime(24 * 60 * 60 * 1000);
  class MyDate extends Date {
    tag = "x";
  }
  const date = new MyDate();
  assertInstanceOf(date, MyDate);
  assertStrictEquals(Object.getPrototypeOf(date), MyDate.prototype);
  assertEquals(date.tag, "x");
  assertEquals(date.toISOString(), "1970-01-02T00:00:00.000Z");
  assertEquals(new MyDate(1000).getTime(), 1000);
});

Deno.test("FakeTime causes new Date() to track the fake clock", () => {
  using time = new FakeTime(9001);
  assertEquals(new Date().getTime(), time.now);
  time.tick(5000);
  assertEquals(new Date().getTime(), time.now);
});

Deno.test("FakeTime passes explicit undefined through to Date", () => {
  using _time = new FakeTime(9001);
  assert(Number.isNaN(new Date(undefined as unknown as number).getTime()));
});

Deno.test("FakeTime constructor captured while faked works after restore", () => {
  let Captured: DateConstructor;
  let CapturedSub: new () => Date;
  {
    using _time = new FakeTime(9001);
    Captured = Date;
    CapturedSub = class extends Date {};
  }
  const before = _internals.Date.now();
  const date = new Captured();
  const sub = new CapturedSub();
  assert(date.getTime() >= before);
  assert(sub.getTime() >= before);
  assertInstanceOf(sub, CapturedSub);
});

Deno.test("FakeTime timeout functions unchanged if FakeTime is uninitialized", () => {
  assertStrictEquals(setTimeout, _internals.setTimeout);
  assertStrictEquals(clearTimeout, _internals.clearTimeout);
});

Deno.test("FakeTime timeout functions are fake if FakeTime is initialized", () => {
  {
    using _time: FakeTime = new FakeTime();
    assertNotEquals(setTimeout, _internals.setTimeout);
    assertNotEquals(clearTimeout, _internals.clearTimeout);
  }
  assertStrictEquals(setTimeout, _internals.setTimeout);
  assertStrictEquals(clearTimeout, _internals.clearTimeout);
});

Deno.test("FakeTime only ticks forward when setting now or calling tick", () => {
  using time: FakeTime = new FakeTime();
  const start: number = Date.now();

  assertEquals(Date.now(), start);
  time.tick(5);
  assertEquals(Date.now(), start + 5);
  time.now = start + 1000;
  assertEquals(Date.now(), start + 1000);
  assert(_internals.Date.now() < start + 1000);
});

Deno.test("FakeTime controls timeouts", () => {
  using time: FakeTime = new FakeTime();
  const start: number = Date.now();
  const cb = spy(fromNow());
  const expected: SpyCall[] = [];

  setTimeout(cb, 1000);
  time.tick(250);
  assertEquals(cb.calls, expected);
  time.tick(250);
  assertEquals(cb.calls, expected);
  time.tick(500);
  expected.push({ args: [], returned: 1000 });
  assertEquals(cb.calls, expected);
  time.tick(2500);
  assertEquals(cb.calls, expected);

  setTimeout(cb, 1000, "a");
  setTimeout(cb, 2000, "b");
  setTimeout(cb, 1500, "c");
  assertEquals(cb.calls, expected);
  time.tick(2500);
  expected.push({ args: ["a"], returned: 4500 });
  expected.push({ args: ["c"], returned: 5000 });
  expected.push({ args: ["b"], returned: 5500 });
  assertEquals(cb.calls, expected);

  setTimeout(cb, 1000, "a");
  setTimeout(cb, 1500, "b");
  const timeout = setTimeout(cb, 1750, "c");
  setTimeout(cb, 2000, "d");
  time.tick(1250);
  expected.push({ args: ["a"], returned: 7000 });
  assertEquals(cb.calls, expected);
  assertEquals(Date.now(), start + 7250);
  clearTimeout(timeout);
  time.tick(500);
  expected.push({ args: ["b"], returned: 7500 });
  assertEquals(cb.calls, expected);
  assertEquals(Date.now(), start + 7750);
  time.tick(250);
  expected.push({ args: ["d"], returned: 8000 });
  assertEquals(cb.calls, expected);
});

Deno.test("FakeTime interval functions unchanged if FakeTime is uninitialized", () => {
  assertStrictEquals(setInterval, _internals.setInterval);
  assertStrictEquals(clearInterval, _internals.clearInterval);
});

Deno.test("FakeTime fakes interval functions", () => {
  {
    using _time: FakeTime = new FakeTime();
    assertNotEquals(setInterval, _internals.setInterval);
    assertNotEquals(clearInterval, _internals.clearInterval);
  }
  assertStrictEquals(setInterval, _internals.setInterval);
  assertStrictEquals(clearInterval, _internals.clearInterval);
});

Deno.test("FakeTime controls intervals", () => {
  using time: FakeTime = new FakeTime();
  const cb = spy(fromNow());
  const expected: SpyCall[] = [];

  const interval = setInterval(cb, 1000);
  time.tick(250);
  assertEquals(cb.calls, expected);
  time.tick(250);
  assertEquals(cb.calls, expected);
  time.tick(500);
  expected.push({ args: [], returned: 1000 });
  assertEquals(cb.calls, expected);
  time.tick(2500);
  expected.push({ args: [], returned: 2000 });
  expected.push({ args: [], returned: 3000 });
  assertEquals(cb.calls, expected);

  clearInterval(interval);
  time.tick(1000);
  assertEquals(cb.calls, expected);
});

Deno.test("FakeTime calls timeout and interval callbacks in correct order", () => {
  using time: FakeTime = new FakeTime();
  const cb = spy(fromNow());
  const timeoutCb = spy(cb);
  const intervalCb = spy(cb);
  const expected: SpyCall[] = [];
  const timeoutExpected: SpyCall[] = [];
  const intervalExpected: SpyCall[] = [];

  const interval = setInterval(intervalCb, 1000);
  setTimeout(timeoutCb, 500);
  time.tick(250);
  assertEquals(intervalCb.calls, intervalExpected);
  time.tick(250);
  setTimeout(timeoutCb, 1000);
  let expect: SpyCall = { args: [], returned: 500 };
  expected.push(expect);
  timeoutExpected.push(expect);
  assertEquals(cb.calls, expected);
  assertEquals(timeoutCb.calls, timeoutExpected);
  assertEquals(cb.calls, expected);
  assertEquals(intervalCb.calls, intervalExpected);
  time.tick(500);
  expect = { args: [], returned: 1000 };
  expected.push(expect);
  intervalExpected.push(expect);
  assertEquals(cb.calls, expected);
  assertEquals(intervalCb.calls, intervalExpected);
  time.tick(2500);
  expect = { args: [], returned: 1500 };
  expected.push(expect);
  timeoutExpected.push(expect);
  expect = { args: [], returned: 2000 };
  expected.push(expect);
  intervalExpected.push(expect);
  expect = { args: [], returned: 3000 };
  expected.push(expect);
  intervalExpected.push(expect);
  assertEquals(cb.calls, expected);
  assertEquals(timeoutCb.calls, timeoutExpected);
  assertEquals(intervalCb.calls, intervalExpected);

  clearInterval(interval);
  time.tick(1000);
  assertEquals(cb.calls, expected);
  assertEquals(timeoutCb.calls, timeoutExpected);
  assertEquals(intervalCb.calls, intervalExpected);
});

Deno.test("FakeTime.restoreFor() restores real time temporarily", async () => {
  using time: FakeTime = new FakeTime();
  const start: number = Date.now();

  assertEquals(Date.now(), start);
  time.tick(1000);
  assertEquals(Date.now(), start + 1000);
  assert(_internals.Date.now() < start + 1000);
  await FakeTime.restoreFor(() => {
    assert(Date.now() < start + 1000);
  });
  assertEquals(Date.now(), start + 1000);
  assert(_internals.Date.now() < start + 1000);
});

Deno.test("FakeTime.restoreFor() restores real time and re-overridden atomically", async () => {
  using _time: FakeTime = new FakeTime();
  const fakeSetTimeout = setTimeout;
  const actualSetTimeouts: (typeof setTimeout)[] = [];

  const asyncFn = async () => {
    actualSetTimeouts.push(setTimeout);
    await Promise.resolve();
    actualSetTimeouts.push(setTimeout);
    await Promise.resolve();
    actualSetTimeouts.push(setTimeout);
  };
  const promise = asyncFn();
  await new Promise((resolve) => {
    FakeTime.restoreFor(() => setTimeout(resolve, 0));
  });
  await promise;
  assertEquals(actualSetTimeouts, [
    fakeSetTimeout,
    fakeSetTimeout,
    fakeSetTimeout,
  ]);
});

Deno.test("FakeTime.restoreFor() returns promise that resolved to result of callback", async () => {
  using _time: FakeTime = new FakeTime();

  const resultSync = await FakeTime.restoreFor(() => "a");
  assertEquals(resultSync, "a");
  const resultAsync = await FakeTime.restoreFor(() => Promise.resolve("b"));
  assertEquals(resultAsync, "b");
});

Deno.test("FakeTime.restoreFor() returns promise that rejected to error in callback", async () => {
  using _time: FakeTime = new FakeTime();

  await assertRejects(
    () =>
      FakeTime.restoreFor(() => {
        throw new Error("Error in sync callback");
      }),
    Error,
    "Error in sync callback",
  );
  await assertRejects(
    () =>
      FakeTime.restoreFor(() => {
        return Promise.reject(new Error("Error in async callback"));
      }),
    Error,
    "Error in async callback",
  );
});

Deno.test("FakeTime.restoreFor() returns promise that rejected to TimeError if FakeTime is uninitialized", async () => {
  await assertRejects(
    () => FakeTime.restoreFor(() => {}),
    TimeError,
    "Cannot restore time: time is not faked",
  );
});

Deno.test("FakeTime.delay() uses real time", async () => {
  using time: FakeTime = new FakeTime();
  const start: number = Date.now();

  assertEquals(Date.now(), start);
  await time.delay(20);
  assert(_internals.Date.now() >= start + 20);
  assertEquals(Date.now(), start);
});

Deno.test("FakeTime.delay() runs all microtasks before resolving", async () => {
  using time: FakeTime = new FakeTime();

  const seq = [];
  queueMicrotask(() => seq.push(2));
  queueMicrotask(() => seq.push(3));
  seq.push(1);
  await time.delay(20);
  seq.push(4);
  assertEquals(seq, [1, 2, 3, 4]);
});

Deno.test("FakeTime.delay() works with abort", async () => {
  using time: FakeTime = new FakeTime();

  const seq = [];
  const abort = new AbortController();
  const { signal } = abort;
  const delayedPromise = time.delay(100, { signal });
  seq.push(1);
  await FakeTime.restoreFor(() => {
    setTimeout(() => {
      seq.push(2);
      abort.abort();
    }, 0);
  });
  await assertRejects(
    () => delayedPromise,
    DOMException,
    "Delay was aborted",
  );
  seq.push(3);
  assertEquals(seq, [1, 2, 3]);
});

Deno.test("FakeTime.runMicrotasks() runs all microtasks before resolving", async () => {
  using time: FakeTime = new FakeTime();
  const start: number = Date.now();

  const seq = [];
  queueMicrotask(() => seq.push(2));
  queueMicrotask(() => seq.push(3));
  seq.push(1);
  await time.runMicrotasks();
  seq.push(4);
  assertEquals(seq, [1, 2, 3, 4]);
  assertEquals(Date.now(), start);
});

Deno.test("FakeTime.tickAsync() runs all microtasks and runs timers if ticks past due", async () => {
  using time: FakeTime = new FakeTime();
  const start: number = Date.now();
  const cb = spy(fromNow());
  const expected: SpyCall[] = [];
  const seq: number[] = [];

  setTimeout(cb, 1000);
  queueMicrotask(() => seq.push(2));
  queueMicrotask(() => seq.push(3));
  seq.push(1);
  await time.tickAsync(250);
  seq.push(4);
  assertEquals(cb.calls, expected);
  await time.tickAsync(250);
  assertEquals(cb.calls, expected);
  queueMicrotask(() => seq.push(6));
  seq.push(5);
  await time.tickAsync(500);
  seq.push(7);
  expected.push({ args: [], returned: 1000 });
  assertEquals(cb.calls, expected);
  assertEquals(Date.now(), start + 1000);
  assertEquals(seq, [1, 2, 3, 4, 5, 6, 7]);
});

Deno.test("FakeTime.next() runs next timer without running microtasks", async () => {
  using time: FakeTime = new FakeTime();
  const start: number = Date.now();
  const cb = spy(fromNow());
  const seq: number[] = [];

  // Callback is called by `next`.
  setTimeout(cb, 1000);
  queueMicrotask(() => seq.push(3));
  queueMicrotask(() => seq.push(4));
  seq.push(1);
  const hasNextTimer = time.next();
  seq.push(2);

  assertEquals(hasNextTimer, true);
  const expectedCalls = [{ args: [] as [], returned: 1000 }];
  assertEquals(cb.calls, expectedCalls);
  assertEquals(Date.now(), start + 1000);
  await time.runMicrotasks();

  // Callback is already called before `next` called.
  queueMicrotask(() => seq.push(7));
  queueMicrotask(() => seq.push(8));
  seq.push(5);
  const hasNextTimerAfterCalled = time.next();
  seq.push(6);
  await time.runMicrotasks();

  assertEquals(hasNextTimerAfterCalled, false);
  assertEquals(cb.calls, expectedCalls);
  assertEquals(Date.now(), start + 1000);

  // Callbacks are cleared before `next` called.
  const id1 = setTimeout(cb, 1000);
  const id2 = setTimeout(cb, 2000);
  clearTimeout(id1);
  clearTimeout(id2);
  queueMicrotask(() => seq.push(11));
  queueMicrotask(() => seq.push(12));
  seq.push(9);
  const hasNextTimerAfterCleared = time.next();
  seq.push(10);
  await time.runMicrotasks();

  assertEquals(hasNextTimerAfterCleared, false);
  assertEquals(cb.calls, expectedCalls);
  assertEquals(Date.now(), start + 1000);

  // Callback is partially cleared before `next` called.
  const id3 = setTimeout(cb, 1500);
  setTimeout(cb, 1500);
  clearTimeout(id3);
  queueMicrotask(() => seq.push(15));
  queueMicrotask(() => seq.push(16));
  seq.push(13);
  const hasNextTimerAfterPartiallyCleared = time.next();
  seq.push(14);
  await time.runMicrotasks();

  assertEquals(hasNextTimerAfterPartiallyCleared, true);
  const expectedCalls2 = [
    { args: [] as [], returned: 1000 },
    { args: [] as [], returned: 1000 + 1500 },
  ];
  assertEquals(cb.calls, expectedCalls2);
  assertEquals(Date.now(), start + 1000 + 1500);

  assertEquals(seq, [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16]);
});

Deno.test("FakeTime.nextAsync() runs all microtasks and next timer", async () => {
  using time: FakeTime = new FakeTime();
  const start: number = Date.now();
  const cb = spy(fromNow());
  const seq: number[] = [];

  // Callback is called by `nextAsync`.
  setTimeout(cb, 1000);
  queueMicrotask(() => seq.push(2));
  queueMicrotask(() => seq.push(3));
  seq.push(1);
  const hasNextTimer = await time.nextAsync();
  seq.push(4);

  assertEquals(hasNextTimer, true);
  const expectedCalls = [{ args: [] as [], returned: 1000 }];
  assertEquals(cb.calls, expectedCalls);
  assertEquals(Date.now(), start + 1000);

  // Callback is already called before `nextAsync` called.
  queueMicrotask(() => seq.push(6));
  queueMicrotask(() => seq.push(7));
  seq.push(5);
  const hasNextTimerAfterCalled = await time.nextAsync();
  seq.push(8);

  assertEquals(hasNextTimerAfterCalled, false);
  assertEquals(cb.calls, expectedCalls);
  assertEquals(Date.now(), start + 1000);

  // Callbacks are cleared before `nextAsync` called.
  const id1 = setTimeout(cb, 1000);
  const id2 = setTimeout(cb, 2000);
  clearTimeout(id1);
  clearTimeout(id2);
  queueMicrotask(() => seq.push(10));
  queueMicrotask(() => seq.push(11));
  seq.push(9);
  const hasNextTimerAfterCleared = await time.nextAsync();
  seq.push(12);

  assertEquals(hasNextTimerAfterCleared, false);
  assertEquals(cb.calls, expectedCalls);
  assertEquals(Date.now(), start + 1000);

  // Callback is partially cleared before `nextAsync` called.
  const id3 = setTimeout(cb, 1500);
  setTimeout(cb, 1500);
  clearTimeout(id3);
  queueMicrotask(() => seq.push(14));
  queueMicrotask(() => seq.push(15));
  seq.push(13);
  const hasNextTimerAfterPartiallyCleared = await time.nextAsync();
  seq.push(16);
  await time.runMicrotasks();

  assertEquals(hasNextTimerAfterPartiallyCleared, true);
  const expectedCalls2 = [
    { args: [] as [], returned: 1000 },
    { args: [] as [], returned: 1000 + 1500 },
  ];
  assertEquals(cb.calls, expectedCalls2);
  assertEquals(Date.now(), start + 1000 + 1500);

  assertEquals(seq, [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16]);
});

Deno.test("FakeTime.runAll() runs all timers without running microtasks", async () => {
  using time: FakeTime = new FakeTime();
  const start: number = Date.now();
  const cb = spy(fromNow());
  const seq: number[] = [];

  setTimeout(cb, 1000);
  setTimeout(cb, 1500);
  queueMicrotask(() => seq.push(3));
  queueMicrotask(() => seq.push(4));
  seq.push(1);
  time.runAll();
  seq.push(2);
  const expectedCalls = [
    { args: [] as [], returned: 1000 },
    { args: [] as [], returned: 1500 },
  ];
  assertEquals(cb.calls, expectedCalls);
  assertEquals(Date.now(), start + 1500);
  await time.runMicrotasks();

  queueMicrotask(() => seq.push(7));
  queueMicrotask(() => seq.push(8));
  seq.push(5);
  time.runAll();
  seq.push(6);
  await time.runMicrotasks();

  assertEquals(cb.calls, expectedCalls);
  assertEquals(Date.now(), start + 1500);
  assertEquals(seq, [1, 2, 3, 4, 5, 6, 7, 8]);
});

Deno.test("FakeTime.runAllAsync() runs all microtasks and timers", async () => {
  using time: FakeTime = new FakeTime();
  const start: number = Date.now();
  const cb = spy(fromNow());
  const seq: number[] = [];

  setTimeout(cb, 1000);
  setTimeout(cb, 1500);
  queueMicrotask(() => seq.push(2));
  queueMicrotask(() => seq.push(3));
  seq.push(1);
  await time.runAllAsync();
  seq.push(4);
  const expectedCalls = [
    { args: [] as [], returned: 1000 },
    { args: [] as [], returned: 1500 },
  ];
  assertEquals(cb.calls, expectedCalls);
  assertEquals(Date.now(), start + 1500);

  queueMicrotask(() => seq.push(6));
  queueMicrotask(() => seq.push(7));
  seq.push(5);
  await time.runAllAsync();
  seq.push(8);

  assertEquals(cb.calls, expectedCalls);
  assertEquals(Date.now(), start + 1500);
  assertEquals(seq, [1, 2, 3, 4, 5, 6, 7, 8]);
});

const Date_ = Date;

Deno.test("Date from FakeTime is structured cloneable", () => {
  using _time: FakeTime = new FakeTime();
  const date: Date = new Date();
  assert(date instanceof Date);
  assert(date instanceof Date_);
  const cloned: Date = structuredClone(date);
  assertEquals(cloned.getTime(), date.getTime());
  assert(date instanceof Date);
  assert(cloned instanceof Date_);
});

Deno.test("new FakeTime() throws if the time is already faked", () => {
  using _time = new FakeTime();
  assertThrows(() => new FakeTime());
});

Deno.test("Faked timer functions throws when called after FakeTime is restored", () => {
  let fakeSetTimeout: typeof setTimeout;
  let fakeClearTimeout: typeof clearTimeout;
  let fakeSetInterval: typeof setInterval;
  let fakeClearInterval: typeof clearInterval;
  {
    using _time: FakeTime = new FakeTime();
    fakeSetTimeout = setTimeout;
    fakeClearTimeout = clearTimeout;
    fakeSetInterval = setInterval;
    fakeClearInterval = clearInterval;
  }
  assertThrows(
    () => fakeSetTimeout(() => {}, 0),
    TimeError,
    "Cannot set timeout: time is not faked",
  );
  assertThrows(
    () => fakeClearTimeout(0),
    TimeError,
    "Cannot clear timeout: time is not faked",
  );
  assertThrows(
    () => fakeSetInterval(() => {}, 0),
    TimeError,
    "Cannot set interval: time is not faked",
  );
  assertThrows(
    () => fakeClearInterval(0),
    TimeError,
    "Cannot clear interval: time is not faked",
  );
});

Deno.test("Faked Date.now returns real time after FakeTime is restored", () => {
  let fakeDateNow: typeof Date.now;
  {
    using _time: FakeTime = new FakeTime();
    fakeDateNow = Date.now;
  }
  assertAlmostEquals(Date.now(), fakeDateNow());
});

Deno.test("FakeTime can be constructed with number, Date, or string", () => {
  {
    using _time = new FakeTime(1000);
    assertEquals(Date.now(), 1000);
  }

  {
    using _time = new FakeTime(new Date(2000));
    assertEquals(Date.now(), 2000);
  }

  {
    using _time = new FakeTime("Thu Jan 01 1970 00:00:03 GMT+0000");
    assertEquals(Date.now(), 3000);
  }
});

Deno.test("FakeTime throws when NaN is provided", () => {
  assertThrows(
    () => new FakeTime(NaN),
    TypeError,
    "Cannot construct FakeTime: invalid start time NaN",
  );
});

Deno.test("FakeTime.restore() throws when the time is already restored", () => {
  const _time = new FakeTime();
  FakeTime.restore();
  assertThrows(
    () => FakeTime.restore(),
    TimeError,
    "Cannot restore time: time is already restored",
  );
});

Deno.test("time.restore() throws when the time is already restored", () => {
  const time = new FakeTime();
  time.restore();
  assertThrows(
    () => time.restore(),
    TimeError,
    "Cannot restore time: time is already restored",
  );
});

Deno.test("time.now = N throws when N < time.now", () => {
  using time = new FakeTime(1000);
  assertThrows(
    () => {
      time.now = 999;
    },
    RangeError,
    "Cannot set current time in the past, time must be >= 1000: received 999",
  );
});

Deno.test("time.start returns the started time of the fake time", () => {
  using time = new FakeTime(1000);
  time.now = 2000;
  assertEquals(time.start, 1000);
});

Deno.test("FakeTime doesn't affect AbortSignal.timeout unchanged if uninitialized", () => {
  assertStrictEquals(AbortSignal.timeout, _internals.AbortSignalTimeout);
});

Deno.test("FakeTime fakes AbortSignal.timeout", () => {
  {
    using _time = new FakeTime(9001);
    assertNotEquals(AbortSignal.timeout, _internals.AbortSignalTimeout);
  }
  assertStrictEquals(AbortSignal.timeout, _internals.AbortSignalTimeout);
});

Deno.test("FakeTime controls AbortSignal.timeout", () => {
  using time: FakeTime = new FakeTime();
  const cb = spy(fromNow());
  const expected: SpyCall[] = [];

  const signal = AbortSignal.timeout(1000);
  signal.onabort = () => cb();
  time.tick(250);
  assertEquals(cb.calls, expected);
  time.tick(250);
  assertEquals(cb.calls, expected);
  time.tick(500);
  expected.push({ args: [], returned: 1000 });
  assertEquals(cb.calls, expected);
  time.tick(2500);
  assertEquals(cb.calls, expected);

  assertEquals(signal.aborted, true);
  assertInstanceOf(signal.reason, DOMException);
  assertEquals(signal.reason.name, "TimeoutError");
  assertEquals(signal.reason.message, "Signal timed out.");

  const signalA = AbortSignal.timeout(1000);
  signalA.addEventListener("abort", () => cb("a"));
  const signalB = AbortSignal.timeout(2000);
  signalB.addEventListener("abort", () => cb("b"));
  const signalC = AbortSignal.timeout(1500);
  signalC.addEventListener("abort", () => cb("c"));
  assertEquals(cb.calls, expected);
  time.tick(2500);
  expected.push({ args: ["a"], returned: 4500 });
  expected.push({ args: ["c"], returned: 5000 });
  expected.push({ args: ["b"], returned: 5500 });
  assertEquals(cb.calls, expected);
});

// https://github.com/denoland/std/issues/5499
Deno.test("FakeTime regression test for issue #5499", async () => {
  using t = new FakeTime();
  const p = deadline(delay(1_000), 10);
  let state: "pending" | "rejected" | "fulfilled" = "pending";
  p.then(() => {
    state = "fulfilled";
  }).catch(() => {
    state = "rejected";
  });
  await t.tickAsync(10);
  await t.runMicrotasks();
  assertEquals(state, "rejected");
});

Deno.test("FakeTime throws custom error message if first argument to setTimeout/setInterval is string", () => {
  using _ = new FakeTime();
  assertThrows(
    // @ts-ignore in environments that don't allow string in TS types
    () => void setTimeout('console.log("oops");'),
    TimeError,
    "FakeTime does not support non-function callbacks to setTimeout",
  );
  assertThrows(
    // @ts-ignore in environments that don't allow string in TS types
    () => void setInterval('console.log("oops");'),
    TimeError,
    "FakeTime does not support non-function callbacks to setInterval",
  );
});
