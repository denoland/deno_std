// Copyright 2018-2024 the Deno authors. All rights reserved. MIT license.
import { assert, assertEquals } from "@std/assert";
import { LruCache } from "./lru_cache.ts";

Deno.test("LruCache deletes least-recently-used", () => {
  const cache = new LruCache(3);

  cache.set(1, "!");
  cache.set(2, "!");
  cache.set(1, "updated");
  cache.set(3, "!");
  cache.set(4, "!");

  assertEquals(cache.size, 3);
  assert(!cache.has(2));
  assertEquals([...cache.keys()], [1, 3, 4]);
  assertEquals(cache.get(3), "!");
  assertEquals(cache.get(1), "updated");

  cache.delete(3);
  assertEquals(cache.size, 2);
});
