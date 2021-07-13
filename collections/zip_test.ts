// Copyright 2018-2021 the Deno authors. All rights reserved. MIT license.
import { assertEquals } from "https://deno.land/std@0.100.0/testing/asserts.ts";
import { zip } from "./zip.ts";

function zipTest<T, U>(
  input: [Array<T>, Array<U>],
  expected: Array<[T, U]>,
  message?: string,
) {
  const actual = zip(...input);
  assertEquals(actual, expected, message);
}

Deno.test({
  name: "[collections/zip] no mutation",
  fn() {
    const arrayA = [1, 4, 5];
    const arrayB = ["foo", "bar"];
    zip(arrayA, arrayB);

    assertEquals(arrayA, [1, 4, 5]);
    assertEquals(arrayB, ["foo", "bar"]);
  },
});

Deno.test({
  name: "[collections/zip] empty input",
  fn() {
    zipTest(
      [[], []],
      [],
    );
    zipTest(
      [[1, 2, 3], []],
      [],
    );
    zipTest(
      [[], [{}, []]],
      [],
    );
  },
});

Deno.test({
  name: "[collections/zip] same length",
  fn() {
    zipTest(
      [
        [1, 4, 5],
        ["foo", "bar", "lorem"],
      ],
      [
        [1, "foo"],
        [4, "bar"],
        [5, "lorem"],
      ],
    );
    zipTest(
      [
        [2.2, false],
        ["test", true],
      ],
      [
        [2.2, "test"],
        [false, true],
      ],
    );
  },
});

Deno.test({
  name: "[collections/zip] first shorter",
  fn() {
    zipTest(
      [
        [1],
        ["foo", "bar", "lorem"],
      ],
      [[1, "foo"]],
    );
    zipTest(
      [
        [2.2, false],
        ["test", true, {}],
      ],
      [
        [2.2, "test"],
        [false, true],
      ],
    );
  },
});

Deno.test({
  name: "[collections/zip] second shorter",
  fn() {
    zipTest(
      [
        [1, 4, 5],
        ["foo"],
      ],
      [[1, "foo"]],
    );
    zipTest(
      [
        [2.2, false, "test"],
        ["test", true],
      ],
      [
        [2.2, "test"],
        [false, true],
      ],
    );
  },
});
