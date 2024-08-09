// Copyright 2018-2024 the Deno authors. All rights reserved. MIT license.
import { PCG32_INITIALIZER, SeededRandom } from "./seeded_random.ts";
import { shuffle } from "./shuffle.ts";
import {
  assertAlmostEquals,
  assertEquals,
  assertNotStrictEquals,
} from "@std/assert";

Deno.test("shuffle() handles empty arrays", () => {
  const array: number[] = [];
  const shuffled = shuffle(array);

  assertEquals(shuffled, array);
  assertNotStrictEquals(shuffled, array);
});

Deno.test("shuffle() handles arrays with only one item", () => {
  const array = [1];
  const shuffled = shuffle(array);

  assertEquals(shuffled, array);
  assertNotStrictEquals(shuffled, array);
});

Deno.test("shuffle() shuffles the provided array", () => {
  const { random } = SeededRandom.fromState(PCG32_INITIALIZER);
  const items = [1, 2, 3, 4, 5];

  assertEquals(shuffle(items, { random }), [4, 2, 3, 5, 1]);
  assertEquals(shuffle(items, { random }), [4, 5, 2, 3, 1]);
  assertEquals(shuffle(items, { random }), [2, 1, 3, 5, 4]);
});

Deno.test("shuffle() returns a copy and without modifying the original array", () => {
  const items = [1, 2, 3, 4, 5];
  const originalItems = [...items];

  for (let i = 0; i < 10; ++i) {
    shuffle(items);
    assertEquals(items, originalItems);
  }
});

Deno.test("shuffle() gives relatively uniform distribution of results", () => {
  const { random } = SeededRandom.fromState(PCG32_INITIALIZER);
  const items = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];

  const results = Array.from({ length: 1e3 }, () => shuffle(items, { random }));

  for (const idx of items.keys()) {
    const groupsByidx = Object.values(
      Object.groupBy(results.map((result) => result[idx]), (item) => item!),
    ) as number[][];

    for (const group of groupsByidx) {
      assertAlmostEquals(
        group.length,
        results.length / items.length,
        results.length / 10,
      );
    }
  }
});
