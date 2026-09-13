// Copyright 2018-2026 the Deno authors. MIT license.
import { retry, RetryError, type RetryOptions } from "./unstable_retry.ts";
import { RetryError as StableRetryError } from "./retry.ts";
import {
  assertEquals,
  assertInstanceOf,
  assertRejects,
  assertStrictEquals,
} from "@std/assert";
import { FakeTime } from "@std/testing/time";
import { stub } from "@std/testing/mock";

/** Runs an always-failing function to exhaustion, returning the wait before each retry. */
async function waitsUntilExhausted(options: RetryOptions): Promise<number[]> {
  using time = new FakeTime();
  const start = time.now;
  const starts: number[] = [];
  const promise = retry(() => {
    starts.push(time.now - start);
    throw new Error("Failure");
  }, options);
  await time.runAllAsync();
  await assertRejects(() => promise, RetryError);
  return starts.slice(1).map((at, i) => at - starts[i]!);
}

Deno.test("retry() retries until the function succeeds", async () => {
  let attempts = 0;
  const result = await retry(() => {
    attempts++;
    if (attempts < 3) throw new Error("Not yet");
    return "success";
  }, { minTimeout: 1 });
  assertEquals(result, "success");
  assertEquals(attempts, 3);
});

Deno.test("retry() works without options", async () => {
  assertEquals(await retry(() => "ok"), "ok");
});

Deno.test("retry() re-exports the stable RetryError", async () => {
  assertStrictEquals(RetryError, StableRetryError);
  const thrown = new Error("Failure");
  const error = await assertRejects(
    () =>
      retry(() => {
        throw thrown;
      }, { maxAttempts: 1 }),
    StableRetryError,
    "Retrying exceeded the maxAttempts (1).",
  );
  assertInstanceOf(error, RetryError);
  assertStrictEquals(error.cause, thrown);
});

Deno.test("retry() validates the inherited options", async () => {
  await assertRejects(
    () => retry(() => {}, { maxAttempts: 0 }),
    RangeError,
    "Cannot retry as 'maxAttempts' must be a positive integer: current value is 0",
  );
  await assertRejects(
    () => retry(() => {}, { multiplier: 0.5 }),
    RangeError,
    "Cannot retry as 'multiplier' must be a finite number >= 1: current value is 0.5",
  );
  await assertRejects(
    () => retry(() => {}, { maxTimeout: -1 }),
    RangeError,
    "Cannot retry as 'maxTimeout' must be a positive number: current value is -1",
  );
  await assertRejects(
    () => retry(() => {}, { minTimeout: -100 }),
    RangeError,
    "Cannot retry as 'minTimeout' must be >= 0: current value is -100",
  );
  await assertRejects(
    () => retry(() => {}, { minTimeout: 1000, maxTimeout: 100 }),
    RangeError,
    "Cannot retry as 'minTimeout' must be <= 'maxTimeout': current values 'minTimeout=1000', 'maxTimeout=100'",
  );
  await assertRejects(
    () => retry(() => {}, { jitter: 2 }),
    RangeError,
    "Cannot retry as 'jitter' must be between 0 and 1: current value is 2",
  );
});

Deno.test("retry() keeps the computed backoff without getDelay", async () => {
  assertEquals(await waitsUntilExhausted({ jitter: 0 }), [
    1000,
    2000,
    4000,
    8000,
  ]);
});

Deno.test("retry() keeps the computed backoff when getDelay returns it", async () => {
  assertEquals(
    await waitsUntilExhausted({
      jitter: 0,
      getDelay: (_error, _attempt, computedDelay) => computedDelay,
    }),
    [1000, 2000, 4000, 8000],
  );
});

Deno.test("retry() treats an explicitly undefined getDelay as omitted", async () => {
  assertEquals(
    await waitsUntilExhausted(
      // @ts-expect-error: explicitly giving undefined
      { jitter: 0, getDelay: undefined },
    ),
    [1000, 2000, 4000, 8000],
  );
});

Deno.test("retry() calls getDelay once per eligible retry", async () => {
  const thrown = new Error("Failure");
  const calls: [unknown, number][] = [];
  await assertRejects(
    () =>
      retry(() => {
        throw thrown;
      }, {
        maxAttempts: 3,
        minTimeout: 1,
        getDelay: (error, attempt) => {
          calls.push([error, attempt]);
          return 0;
        },
      }),
    RetryError,
  );
  assertEquals(calls, [[thrown, 1], [thrown, 2]]);
  assertStrictEquals(calls[0]![0], thrown);
});

Deno.test("retry() waits for the delay returned by getDelay, below the base and above the cap", async () => {
  assertEquals(
    await waitsUntilExhausted({
      maxAttempts: 3,
      minTimeout: 1000,
      maxTimeout: 2000,
      jitter: 0,
      getDelay: (_error, attempt) => attempt === 1 ? 1 : 100_000,
    }),
    [1, 100_000],
  );
});

Deno.test("retry() computes the next backoff from the attempt count, not the previous override", async () => {
  const computed: number[] = [];
  await waitsUntilExhausted({
    jitter: 0,
    getDelay: (_error, _attempt, computedDelay) => {
      computed.push(computedDelay);
      return 5;
    },
  });
  assertEquals(computed, [1000, 2000, 4000, 8000]);
});

Deno.test("retry() passes the capped, jittered delay to getDelay and neither resamples nor clamps the result", async () => {
  using _random = stub(Math, "random", () => 0.5);
  const computed: number[] = [];
  const waits = await waitsUntilExhausted({
    maxAttempts: 3,
    minTimeout: 1000,
    maxTimeout: 1500,
    jitter: 1,
    getDelay: (_error, _attempt, computedDelay) => {
      computed.push(computedDelay);
      return computedDelay * 4;
    },
  });
  // Halved by the stubbed jitter, and capped at `maxTimeout` before that.
  assertEquals(computed, [500, 750]);
  assertEquals(waits, [2000, 3000]);
});

Deno.test("retry() does not call getDelay when there is no retry", async (t) => {
  await t.step("first attempt succeeds", async () => {
    let calls = 0;
    const result = await retry(() => "ok", {
      getDelay: () => {
        calls++;
        return 0;
      },
    });
    assertEquals(result, "ok");
    assertEquals(calls, 0);
  });

  await t.step("single attempt fails", async () => {
    let calls = 0;
    await assertRejects(
      () =>
        retry(() => {
          throw new Error("Failure");
        }, {
          maxAttempts: 1,
          getDelay: () => {
            calls++;
            return 0;
          },
        }),
      RetryError,
    );
    assertEquals(calls, 0);
  });

  await t.step("attempts are exhausted", async () => {
    let calls = 0;
    await assertRejects(
      () =>
        retry(() => {
          throw new Error("Failure");
        }, {
          maxAttempts: 3,
          minTimeout: 1,
          getDelay: () => {
            calls++;
            return 0;
          },
        }),
      RetryError,
    );
    assertEquals(calls, 2);
  });

  await t.step("error is not retriable", async () => {
    let calls = 0;
    await assertRejects(
      () =>
        retry(() => {
          throw new Error("Failure");
        }, {
          isRetriable: () => false,
          getDelay: () => {
            calls++;
            return 0;
          },
        }),
      Error,
      "Failure",
    );
    assertEquals(calls, 0);
  });
});

Deno.test("retry() rejects with the value thrown by getDelay and stops retrying", async () => {
  using time = new FakeTime();
  const start = time.now;
  const callbackError = new Error("Callback failure");
  let attempts = 0;
  const error = await assertRejects(() =>
    retry(() => {
      attempts++;
      throw new Error("Failure");
    }, {
      getDelay: () => {
        throw callbackError;
      },
    })
  );
  assertStrictEquals(error, callbackError);
  assertEquals(attempts, 1);
  assertEquals(time.now, start); // no wait was scheduled
});

Deno.test("retry() rejects invalid values returned by getDelay", async (t) => {
  const rejects = async (
    getDelay: () => unknown,
    ErrorClass: ErrorConstructor,
    message: string,
  ) => {
    using time = new FakeTime();
    const start = time.now;
    let attempts = 0;
    await assertRejects(
      () =>
        retry(() => {
          attempts++;
          throw new Error("Failure");
        }, { getDelay: getDelay as () => number }),
      ErrorClass,
      message,
    );
    assertEquals(attempts, 1);
    assertEquals(time.now, start);
  };

  await t.step("negative number", async () => {
    await rejects(
      () => -1,
      RangeError,
      "Cannot retry as 'getDelay' must return a non-negative number: current value is -1",
    );
  });

  await t.step("NaN", async () => {
    await rejects(
      () => NaN,
      RangeError,
      "Cannot retry as 'getDelay' must return a non-negative number: current value is NaN",
    );
  });

  await t.step("undefined", async () => {
    await rejects(
      () => undefined,
      TypeError,
      "Cannot retry as 'getDelay' must return a number: current value is of type undefined",
    );
  });

  await t.step("null", async () => {
    await rejects(
      () => null,
      TypeError,
      "Cannot retry as 'getDelay' must return a number: current value is of type object",
    );
  });

  await t.step("promise", async () => {
    await rejects(
      () => Promise.resolve(1),
      TypeError,
      "Cannot retry as 'getDelay' must return a number: current value is of type object",
    );
  });

  await t.step("numeric string", async () => {
    await rejects(
      () => "100",
      TypeError,
      "Cannot retry as 'getDelay' must return a number: current value is of type string",
    );
  });
});

Deno.test("retry() accepts zero, fractional, and very large delays", async (t) => {
  await t.step("zero retries without waiting", async () => {
    assertEquals(
      await waitsUntilExhausted({ maxAttempts: 3, getDelay: () => 0 }),
      [0, 0],
    );
  });

  await t.step("fractions follow delay() truncation", async () => {
    assertEquals(
      await waitsUntilExhausted({ maxAttempts: 2, getDelay: () => 1.5 }),
      [1],
    );
  });

  await t.step(
    "values above the native timer limit are waited out",
    async () => {
      const wait = 2 ** 31 + 1000;
      assertEquals(
        await waitsUntilExhausted({ maxAttempts: 2, getDelay: () => wait }),
        [wait],
      );
    },
  );
});

Deno.test("retry() waits until cancellation when getDelay returns Infinity", async () => {
  using time = new FakeTime();
  const controller = new AbortController();
  let attempts = 0;
  const promise = retry(() => {
    attempts++;
    throw new Error("Failure");
  }, { signal: controller.signal, getDelay: () => Infinity });

  await time.tickAsync(10_000);
  assertEquals(attempts, 1);

  controller.abort("cancelled");
  assertStrictEquals(await assertRejects(() => promise), "cancelled");
  assertEquals(attempts, 1);
});

Deno.test("retry() handles cancellation around getDelay", async (t) => {
  await t.step("signal aborted before the first attempt", async () => {
    let calls = 0;
    let attempts = 0;
    const error = await assertRejects(() =>
      retry(() => {
        attempts++;
        throw new Error("Failure");
      }, {
        signal: AbortSignal.abort("cancelled"),
        getDelay: () => {
          calls++;
          return 0;
        },
      })
    );
    assertStrictEquals(error, "cancelled");
    assertEquals([attempts, calls], [0, 0]);
  });

  await t.step("signal aborted while the attempt runs", async () => {
    const controller = new AbortController();
    let calls = 0;
    const error = await assertRejects(() =>
      retry(() => {
        controller.abort("cancelled");
        throw new Error("Failure");
      }, {
        signal: controller.signal,
        getDelay: () => {
          calls++;
          return 0;
        },
      })
    );
    assertStrictEquals(error, "cancelled");
    assertEquals(calls, 0);
  });

  await t.step("exhaustion takes precedence over an abort", async () => {
    const controller = new AbortController();
    let calls = 0;
    await assertRejects(
      () =>
        retry(() => {
          controller.abort("cancelled");
          throw new Error("Failure");
        }, {
          maxAttempts: 1,
          signal: controller.signal,
          getDelay: () => {
            calls++;
            return 0;
          },
        }),
      RetryError,
    );
    assertEquals(calls, 0);
  });

  await t.step("getDelay aborts the signal itself", async () => {
    using time = new FakeTime();
    const start = time.now;
    const controller = new AbortController();
    let attempts = 0;
    const error = await assertRejects(() =>
      retry(() => {
        attempts++;
        throw new Error("Failure");
      }, {
        signal: controller.signal,
        getDelay: () => {
          controller.abort("cancelled");
          return 1000;
        },
      })
    );
    assertStrictEquals(error, "cancelled");
    assertEquals(attempts, 1);
    assertEquals(time.now, start); // no timer was scheduled
  });

  await t.step("a throwing getDelay wins over its own abort", async () => {
    const controller = new AbortController();
    const callbackError = new Error("Callback failure");
    const error = await assertRejects(() =>
      retry(() => {
        throw new Error("Failure");
      }, {
        signal: controller.signal,
        getDelay: () => {
          controller.abort("cancelled");
          throw callbackError;
        },
      })
    );
    assertStrictEquals(error, callbackError);
  });

  await t.step("signal aborted during the selected wait", async () => {
    using time = new FakeTime();
    const controller = new AbortController();
    let attempts = 0;
    const promise = retry(() => {
      attempts++;
      throw new Error("Failure");
    }, { signal: controller.signal, getDelay: () => 100_000 });

    await time.tickAsync(50_000);
    controller.abort("cancelled");
    assertStrictEquals(await assertRejects(() => promise), "cancelled");
    assertEquals(attempts, 1);

    // The pending timer is cleared, so nothing is left to fire.
    await time.runAllAsync();
    assertEquals(attempts, 1);
  });
});
