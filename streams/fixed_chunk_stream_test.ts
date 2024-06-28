// Copyright 2018-2024 the Deno authors. All rights reserved. MIT license.

import { assertEquals } from "@std/assert";
import { FixedChunkStream } from "./fixed_chunk_stream.ts";

Deno.test("FixedChunkStream", async () => {
  const readable = ReadableStream.from(function* () {
    for (let i = 0; i < 100; ++i) {
      yield new Uint8Array(Math.floor(Math.random() * 1000));
    }
  }())
    .pipeThrough(new FixedChunkStream(512));

  assertEquals(
    (await Array.fromAsync(readable))
      .slice(0, -1)
      .every((chunk) => chunk.length === 512),
    true,
  );
});
