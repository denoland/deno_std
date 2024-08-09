// Copyright 2018-2024 the Deno authors. All rights reserved. MIT license.

import { sample } from "./sample.ts";
import {
  assert,
  assertAlmostEquals,
  assertEquals,
  assertThrows,
} from "@std/assert";
import { PCG32_INITIALIZER, SeededRandom } from "./seeded_random.ts";

Deno.test({
  name: "sample() handles no mutation",
  fn() {
    const array = ["a", "abc", "ba"];
    sample(array);

    assertEquals(array, ["a", "abc", "ba"]);
  },
});

Deno.test({
  name: "sample() handles empty input",
  fn() {
    const actual = sample([]);
    assertEquals(actual, undefined);
  },
});

Deno.test({
  name: "sample() handles array of numbers",
  fn() {
    const input = [1, 2, 3];
    const actual = sample([1, 2, 3]);

    assert(actual && input.includes(actual));
  },
});

Deno.test({
  name: "sample() handles array of objects",
  fn() {
    const input = [
      {
        name: "Anna",
        age: 18,
      },
      {
        name: "Kim",
        age: 24,
      },
    ];
    const actual = sample(input);

    assert(actual && input.includes(actual));
  },
});

Deno.test("sample() returns undefined if the array is empty", () => {
  const items: string[] = [];
  assertEquals(sample(items), undefined);
});

Deno.test("sample() picks a random item from the provided items", () => {
  const items = ["a", "b", "c"];
  const { random } = SeededRandom.fromState(PCG32_INITIALIZER);

  const picks = Array.from({ length: 10 }, () => sample(items, { random }));

  assertEquals(picks, ["a", "a", "c", "c", "a", "b", "b", "a", "c", "c"]);
});

Deno.test("sample() with weights returns undefined if the array is empty", () => {
  const items: unknown[] = [];
  const weights: number[] = [];
  assertEquals(sample(items, { weights }), undefined);
});

Deno.test("sample() with weights throws if the total weight is 0", () => {
  const items = ["a", "b", "c"];
  const weights = [0, 0, 0];

  assertThrows(
    () => sample(items, { weights }),
    RangeError,
    "Total weight must be greater than 0",
  );
});

Deno.test("sample() with weights never picks an item with weight of 0", () => {
  const items = ["a", "b"];
  const weights = [1, 0];

  assertEquals(sample(items, { weights }), "a");
});

Deno.test("sample() with weights picks a random item from the provided items with a weighted probability", () => {
  const weightedItems = [["a", 1], ["b", 2], ["c", 3]] as const;
  const weights = weightedItems.map(([, weight]) => weight);
  const values = weightedItems.map(([value]) => value);
  const totalWeight = weights.reduce((sum, n) => sum + n, 0);
  const { random } = SeededRandom.fromState(PCG32_INITIALIZER);

  const picks = Array.from(
    { length: 1000 },
    () => sample(values, { random, weights }),
  );

  const groups = Object.values(
    Object.groupBy(picks, (item) => item!),
  ) as string[][];

  assertEquals(groups.length, 3);

  for (const group of groups) {
    const [, weight] = weightedItems.find(([item]) => item === group[0]!)!;
    assertAlmostEquals(
      group.length,
      picks.length / totalWeight * weight,
      picks.length / 10,
    );
  }
});

Deno.test("sample() with weights works with a Map", () => {
  const weightedItems = new Map([["a", 1], ["b", 2], ["c", 999]]);
  const { random } = SeededRandom.fromState(PCG32_INITIALIZER);

  const result = sample([...weightedItems.keys()], {
    weights: [...weightedItems.values()],
    random,
  });

  assertEquals(result, "c");
});
