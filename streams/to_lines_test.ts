// Copyright 2018-2024 the Deno authors. All rights reserved. MIT license.

import { toLines } from "./to_lines.ts";
import { assertEquals } from "@std/assert";

Deno.test("toLines parses simple input", async () => {
  const stream = ReadableStream.from([
    "qwertzu",
    "iopasd\r\nmnbvc",
    "xylk\rjhgfds\napoiuzt\r",
    "qwr\r09ei\rqwrjiowqr\r",
    "\nrewq0987\n\n654321",
    "\nrewq0987\r\n\r\n654321\r",
  ]).pipeThrough(new TextEncoderStream());

  assertEquals(await Array.fromAsync(toLines(stream)), [
    "qwertzuiopasd",
    "mnbvcxylk\rjhgfds",
    "apoiuzt\rqwr\r09ei\rqwrjiowqr",
    "rewq0987",
    "",
    "654321",
    "rewq0987",
    "",
    "654321\r",
  ]);

  const stream2 = ReadableStream.from("rewq0987\r\n\r\n654321\n").pipeThrough(
    new TextEncoderStream(),
  );

  assertEquals(await Array.fromAsync(toLines(stream2)), [
    "rewq0987",
    "",
    "654321",
  ]);
});

Deno.test("toLines parses large chunks", async () => {
  const totalLines = 20_000;
  const stream = ReadableStream.from("\n".repeat(totalLines)).pipeThrough(
    new TextEncoderStream(),
  );
  const lines = await Array.fromAsync(toLines(stream));

  assertEquals(lines.length, totalLines);
  assertEquals(lines, Array.from({ length: totalLines }).fill(""));
});
