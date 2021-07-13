// Copyright 2018-2021 the Deno authors. All rights reserved. MIT license.
import {
  assertEquals,
  assertThrows,
} from "https://deno.land/std@0.100.0/testing/asserts.ts";
import { chunked } from "./chunked.ts";

function chunkedTest<I>(
  input: [Array<I>, number],
  expected: Array<Array<I>>,
  message?: string,
) {
  const actual = chunked(...input);
  assertEquals(actual, expected, message);
}

const testArray = [1, 2, 3, 4, 5, 6];

Deno.test({
  name: "[collections/chunked] no mutation",
  fn() {
    const array = [1, 2, 3, 4];
    chunked(array, 2);

    assertEquals(array, [1, 2, 3, 4]);
  },
});

Deno.test({
  name: "[collections/chunked] throws on non naturals",
  fn() {
    assertThrows(() => chunked([], +.5));
    assertThrows(() => chunked([], -4.7));
    assertThrows(() => chunked([], -2));
    assertThrows(() => chunked([], +0));
    assertThrows(() => chunked([], -0));
  },
});

Deno.test({
  name: "[collections/chunked] empty input",
  fn() {
    chunkedTest(
      [[], 1],
      [],
    );
  },
});

Deno.test({
  name: "[collections/chunked] single element chunks",
  fn() {
    chunkedTest(
      [testArray, 1],
      testArray.map((it) => [it]),
    );
    chunkedTest(
      [["foo"], 1],
      [["foo"]],
    );
  },
});

Deno.test({
  name: "[collections/chunked] n chunks fitting",
  fn() {
    chunkedTest(
      [testArray, 2],
      [[1, 2], [3, 4], [5, 6]],
    );
    chunkedTest(
      [testArray, 3],
      [[1, 2, 3], [4, 5, 6]],
    );
  },
});

Deno.test({
  name: "[collections/chunked] n chunks not fitting",
  fn() {
    chunkedTest(
      [testArray, 4],
      [[1, 2, 3, 4], [5, 6]],
    );
    chunkedTest(
      [testArray, 5],
      [[1, 2, 3, 4, 5], [6]],
    );
  },
});

Deno.test({
  name: "[collections/chunked] chunks equal to length",
  fn() {
    chunkedTest(
      [testArray, testArray.length],
      [testArray],
    );
    chunkedTest(
      [["foo"], 1],
      [["foo"]],
    );
  },
});
