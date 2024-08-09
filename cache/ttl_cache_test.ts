// Copyright 2018-2024 the Deno authors. All rights reserved. MIT license.
import { assertEquals } from "@std/assert";
import { TtlCache } from "./ttl_cache.ts";
import { delay } from "@std/async/delay";

Deno.test("TtlCache deletes entries after they expire", async (t) => {
  await t.step("when values are sync", async () => {
    const cache = new TtlCache(10);

    cache.set(1, "!");
    cache.set(2, "!");

    assertEquals(cache.size, 2);

    await delay(5);

    cache.set(1, "!");

    await delay(5);

    assertEquals(cache.size, 1);

    await delay(8);

    assertEquals(cache.size, 0);
  });

  await t.step("when values are promises", async () => {
    const cache = new TtlCache(10);

    cache.set(1, delay(10));

    assertEquals(cache.size, 1);

    await delay(15);

    assertEquals(cache.size, 1);

    await delay(10);

    assertEquals(cache.size, 0);
  });

  await t.step("custom TTL", async () => {
    const cache = new TtlCache(10);

    cache.set(1, "!");
    cache.set(2, "!", 3);

    assertEquals(cache.size, 2);

    await delay(5);

    assertEquals(cache.size, 1);

    await delay(5);

    assertEquals(cache.size, 0);
  });
});
