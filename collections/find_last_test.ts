// Copyright 2018-2021 the Deno authors. All rights reserved. MIT license.
import { assertEquals } from "https://deno.land/std@0.100.0/testing/asserts.ts";
import { findLast } from "./find_last.ts";

function findLastTest<I>(
  input: [Array<I>, (element: I) => boolean],
  expected: I | undefined,
  message?: string,
) {
  const actual = findLast(...input);
  assertEquals(actual, expected, message);
}

Deno.test({
  name: "[collections/findLast] no mutation",
  fn() {
    const array = [1, 2, 3];
    findLast(array, (it) => it % 2 === 0);

    assertEquals(array, [1, 2, 3]);
  },
});

Deno.test({
  name: "[collections/findLast] empty input",
  fn() {
    findLastTest(
      [[], (_) => true],
      undefined,
    );
  },
});

Deno.test({
  name: "[collections/findLast] no matches",
  fn() {
    findLastTest(
      [[9, 11, 13], (it) => it % 2 === 0],
      undefined,
    );
    findLastTest(
      [["foo", "bar"], (it) => it.startsWith("z")],
      undefined,
    );
    findLastTest(
      [[{ done: false }], (it) => it.done],
      undefined,
    );
  },
});

Deno.test({
  name: "[collections/findLast] only match",
  fn() {
    findLastTest(
      [[9, 12, 13], (it) => it % 2 === 0],
      12,
    );
    findLastTest(
      [["zap", "foo", "bar"], (it) => it.startsWith("z")],
      "zap",
    );
    findLastTest(
      [[{ done: false }, { done: true }], (it) => it.done],
      { done: true },
    );
  },
});

Deno.test({
  name: "[collections/findLast] multiple matches",
  fn() {
    findLastTest(
      [[9, 12, 13, 14], (it) => it % 2 === 0],
      14,
    );
    findLastTest(
      [["zap", "foo", "bar", "zee"], (it) => it.startsWith("z")],
      "zee",
    );
  },
});
