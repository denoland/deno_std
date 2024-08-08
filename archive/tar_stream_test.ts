// Copyright 2018-2024 the Deno authors. All rights reserved. MIT license.
import {
  parsePathname,
  TarStream,
  type TarStreamInput,
  validTarStreamOptions,
} from "./tar_stream.ts";
import { assertEquals, assertRejects } from "../assert/mod.ts";
import { assert } from "../assert/assert.ts";

Deno.test("TarStream() with default stream", async () => {
  const text = new TextEncoder().encode("Hello World!");

  const reader = ReadableStream.from<TarStreamInput>([
    {
      pathname: "./potato",
    },
    {
      pathname: "./text.txt",
      size: text.length,
      iterable: [text.slice()],
    },
  ])
    .pipeThrough(new TarStream())
    .getReader();

  let size = 0;
  while (true) {
    const { done, value } = await reader.read();
    if (done) {
      break;
    }
    size += value.length;
  }
  assertEquals(size, 512 + 512 + Math.ceil(text.length / 512) * 512 + 1024);
});

Deno.test("TarStream() with byte stream", async () => {
  const text = new TextEncoder().encode("Hello World!");

  const reader = ReadableStream.from<TarStreamInput>([
    {
      pathname: "./potato",
    },
    {
      pathname: "./text.txt",
      size: text.length,
      iterable: [text.slice()],
    },
  ])
    .pipeThrough(new TarStream())
    .getReader({ mode: "byob" });

  let size = 0;
  while (true) {
    const { done, value } = await reader.read(
      new Uint8Array(Math.ceil(Math.random() * 1024)),
    );
    if (done) {
      break;
    }
    size += value.length;
  }
  assertEquals(size, 512 + 512 + Math.ceil(text.length / 512) * 512 + 1024);
});

Deno.test("TarStream() with negative size", async () => {
  const text = new TextEncoder().encode("Hello World");

  const readable = ReadableStream.from<TarStreamInput>([
    {
      pathname: "name",
      size: -text.length,
      iterable: [text.slice()],
    },
  ])
    .pipeThrough(new TarStream());

  await assertRejects(
    async function () {
      await Array.fromAsync(readable);
    },
    "Invalid Size Provided! Size cannot exceed 64 Gibs.",
  );
});

Deno.test("TarStream() with 65 GiB size", async () => {
  const size = 1024 ** 3 * 65;
  const step = 1024; // Size must equally be divisible by step
  const iterable = function* () {
    for (let i = 0; i < size; i += step) {
      yield new Uint8Array(step).map(() => Math.floor(Math.random() * 256));
    }
  }();

  const readable = ReadableStream.from<TarStreamInput>([
    {
      pathname: "name",
      size,
      iterable,
    },
  ])
    .pipeThrough(new TarStream());

  await assertRejects(
    async function () {
      await Array.fromAsync(readable);
    },
    "Invalid Size Provided! Size cannot exceed 64 Gibs.",
  );
});

Deno.test("TarStream() with NaN size", async () => {
  const size = NaN;
  const step = 1024; // Size must equally be divisible by step
  const iterable = function* () {
    for (let i = 0; i < size; i += step) {
      yield new Uint8Array(step).map(() => Math.floor(Math.random() * 256));
    }
  }();

  const readable = ReadableStream.from<TarStreamInput>([
    {
      pathname: "name",
      size,
      iterable,
    },
  ])
    .pipeThrough(new TarStream());

  await assertRejects(
    async function () {
      await Array.fromAsync(readable);
    },
    "Invalid Size Provided! Size cannot exceed 64 Gibs.",
  );
});

Deno.test("parsePathname()", () => {
  const encoder = new TextEncoder();

  assertEquals(
    parsePathname(
      "./Veeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeery/LongPath",
    ),
    [
      encoder.encode(
        "./Veeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeery",
      ),
      encoder.encode("LongPath"),
    ],
  );

  assertEquals(
    parsePathname(
      "./some random path/with/loooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooong/path",
    ),
    [
      encoder.encode("./some random path"),
      encoder.encode(
        "with/loooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooong/path",
      ),
    ],
  );

  assertEquals(
    parsePathname(
      "./some random path/with/loooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooong/file",
    ),
    [
      encoder.encode("./some random path"),
      encoder.encode(
        "with/loooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooong/file",
      ),
    ],
  );
});

Deno.test("validTarStreamOptions()", () => {
  assertEquals(validTarStreamOptions({}), true);

  assertEquals(validTarStreamOptions({ mode: "" }), true);
  assertEquals(validTarStreamOptions({ mode: "000" }), true);
  assertEquals(validTarStreamOptions({ mode: "008" }), false);
  assertEquals(validTarStreamOptions({ mode: "0000000" }), false);

  assertEquals(validTarStreamOptions({ uid: "" }), true);
  assertEquals(validTarStreamOptions({ uid: "000" }), true);
  assertEquals(validTarStreamOptions({ uid: "008" }), false);
  assertEquals(validTarStreamOptions({ uid: "0000000" }), false);

  assertEquals(validTarStreamOptions({ gid: "" }), true);
  assertEquals(validTarStreamOptions({ gid: "000" }), true);
  assertEquals(validTarStreamOptions({ gid: "008" }), false);
  assertEquals(validTarStreamOptions({ gid: "0000000" }), false);

  assertEquals(validTarStreamOptions({ mtime: 0 }), true);
  assertEquals(validTarStreamOptions({ mtime: NaN }), false);
  assertEquals(
    validTarStreamOptions({ mtime: Math.floor(new Date().getTime() / 1000) }),
    true,
  );
  assertEquals(validTarStreamOptions({ mtime: new Date().getTime() }), false);

  assertEquals(validTarStreamOptions({ uname: "" }), true);
  assertEquals(validTarStreamOptions({ uname: "abcdef" }), true);
  assertEquals(validTarStreamOptions({ uname: "å-abcdef" }), false);
  assertEquals(validTarStreamOptions({ uname: "a".repeat(100) }), false);

  assertEquals(validTarStreamOptions({ gname: "" }), true);
  assertEquals(validTarStreamOptions({ gname: "abcdef" }), true);
  assertEquals(validTarStreamOptions({ gname: "å-abcdef" }), false);
  assertEquals(validTarStreamOptions({ gname: "a".repeat(100) }), false);

  assertEquals(validTarStreamOptions({ devmajor: "" }), true);
  assertEquals(validTarStreamOptions({ devmajor: "000" }), true);
  assertEquals(validTarStreamOptions({ devmajor: "008" }), false);
  assertEquals(validTarStreamOptions({ devmajor: "000000000" }), false);

  assertEquals(validTarStreamOptions({ devminor: "" }), true);
  assertEquals(validTarStreamOptions({ devminor: "000" }), true);
  assertEquals(validTarStreamOptions({ devminor: "008" }), false);
  assertEquals(validTarStreamOptions({ devminor: "000000000" }), false);
});

Deno.test("TarStream() with invalid options", async () => {
  const readable = ReadableStream.from<TarStreamInput>([
    { pathname: "potato", options: { mode: "009" } },
  ]).pipeThrough(new TarStream());

  let threw = false;
  try {
    // deno-lint-ignore no-empty
    for await (const _ of readable) {}
  } catch (error) {
    threw = true;
    assert(typeof error === "string");
    assertEquals(error, "Invalid Options Provided!");
  }
  assertEquals(threw, true);
});

Deno.test("TarStream() with invalid pathname", async () => {
  const readable = ReadableStream.from<TarStreamInput>([
    { pathname: [new Uint8Array(156), new Uint8Array(0)] },
  ]).pipeThrough(new TarStream());

  let threw = false;
  try {
    // deno-lint-ignore no-empty
    for await (const _ of readable) {}
  } catch (error) {
    threw = true;
    assert(typeof error === "string");
    assertEquals(
      error,
      "Invalid Pathname. Pathnames, when provided as a Uint8Array, need to be no more than [155, 100] bytes respectively.",
    );
  }
  assertEquals(threw, true);
});

Deno.test("TarStream() with mismatching sizes", async () => {
  const text = new TextEncoder().encode("Hello World!");
  const readable = ReadableStream.from<TarStreamInput>([
    {
      pathname: "potato",
      size: text.length + 1,
      iterable: [text.slice()],
    },
  ]).pipeThrough(new TarStream());

  let threw = false;
  try {
    // deno-lint-ignore no-empty
    for await (const _ of readable) {}
  } catch (error) {
    threw = true;
    assert(error instanceof Error);
    assertEquals(
      error.message,
      "Invalid Tarball! Provided size did not match bytes read from provided iterable.",
    );
  }
  assertEquals(threw, true);
});

Deno.test("parsePathname() with too long path", () => {
  let threw = false;
  try {
    parsePathname("0".repeat(300));
  } catch (error) {
    threw = true;
    assert(error instanceof Error);
    assertEquals(
      error.message,
      "Invalid Pathname! Pathname cannot exceed 256 bytes.",
    );
  }
  assertEquals(threw, true);
});

Deno.test("parsePathname() with too long path", () => {
  let threw = false;
  try {
    parsePathname("0".repeat(160) + "/");
  } catch (error) {
    threw = true;
    assert(error instanceof Error);
    assertEquals(
      error.message,
      "Invalid Pathname! Pathname needs to be split-able on a forward slash separator into [155, 100] bytes respectively.",
    );
  }
  assertEquals(threw, true);
});
