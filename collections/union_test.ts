// Copyright 2018-2021 the Deno authors. All rights reserved. MIT license.
import { assertEquals } from "https://deno.land/std@0.100.0/testing/asserts.ts";
import { union } from "./union.ts";

function unionTest<I>(
  input: [Array<I>, Array<I>],
  expected: Array<I>,
  message?: string,
) {
  const actual = union(...input);
  assertEquals(actual, expected, message);
}

Deno.test({
  name: "[collections/union] empty arrays",
  fn() {
    unionTest([[], []], []);
  },
});

Deno.test({
  name: "[collections/union] one side empty",
  fn() {
    unionTest([[], ["a", "b", "c"]], ["a", "b", "c"]);
    unionTest([["a", "b", "c"], []], ["a", "b", "c"]);
  },
});

Deno.test({
  name: "[collections/union] distinct sets",
  fn() {
    unionTest([["a", "b", "c"], ["d", "e", "f"]], [
      "a",
      "b",
      "c",
      "d",
      "e",
      "f",
    ]);
  },
});

Deno.test({
  name: "[collections/union] overlapping sets",
  fn() {
    unionTest([["a", "b"], ["b", "c"]], ["a", "b", "c"]);
    unionTest([["a", "b", "c", "d"], ["c", "d", "e", "f"]], [
      "a",
      "b",
      "c",
      "d",
      "e",
      "f",
    ]);
  },
});

Deno.test({
  name: "[collections/union] objects",
  fn() {
    const a = { foo: "bar" };
    const b = { bar: "baz" };
    const c = { fruit: "banana" };
    const d = { bar: "banana" };
    unionTest<Record<string, string>>([
      [a, b],
      [c],
    ], [a, b, c]);
    unionTest<Record<string, string>>([
      [a, b],
      [b],
    ], [a, b]);
    unionTest<Record<string, string>>([
      [a, b],
      [d],
    ], [a, b, d]);
  },
});

Deno.test({
  name: "[collections/union] functions",
  fn() {
    const a = () => {};
    const b = () => null;
    const c = () => NaN;
    const d = (a: number, b: number) => a + b;
    const e = (a: number, b: number) => a - b;

    unionTest([
      [a, b],
      [c],
    ], [a, b, c]);
    unionTest([
      [a, b],
      [a],
    ], [a, b]);
    unionTest([
      [d, a],
      [e],
    ], [d, a, e]);
  },
});
