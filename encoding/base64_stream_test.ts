// Copyright 2018-2024 the Deno authors. All rights reserved. MIT license.

import { assertEquals } from "@std/assert";
import { encodeBase64 } from "./base64.ts";
import { Base64DecoderStream, Base64EncoderStream } from "./base64_stream.ts";

Deno.test("Base64EncoderStream() encodes stream", async () => {
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
    .pipeThrough(new Base64EncoderStream());

  assertEquals(
    (await Array.fromAsync(readable)).join(""),
    encodeBase64(await Deno.readFile("./deno.lock")),
  );
});

Deno.test("Base64DecoderStream() decodes stream", async () => {
  const readable = (await Deno.open("./deno.lock"))
    .readable
    .pipeThrough(new Base64EncoderStream())
    .pipeThrough(
      new TransformStream({
        transform(chunk, controller) {
          const i = Math.floor(Math.random() * chunk.length);
          controller.enqueue(chunk.slice(0, i));
          controller.enqueue(chunk.slice(i));
        },
      }),
    )
    .pipeThrough(new Base64DecoderStream());

  assertEquals(
    Uint8Array.from(
      (await Array.fromAsync(readable)).map((x) => [...x]).flat(),
    ),
    await Deno.readFile("./deno.lock"),
  );
});
