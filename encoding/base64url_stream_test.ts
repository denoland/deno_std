// Copyright 2018-2024 the Deno authors. All rights reserved. MIT license.

import { assertEquals } from "@std/assert";
import { encodeBase64Url } from "./base64url.ts";
import {
  Base64UrlDecoderStream,
  Base64UrlEncoderStream,
} from "./base64url_stream.ts";

Deno.test("Base64UrlEncoderStream() encodes stream", async () => {
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
    .pipeThrough(new Base64UrlEncoderStream());

  assertEquals(
    (await Array.fromAsync(readable)).join(""),
    encodeBase64Url(await Deno.readFile("./deno.lock")),
  );
});

Deno.test("Base64UrlDecoderStream() decodes stream", async () => {
  const readable = (await Deno.open("./deno.lock"))
    .readable
    .pipeThrough(new Base64UrlEncoderStream())
    .pipeThrough(
      new TransformStream({
        transform(chunk, controller) {
          const i = Math.floor(Math.random() * chunk.length);
          controller.enqueue(chunk.slice(0, i));
          controller.enqueue(chunk.slice(i));
        },
      }),
    )
    .pipeThrough(new Base64UrlDecoderStream());

  assertEquals(
    Uint8Array.from(
      (await Array.fromAsync(readable)).map((x) => [...x]).flat(),
    ),
    await Deno.readFile("./deno.lock"),
  );
});
