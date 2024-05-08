// Copyright 2018-2024 the Deno authors. All rights reserved. MIT license.
import { AssertionError, assertStrictEquals, assertThrows } from "./mod.ts";
import { _internals } from "@std/internal";
import { stub } from "@std/testing/mock";

Deno.test({
  name: "assertStrictEquals()",
  fn() {
    assertStrictEquals(true, true);
    assertStrictEquals(10, 10);
    assertStrictEquals("abc", "abc");
    assertStrictEquals(NaN, NaN);

    const xs = [1, false, "foo"];
    const ys = xs;
    assertStrictEquals(xs, ys);

    const x = { a: 1 };
    const y = x;
    assertStrictEquals(x, y);
  },
});

Deno.test({
  name: "assertStrictEquals() types test",
  fn() {
    const x = { number: 2 };

    const y = x as Record<never, never>;
    const z = x as unknown;

    // y.number;
    //   ~~~~~~
    // Property 'number' does not exist on type 'Record<never, never>'.deno-ts(2339)

    assertStrictEquals(y, x);
    y.number; // ok

    // z.number;
    // ~
    // Object is of type 'unknown'.deno-ts(2571)

    assertStrictEquals(z, x);
    z.number; // ok
  },
});

Deno.test({
  name: "assertStrictEquals() throws with structure diff",
  fn() {
    assertThrows(
      () => assertStrictEquals({ a: 1, b: 2 }, { a: 1, c: [3] }),
      AssertionError,
      `
    {
      a: 1,
+     c: [
+       3,
+     ],
-     b: 2,
    }`,
    );
  },
});

Deno.test({
  name: "assertStrictEquals() throws with reference diff",
  fn() {
    assertThrows(
      () => assertStrictEquals({ a: 1, b: 2 }, { a: 1, b: 2 }),
      AssertionError,
      `Values have the same structure but are not reference-equal.

    {
      a: 1,
      b: 2,
    }`,
    );
  },
});

Deno.test({
  name: "assertStrictEquals() throws with custom message",
  fn() {
    assertThrows(
      () => assertStrictEquals({ a: 1 }, { a: 1 }, "CUSTOM MESSAGE"),
      AssertionError,
      `Values have the same structure but are not reference-equal: CUSTOM MESSAGE

    {
      a: 1,
    }`,
    );
  },
});

Deno.test({
  name: "assertStrictEquals() throws with [Cannot display] if diffing fails",
  fn() {
    using _ = stub(_internals, "diff", () => {
      throw new Error();
    });
    assertThrows(
      () => assertStrictEquals("1", "2"),
      AssertionError,
      "\n[Cannot display] + \n\n",
    );
  },
});
