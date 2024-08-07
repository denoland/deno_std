// Copyright 2018-2024 the Deno authors. All rights reserved. MIT license.

import { assertEquals } from "@std/assert";
import { encodeHex } from "./hex.ts";
import { HexDecoderStream, HexEncoderStream } from "./hex_stream.ts";

Deno.test("HexEncoderStream() encodes stream", async () => {
  const readable = (await Deno.open("./deno.lock"))
    .readable
    .pipeThrough(
      new TransformStream({
        transform(chunk, controller) {
          const i = Math.floor(Math.random() * chunk.length);
          controller.enqueue(chunk.slice(0, i));
          controller.enqueue(chunk.slice(i));
        },
      }),
    )
    .pipeThrough(new HexEncoderStream());

  assertEquals(
    (await Array.fromAsync(readable)).join(""),
    encodeHex(await Deno.readFile("./deno.lock")),
  );
});

Deno.test("HexDecoderStream() decodes stream", async () => {
  const readable = (await Deno.open("./deno.lock"))
    .readable
    .pipeThrough(new HexEncoderStream())
    .pipeThrough(
      new TransformStream({
        transform(chunk, controller) {
          const i = Math.floor(Math.random() * chunk.length);
          controller.enqueue(chunk.slice(0, i));
          controller.enqueue(chunk.slice(i));
        },
      }),
    )
    .pipeThrough(new HexDecoderStream());

  assertEquals(
    Uint8Array.from(
      (await Array.fromAsync(readable)).map((x) => [...x]).flat(),
    ),
    await Deno.readFile("./deno.lock"),
  );
});
