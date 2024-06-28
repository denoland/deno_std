// Copyright 2018-2024 the Deno authors. All rights reserved. MIT license.
import {
  TarStream,
  type TarStreamInput,
  validTarStreamOptions,
} from "./tar_stream.ts";
import { assertEquals, assertRejects } from "../assert/mod.ts";

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
    Error,
    "Invalid Size Provided! Size cannot exceed 8 GiBs by default or 64 GiBs with sizeExtension set to true.",
  );
});

Deno.test("TarStream() with 9 GiB size", async () => {
  const size = 1024 ** 3 * 9;
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
    Error,
    "Invalid Size Provided! Size cannot exceed 8 GiBs by default or 64 GiBs with sizeExtension set to true.",
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
      sizeExtension: true,
    },
  ])
    .pipeThrough(new TarStream());

  await assertRejects(
    async function () {
      await Array.fromAsync(readable);
    },
    Error,
    "Invalid Size Provided! Size cannot exceed 8 GiBs by default or 64 GiBs with sizeExtension set to true.",
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
    Error,
    "Invalid Size Provided! Size cannot exceed 8 GiBs by default or 64 GiBs with sizeExtension set to true.",
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
