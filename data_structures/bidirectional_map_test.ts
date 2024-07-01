// Copyright 2018-2024 the Deno authors. All rights reserved. MIT license.
import { BidirectionalMap } from "./bidirectional_map.ts";
import { assertEquals } from "@std/assert/assert-equals";

function createBidirectionalMap() {
  return new BidirectionalMap<string, number>([
    ["one", 1],
    ["two", 2],
    ["three", 3],
  ]);
}

Deno.test("BidirectionalMap.get()", () => {
  const map = createBidirectionalMap();

  assertEquals(map.get("one"), 1);
  assertEquals(map.get("two"), 2);
  assertEquals(map.get("three"), 3);
});

Deno.test("BidirectionalMap.reverseGet()", () => {
  const map = createBidirectionalMap();

  assertEquals(map.reverseGet(1), "one");
  assertEquals(map.reverseGet(2), "two");
  assertEquals(map.reverseGet(3), "three");
});

Deno.test("BidirectionalMap.set()", () => {
  const map = createBidirectionalMap();

  map.set("four", 4);
  assertEquals(map.get("four"), 4);
  assertEquals(map.reverseGet(4), "four");
});

Deno.test("BidirectionalMap.has()", () => {
  const map = createBidirectionalMap();

  assertEquals(map.has("one"), true);
  assertEquals(map.has("two"), true);
  assertEquals(map.has("three"), true);
  assertEquals(map.has("four"), false);
});

Deno.test("BidirectionalMap.reverseHas()", () => {
  const map = createBidirectionalMap();

  assertEquals(map.reverseHas(1), true);
  assertEquals(map.reverseHas(2), true);
  assertEquals(map.reverseHas(3), true);
  assertEquals(map.reverseHas(4), false);
});

Deno.test("BidirectionalMap.delete()", () => {
  const map = createBidirectionalMap();

  assertEquals(map.delete("one"), true);
  assertEquals(map.has("one"), false);
  assertEquals(map.reverseHas(1), false);
});

Deno.test("BidirectionalMap.reverseDelete()", () => {
  const map = createBidirectionalMap();

  assertEquals(map.reverseDelete(1), true);
  assertEquals(map.has("one"), false);
  assertEquals(map.reverseHas(1), false);
});

Deno.test("BidirectionalMap.clear()", () => {
  const map = createBidirectionalMap();

  map.clear();
  assertEquals(map.size, 0);
});
