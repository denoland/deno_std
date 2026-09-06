// Copyright 2018-2026 the Deno authors. MIT license.

/**
 * Utilities for mocking time while testing.
 *
 * ```ts
 * import {
 *   assertSpyCalls,
 *   spy,
 * } from "@std/testing/mock";
 * import { FakeTime } from "@std/testing/time";
 *
 * function secondInterval(cb: () => void) {
 *   return setInterval(cb, 1000);
 * }
 *
 * Deno.test("secondInterval calls callback every second and stops after being cleared", () => {
 *   using time = new FakeTime();
 *
 *   const cb = spy();
 *   const intervalId = secondInterval(cb);
 *   assertSpyCalls(cb, 0);
 *   time.tick(500);
 *   assertSpyCalls(cb, 0);
 *   time.tick(500);
 *   assertSpyCalls(cb, 1);
 *   time.tick(3500);
 *   assertSpyCalls(cb, 4);
 *
 *   clearInterval(intervalId);
 *   time.tick(1000);
 *   assertSpyCalls(cb, 4);
 * });
 * ```
 *
 * @module
 */

import { RedBlackTree } from "@std/data-structures/red-black-tree";
import { ascend } from "@std/data-structures/comparators";
import type { DelayOptions } from "@std/async/delay";
import { _internals } from "./_time.ts";

export type { DelayOptions };

/**
 * Represents an error when trying to execute an invalid operation on fake time,
 * given the state fake time is in.
 *
 * @example Usage
 * ```ts
 * import { FakeTime, TimeError } from "@std/testing/time";
 * import { assertThrows } from "@std/assert";
 *
 * assertThrows(() => {
 *   const time = new FakeTime();
 *   time.restore();
 *   time.restore();
 * }, TimeError);
 * ```
 */
export class TimeError extends Error {
  /** Construct TimeError.
   *
   * @param message The error message
   */
  constructor(message: string) {
    super(message);
    this.name = "TimeError";
  }
}

function fakeTimeNow() {
  return time?.now ?? _internals.Date.now();
}

const FakeDate = new Proxy(Date, {
  construct(_target, args, newTarget) {
    if (args.length === 0) args.push(FakeDate.now());
    // Forward newTarget so `class X extends Date` keeps its prototype.
    return Reflect.construct(_internals.Date, args, newTarget);
  },
  apply(_target, _thisArg, _args) {
    return new _internals.Date(fakeTimeNow()).toString();
  },
  get(target, prop, receiver) {
    if (prop === "now") {
      return fakeTimeNow;
    }
    return Reflect.get(target, prop, receiver);
  },
});

interface Timer {
  id: number;
  // deno-lint-ignore no-explicit-any
  callback: (...args: any[]) => void;
  delay: number;
  args: unknown[];
  due: number;
  repeat: boolean;
}

/** The option for {@linkcode FakeTime} */
export interface FakeTimeOptions {
  /**
   * The rate relative to real time at which fake time is updated.
   * By default time only moves forward through calling tick or setting now.
   * Set to 1 to have the fake time automatically tick forward at the same rate in milliseconds as real time.
   *
   * @default {0}
   */
  advanceRate: number;
  /**
   * The frequency in milliseconds at which fake time is updated.
   * If advanceRate is set, we will update the time every 10 milliseconds by default.
   *
   * @default {10}
   */
  advanceFrequency?: number;
}

interface DueNode {
  due: number;
  timers: Timer[];
}

let time: FakeTime | undefined = undefined;

function assertIsCallbackFunction(
  callback: unknown,
  fnName: "setTimeout" | "setInterval",
): asserts callback is (...args: unknown[]) => void {
  if (typeof callback !== "function") {
    throw new TimeError(
      `FakeTime does not support non-function callbacks to ${fnName}`,
    );
  }
}

function fakeSetTimeout(
  callback: string | ((...args: unknown[]) => unknown),
  delay = 0,
  ...args: unknown[]
): number {
  assertIsCallbackFunction(callback, "setTimeout");
  if (!time) throw new TimeError("Cannot set timeout: time is not faked");
  return setTimer(callback, delay, args, false);
}

function fakeClearTimeout(id?: unknown) {
  if (!time) throw new TimeError("Cannot clear timeout: time is not faked");
  if (typeof id === "number" && dueNodes.has(id)) {
    dueNodes.delete(id);
  }
}

function fakeSetInterval(
  callback: string | ((...args: unknown[]) => unknown),
  delay = 0,
  ...args: unknown[]
): number {
  assertIsCallbackFunction(callback, "setInterval");
  if (!time) throw new TimeError("Cannot set interval: time is not faked");
  return setTimer(callback, delay, args, true);
}

function fakeClearInterval(id?: unknown) {
  if (!time) throw new TimeError("Cannot clear interval: time is not faked");
  if (typeof id === "number" && dueNodes.has(id)) {
    dueNodes.delete(id);
  }
}

function setTimer(
  callback: (...args: unknown[]) => unknown,
  delay = 0,
  args: unknown[],
  repeat = false,
): number {
  const id: number = timerId.next().value;
  delay = Math.max(repeat ? 1 : 0, Math.floor(delay));
  const due: number = now + delay;
  let dueNode: DueNode | null = dueTree.find({ due } as DueNode);
  if (dueNode === null) {
    dueNode = { due, timers: [] };
    dueTree.insert(dueNode);
  }
  dueNode.timers.push({
    id,
    callback,
    args,
    delay,
    due,
    repeat,
  });
  dueNodes.set(id, dueNode);
  return id;
}

function fakeAbortSignalTimeout(delay: number): AbortSignal {
  const aborter = new AbortController();
  fakeSetTimeout(() => {
    aborter.abort(new DOMException("Signal timed out.", "TimeoutError"));
  }, delay);
  return aborter.signal;
}

function overrideGlobals() {
  globalThis.Date = FakeDate;
  globalThis.setTimeout =
    fakeSetTimeout as unknown as typeof globalThis.setTimeout;
  globalThis.clearTimeout = fakeClearTimeout;
  globalThis.setInterval =
    fakeSetInterval as unknown as typeof globalThis.setInterval;
  globalThis.clearInterval = fakeClearInterval;
  AbortSignal.timeout = fakeAbortSignalTimeout;
}

function restoreGlobals() {
  globalThis.Date = _internals.Date;
  globalThis.setTimeout = _internals.setTimeout;
  globalThis.clearTimeout = _internals.clearTimeout;
  globalThis.setInterval = _internals.setInterval;
  globalThis.clearInterval = _internals.clearInterval;
  AbortSignal.timeout = _internals.AbortSignalTimeout;
}

function* timerIdGen() {
  let i = 1;
  while (true) yield i++;
}

function nextDueNode(): DueNode | null {
  for (;;) {
    const dueNode = dueTree.min();
    if (!dueNode) return null;
    const hasTimer = dueNode.timers.some((timer) => dueNodes.has(timer.id));
    if (hasTimer) return dueNode;
    dueTree.remove(dueNode);
  }
}

let startedAt: number;
let now: number;
let initializedAt: number;
let advanceRate: number;
let advanceFrequency: number;
let advanceIntervalId: ReturnType<typeof setInterval> | undefined;
let timerId: Generator<number>;
let dueNodes: Map<number, DueNode>;
let dueTree: RedBlackTree<DueNode>;

/**
 * Overrides the real Date object and timer functions with fake ones that can be
 * controlled through the fake time instance.
 *
 * Note: there is no setter for the `start` property, as it cannot be changed
 * after initialization.
 *
 * @example Usage
 * ```ts
 * import {
 *   assertSpyCalls,
 *   spy,
 * } from "@std/testing/mock";
 * import { FakeTime } from "@std/testing/time";
 *
 * function secondInterval(cb: () => void) {
 *   return setInterval(cb, 1000);
 * }
 *
 * Deno.test("secondInterval calls callback every second and stops after being cleared", () => {
 *   using time = new FakeTime();
 *
 *   const cb = spy();
 *   const intervalId = secondInterval(cb);
 *   assertSpyCalls(cb, 0);
 *   time.tick(500);
 *   assertSpyCalls(cb, 0);
 *   time.tick(500);
 *   assertSpyCalls(cb, 1);
 *   time.tick(3500);
 *   assertSpyCalls(cb, 4);
 *
 *   clearInterval(intervalId);
 *   time.tick(1000);
 *   assertSpyCalls(cb, 4);
 * });
 * ```
 */
export class FakeTime {
  /**
   * Construct a FakeTime object. This overrides the real Date object and timer functions with fake ones that can be
   * controlled through the fake time instance.
   *
   * @param start The time to simulate. The default is the current time.
   * @param options The options
   *
   * @throws {TimeError} If time is already faked
   * @throws {TypeError} If the start is invalid
   */
  constructor(
    start?: number | string | Date | null,
    options?: FakeTimeOptions,
  ) {
    if (time) {
      throw new TimeError("Cannot construct FakeTime: time is already faked");
    }
    initializedAt = _internals.Date.now();
    startedAt = start instanceof Date
      ? start.valueOf()
      : typeof start === "number"
      ? Math.floor(start)
      : typeof start === "string"
      ? (new Date(start)).valueOf()
      : initializedAt;
    if (Number.isNaN(startedAt)) {
      throw new TypeError(
        `Cannot construct FakeTime: invalid start time ${startedAt}`,
      );
    }
    now = startedAt;

    timerId = timerIdGen();
    dueNodes = new Map();
    dueTree = new RedBlackTree(
      (a: DueNode, b: DueNode) => ascend(a.due, b.due),
    );

    overrideGlobals();
    time = this;

    advanceRate = Math.max(
      0,
      options?.advanceRate ?? 0,
    );
    advanceFrequency = Math.max(
      0,
      options?.advanceFrequency ?? 10,
    );
    advanceIntervalId = advanceRate > 0
      ? _internals.setInterval.call(null, () => {
        this.tick(advanceRate * advanceFrequency);
      }, advanceFrequency)
      : undefined;
  }

  /**
   * Restores real time.
   *
   * @example Usage
   * ```ts
   * import { FakeTime } from "@std/testing/time";
   * import { assertEquals, assertNotEquals } from "@std/assert";
   *
   * const setTimeout = globalThis.setTimeout;
   *
   * {
   *   using fakeTime = new FakeTime();
   *
   *   assertNotEquals(globalThis.setTimeout, setTimeout);
   *
   *   // test timer related things.
   *
   *   // You don't need to call fakeTime.restore() explicitly
   *   // as it's implicitly called via the [Symbol.dispose] method
   *   // when declared with `using`.
   * }
   *
   * assertEquals(globalThis.setTimeout, setTimeout);
   * ```
   */
  [Symbol.dispose]() {
    this.restore();
  }

  /**
   * Restores real time.
   *
   * @throws {TimeError} If time is already restored
   *
   * @example Usage
   * ```ts
   * import { FakeTime } from "@std/testing/time";
   * import { assertEquals, assertNotEquals } from "@std/assert"
   *
   * const setTimeout = globalThis.setTimeout;
   *
   * const fakeTime = new FakeTime();
   *
   * assertNotEquals(globalThis.setTimeout, setTimeout);
   *
   * FakeTime.restore();
   *
   * assertEquals(globalThis.setTimeout, setTimeout);
   * ```
   */
  static restore() {
    if (!time) {
      throw new TimeError("Cannot restore time: time is already restored");
    }
    time.restore();
  }

  /**
   * Restores real time temporarily until callback returns and resolves.
   *
   * @throws {TimeError} If time is not faked
   *
   * @example Usage
   * ```ts
   * import { FakeTime } from "@std/testing/time";
   * import { assertEquals, assertNotEquals } from "@std/assert"
   *
   * const setTimeout = globalThis.setTimeout;
   *
   * const fakeTime = new FakeTime();
   *
   * assertNotEquals(globalThis.setTimeout, setTimeout);
   *
   * FakeTime.restoreFor(() => {
   *   assertEquals(globalThis.setTimeout, setTimeout);
   * });
   * ```
   *
   * @typeParam T The returned value type of the callback
   * @param callback The callback to be called while FakeTime being restored
   * @param args The arguments to pass to the callback
   * @returns The returned value from the callback
   */
  static restoreFor<T>(
    // deno-lint-ignore no-explicit-any
    callback: (...args: any[]) => Promise<T> | T,
    // deno-lint-ignore no-explicit-any
    ...args: any[]
  ): Promise<T> {
    if (!time) {
      return Promise.reject(
        new TimeError("Cannot restore time: time is not faked"),
      );
    }
    restoreGlobals();
    try {
      const result = callback.apply(null, args);
      if (result instanceof Promise) {
        return result.finally(() => overrideGlobals());
      } else {
        overrideGlobals();
        return Promise.resolve(result);
      }
    } catch (e) {
      overrideGlobals();
      return Promise.reject(e);
    }
  }

  /**
   * The number of milliseconds elapsed since the epoch (January 1, 1970 00:00:00 UTC) for the fake time.
   *
   * @example Usage
   * ```ts
   * import { FakeTime } from "@std/testing/time";
   * import { assertEquals } from "@std/assert";
   *
   * const fakeTime = new FakeTime(15_000);
   *
   * assertEquals(fakeTime.now, 15_000);
   *
   * fakeTime.tick(5_000);
   *
   * assertEquals(fakeTime.now, 20_000);
   * ```
   *
   * @returns The number of milliseconds elapsed since the epoch (January 1, 1970 00:00:00 UTC) for the fake time
   */
  get now(): number {
    return now;
  }
  /**
   * Set the current time. It will call any functions waiting to be called between the current and new fake time.
   * If the timer callback throws, time will stop advancing forward beyond that timer.
   *
   * @throws {RangeError} If the time goes backwards
   *
   * @example Usage
   * ```ts
   * import { FakeTime } from "@std/testing/time";
   * import { assertEquals } from "@std/assert";
   *
   * const fakeTime = new FakeTime(15_000);
   *
   * assertEquals(fakeTime.now, 15_000);
   *
   * fakeTime.now = 35_000;
   *
   * assertEquals(fakeTime.now, 35_000);
   * ```
   *
   * @param value The current time (in milliseconds)
   */
  set now(value: number) {
    if (value < now) {
      throw new RangeError(
        `Cannot set current time in the past, time must be >= ${now}: received ${value}`,
      );
    }
    let dueNode: DueNode | null = dueTree.min();
    while (dueNode && dueNode.due <= value) {
      const timer: Timer | undefined = dueNode.timers.shift();
      if (timer && dueNodes.has(timer.id)) {
        now = timer.due;
        if (timer.repeat) {
          const due: number = timer.due + timer.delay;
          let dueNode: DueNode | null = dueTree.find({ due } as DueNode);
          if (dueNode === null) {
            dueNode = { due, timers: [] };
            dueTree.insert(dueNode);
          }
          dueNode.timers.push({ ...timer, due });
          dueNodes.set(timer.id, dueNode);
        } else {
          dueNodes.delete(timer.id);
        }
        timer.callback.apply(null, timer.args);
      } else if (!timer) {
        dueTree.remove(dueNode);
        dueNode = dueTree.min();
      }
    }
    now = value;
  }

  /**
   * The initial number of milliseconds elapsed since the epoch (January 1, 1970 00:00:00 UTC) for the fake time.
   *
   * @example Usage
   * ```ts
   * import { FakeTime } from "@std/testing/time";
   * import { assertEquals } from "@std/assert";
   *
   * const fakeTime = new FakeTime(15_000);
   *
   * assertEquals(fakeTime.start, 15_000);
   * ```
   *
   * @returns The initial number of milliseconds elapsed since the epoch (January 1, 1970 00:00:00 UTC) for the fake time.
   */
  get start(): number {
    return startedAt;
  }

  /**
   * Resolves after the given number of milliseconds using real time.
   *
   * @example Usage
   * ```ts
   * import { FakeTime } from "@std/testing/time";
   * import { assertEquals } from "@std/assert";
   *
   * const fakeTime = new FakeTime(15_000);
   *
   * await fakeTime.delay(500); // wait 500 ms in real time.
   *
   * assertEquals(fakeTime.now, 15_000); // The simulated time doesn't advance.
   * ```
   *
   * @param ms The milliseconds to delay
   * @param options The options
   */
  async delay(ms: number, options: DelayOptions = {}): Promise<void> {
    const { signal } = options;
    if (signal?.aborted) {
      return Promise.reject(
        new DOMException("Delay was aborted.", "AbortError"),
      );
    }
    return await new Promise((resolve, reject) => {
      let timer: ReturnType<typeof setTimeout> | null = null;
      const abort = () =>
        FakeTime
          .restoreFor(() => {
            if (timer) clearTimeout(timer);
          })
          .then(() =>
            reject(new DOMException("Delay was aborted.", "AbortError"))
          );
      const done = () => {
        signal?.removeEventListener("abort", abort);
        resolve();
      };
      FakeTime.restoreFor(() => setTimeout(done, ms))
        .then((id) => timer = id);
      signal?.addEventListener("abort", abort, { once: true });
    });
  }

  /**
   * Runs all pending microtasks.
   *
   * @example Usage
   * ```ts
   * import { FakeTime } from "@std/testing/time";
   * import { assert } from "@std/assert";
   *
   * const fakeTime = new FakeTime(15_000);
   *
   * let called = false;
   *
   * Promise.resolve().then(() => { called = true });
   *
   * await fakeTime.runMicrotasks();
   *
   * assert(called);
   * ```
   */
  async runMicrotasks() {
    await this.delay(0);
  }

  /**
   * Adds the specified number of milliseconds to the fake time.
   * This will call any functions waiting to be called between the current and new fake time.
   *
   * @example Usage
   * ```ts
   * import {
   *   assertSpyCalls,
   *   spy,
   * } from "@std/testing/mock";
   * import { FakeTime } from "@std/testing/time";
   *
   * function secondInterval(cb: () => void) {
   *   return setInterval(cb, 1000);
   * }
   *
   * Deno.test("secondInterval calls callback every second and stops after being cleared", () => {
   *   using time = new FakeTime();
   *
   *   const cb = spy();
   *   const intervalId = secondInterval(cb);
   *   assertSpyCalls(cb, 0);
   *   time.tick(500);
   *   assertSpyCalls(cb, 0);
   *   time.tick(500);
   *   assertSpyCalls(cb, 1);
   *   time.tick(3500);
   *   assertSpyCalls(cb, 4);
   *
   *   clearInterval(intervalId);
   *   time.tick(1000);
   *   assertSpyCalls(cb, 4);
   * });
   * ```
   *
   * @param ms The milliseconds to advance
   */
  tick(ms = 0) {
    this.now += ms;
  }

  /**
   * Runs all pending microtasks then adds the specified number of milliseconds to the fake time.
   * This will call any functions waiting to be called between the current and new fake time.
   *
   * @example Usage
   * ```ts
   * import { FakeTime } from "@std/testing/time";
   * import { assert, assertEquals } from "@std/assert";
   *
   * const fakeTime = new FakeTime(15_000);
   *
   * let called = false;
   *
   * Promise.resolve().then(() => { called = true });
   *
   * await fakeTime.tickAsync(5_000);
   *
   * assert(called);
   * assertEquals(fakeTime.now, 20_000);
   * ```
   *
   * @param ms The milliseconds to advance
   */
  async tickAsync(ms = 0) {
    await this.runMicrotasks();
    this.now += ms;
  }

  /**
   * Advances time to when the next scheduled timer is due.
   * If there are no pending timers, time will not be changed.
   *
   * @example Usage
   * ```ts
   * import { FakeTime } from "@std/testing/time";
   * import { assert, assertEquals } from "@std/assert";
   *
   * const fakeTime = new FakeTime(15_000);
   *
   * let called = false;
   *
   * setTimeout(() => { called = true }, 5000);
   *
   * fakeTime.next();
   *
   * assert(called);
   * assertEquals(fakeTime.now, 20_000);
   * ```
   *
   * @returns `true` when there is a scheduled timer and `false` when there is not.
   */
  next(): boolean {
    const next = nextDueNode();
    if (next) this.now = next.due;
    return !!next;
  }

  /**
   * Runs all pending microtasks then advances time to when the next scheduled timer is due.
   * If there are no pending timers, time will not be changed.
   *
   * @example Usage
   * ```ts
   * import { FakeTime } from "@std/testing/time";
   * import { assert, assertEquals } from "@std/assert";
   *
   * const fakeTime = new FakeTime(15_000);
   *
   * let called0 = false;
   * let called1 = false;
   *
   * setTimeout(() => { called0 = true }, 5000);
   * Promise.resolve().then(() => { called1 = true });
   *
   * await fakeTime.nextAsync();
   *
   * assert(called0);
   * assert(called1);
   * assertEquals(fakeTime.now, 20_000);
   * ```
   *
   * @returns `true` if the pending timers existed and the time advanced, `false` if there was no pending timer and the time didn't advance.
   */
  async nextAsync(): Promise<boolean> {
    await this.runMicrotasks();
    return this.next();
  }

  /**
   * Advances time forward to the next due timer until there are no pending timers remaining.
   * If the timers create additional timers, they will be run too. If there is an interval,
   * time will keep advancing forward until the interval is cleared.
   *
   * @example Usage
   * ```ts
   * import { FakeTime } from "@std/testing/time";
   * import { assertEquals } from "@std/assert";
   *
   * const fakeTime = new FakeTime(15_000);
   *
   * let count = 0;
   *
   * setTimeout(() => { count++ }, 5_000);
   * setTimeout(() => { count++ }, 15_000);
   * setTimeout(() => { count++ }, 35_000);
   *
   * fakeTime.runAll();
   *
   * assertEquals(count, 3);
   * assertEquals(fakeTime.now, 50_000);
   * ```
   */
  runAll() {
    while (!dueTree.isEmpty()) {
      this.next();
    }
  }

  /**
   * Advances time forward to the next due timer until there are no pending timers remaining.
   * If the timers create additional timers, they will be run too. If there is an interval,
   * time will keep advancing forward until the interval is cleared.
   * Runs all pending microtasks before each timer.
   *
   * @example Usage
   * ```ts
   * import { FakeTime } from "@std/testing/time";
   * import { assertEquals } from "@std/assert";
   *
   * const fakeTime = new FakeTime(15_000);
   *
   * let count = 0;
   *
   * setTimeout(() => { count++ }, 5_000);
   * setTimeout(() => { count++ }, 15_000);
   * setTimeout(() => { count++ }, 35_000);
   * Promise.resolve().then(() => { count++ });
   *
   * await fakeTime.runAllAsync();
   *
   * assertEquals(count, 4);
   * assertEquals(fakeTime.now, 50_000);
   * ```
   */
  async runAllAsync() {
    while (!dueTree.isEmpty()) {
      await this.nextAsync();
    }
  }

  /**
   * Restores time related global functions to their original state.
   *
   * @example Usage
   * ```ts
   * import { FakeTime } from "@std/testing/time";
   * import { assertEquals, assertNotEquals } from "@std/assert";
   *
   * const setTimeout = globalThis.setTimeout;
   *
   * const fakeTime = new FakeTime(); // global timers are now faked
   *
   * assertNotEquals(globalThis.setTimeout, setTimeout);
   *
   * fakeTime.restore(); // timers are restored
   *
   * assertEquals(globalThis.setTimeout, setTimeout);
   * ```
   */
  restore() {
    if (!time) {
      throw new TimeError("Cannot restore time: time is already restored");
    }
    time = undefined;
    restoreGlobals();
    if (advanceIntervalId) clearInterval(advanceIntervalId);
  }
}
