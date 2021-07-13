// Copyright 2018-2021 the Deno authors. All rights reserved. MIT license.
import { assertEquals } from "https://deno.land/std@0.100.0/testing/asserts.ts";
import { groupBy } from "./group_by.ts";
import { Selector } from "./types.ts";

function groupByTest<T>(
  input: [Array<T>, Selector<T, string>],
  expected: { [x: string]: Array<T> },
  message?: string,
) {
  const actual = groupBy(...input);
  assertEquals(actual, expected, message);
}

Deno.test({
  name: "[collections/groupBy] no mutation",
  fn() {
    const arrayA = [1.1, 4.2, 4.5];
    groupBy(arrayA, () => "test");

    assertEquals(arrayA, [1.1, 4.2, 4.5]);
  },
});

Deno.test({
  name: "[collections/groupBy] empty input",
  fn() {
    groupByTest(
      [[], () => "a"],
      {},
    );
  },
});

Deno.test({
  name: "[collections/groupBy] constant key",
  fn() {
    groupByTest(
      [[1, 3, 5, 6], () => "a"],
      { a: [1, 3, 5, 6] },
    );
  },
});

Deno.test({
  name: "[collections/groupBy] empty key",
  fn() {
    groupByTest(
      [
        ["Foo", "b"],
        (it) => it.charAt(1),
      ],
      {
        "o": ["Foo"],
        "": ["b"],
      },
    );
  },
});

Deno.test({
  name: "[collections/groupBy] groups",
  fn() {
    groupByTest(
      [
        ["Anna", "Marija", "Karl", "Arnold", "Martha"],
        (it) => it.charAt(0),
      ],
      {
        "A": ["Anna", "Arnold"],
        "M": ["Marija", "Martha"],
        "K": ["Karl"],
      },
    );
    groupByTest(
      [
        [1.2, 2, 2.3, 6.3, 6.9, 6],
        (it) => Math.floor(it).toString(),
      ],
      {
        "1": [1.2],
        "2": [2, 2.3],
        "6": [6.3, 6.9, 6],
      },
    );
  },
});
