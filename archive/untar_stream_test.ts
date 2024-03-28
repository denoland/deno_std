// Copyright 2018-2023 the Deno authors. All rights reserved. MIT license.
/**
 * Tar test
 *
 * **test summary**
 * - create a tar archive in memory containing output.txt and dir/tar.ts.
 * - read and deflate a tar archive containing output.txt
 *
 * **to run this test**
 * deno run --allow-read archive/tar_test.ts
 */
import { assert, assertEquals } from "../assert/mod.ts";
import { dirname, fromFileUrl, resolve } from "../path/mod.ts";
import { TarMeta, UntarStream } from "./untar_stream.ts";
import { Buffer } from "../streams/buffer.ts";
import { type TarOptions, TarStream } from "./tar_stream.ts";
import { toArrayBuffer } from "../streams/to_array_buffer.ts";
import { toText } from "../streams/to_text.ts";

const moduleDir = dirname(fromFileUrl(import.meta.url));
const testdataDir = resolve(moduleDir, "testdata");
const filePath = resolve(testdataDir, "example.txt");

async function getTarOptions(): Promise<TarOptions[]> {
  const file = await Deno.open(filePath, { read: true });
  return [
    {
      name: "output.txt",
      readable: ReadableStream.from([
        new TextEncoder().encode("hello tar world!"),
      ]),
      contentSize: 16,
    },
    {
      name: "dir/tar.ts",
      readable: file.readable,
      contentSize: file.statSync().size,
    },
  ];
}

Deno.test("deflateTarArchive", async () => {
  const fileName = "output.txt";
  const text = "hello tar world!";
  const content = new TextEncoder().encode(text);

  const untar = new UntarStream();
  await ReadableStream.from<TarOptions>([
    {
      name: fileName,
      readable: ReadableStream.from([content]),
      contentSize: content.byteLength,
    },
  ]).pipeThrough(new TarStream())
    .pipeTo(untar.writable);

  const reader = untar.readable.getReader();
  const result = await reader.read();
  assert(!result.done);

  const untarText = await toText(result.value.readable);

  assert((await reader.read()).done); // EOF
  // tests
  assertEquals(result.value.fileName, fileName);
  assertEquals(untarText, text);
});

Deno.test("untarAsyncIterator", async () => {
  const entries = await getTarOptions();

  const untar = new UntarStream();
  await ReadableStream.from<TarOptions>(entries)
    .pipeThrough(new TarStream())
    .pipeTo(untar.writable);

  let lastEntry;
  for await (const entry of untar.readable) {
    const expected = entries.shift();
    assert(expected);

    const buffer = new Buffer();
    await entry.readable.pipeTo(buffer.writable);
    assertEquals(
      await toArrayBuffer(expected.readable),
      await toArrayBuffer(buffer.readable),
    );
    assertEquals(expected.name, entry.fileName);

    if (lastEntry) assert(lastEntry.consumed);
    lastEntry = entry;
  }
  assert(lastEntry);
  assert(lastEntry.consumed);
  assertEquals(entries.length, 0);
});

Deno.test("untarAsyncIteratorWithoutReadingBody", async () => {
  const entries: TarOptions[] = await getTarOptions();

  const tar = ReadableStream.from<TarOptions>(entries)
    .pipeThrough(new TarStream());

  const untar = new UntarStream();
  // read data from a tar archive
  await tar.pipeTo(untar.writable);

  for await (const entry of untar.readable) {
    const expected = entries.shift();
    assert(expected);
    assertEquals(expected.name, entry.fileName);
  }

  assertEquals(entries.length, 0);
});

Deno.test(
  "untarAsyncIteratorWithoutReadingBodyFromFileReadable",
  async () => {
    const filePath = resolve(testdataDir, "test_stream.tar");
    const file = await Deno.open(filePath, { read: true });

    const entries = await getTarOptions();

    for await (const entry of file.readable.pipeThrough(new UntarStream())) {
      const expected = entries.shift();
      assert(expected);
      assertEquals(expected.name, entry.fileName);
    }

    assertEquals(entries.length, 0);
  },
);

Deno.test("untarAsyncIteratorFromFileReadable", async function () {
  const filePath = resolve(testdataDir, "test_stream.tar");
  const file = await Deno.open(filePath, { read: true });

  const entries = await getTarOptions();

  for await (const entry of file.readable.pipeThrough(new UntarStream())) {
    const expected = entries.shift();
    assert(expected);

    assertEquals(
      await toArrayBuffer(expected.readable),
      await toArrayBuffer(entry.readable),
    );
    assertEquals(expected.name, entry.fileName);
  }

  assertEquals(entries.length, 0);
});

function getEntries(): TarOptions[] {
  return [
    {
      name: "output.txt",
      readable: ReadableStream.from([
        new TextEncoder().encode("hello tar world!".repeat(100)),
      ]),
      contentSize: 1600,
    },
    // Need to test at least two files, to make sure the first entry doesn't over-read
    // Causing the next to fail with: checksum error
    {
      name: "deni.txt",
      readable: ReadableStream.from([
        new TextEncoder().encode("deno!".repeat(250)),
      ]),
      contentSize: 1250,
    },
  ];
}

Deno.test(
  "untarAsyncIteratorReadingLessThanRecordSize",
  async function (t) {
    // record size is 512
    const bufSizes = [1, 53, 256, 511];

    for (const bufSize of bufSizes) {
      await t.step(bufSize.toString(), async () => {
        const untar = ReadableStream.from<TarOptions>(getEntries())
          .pipeThrough(new TarStream())
          .pipeThrough(new UntarStream());

        const assertEntries = getEntries();
        // read data from a tar archive
        for await (const entry of untar) {
          const expected = assertEntries.shift();
          assert(expected);
          assertEquals(expected.name, entry.fileName);
          assertEquals(
            await toArrayBuffer(entry.readable),
            await toArrayBuffer(expected.readable),
          );
        }

        assertEquals(assertEntries.length, 0);
      });
    }
  },
);

Deno.test("untarLinuxGeneratedTar", async function () {
  const filePath = resolve(testdataDir, "deno.tar");
  const file = await Deno.open(filePath, { read: true });

  const expectedEntries = [
    {
      fileName: "archive/",
      fileSize: 0,
      fileMode: 509,
      mtime: 1591800767,
      uid: 1001,
      gid: 1001,
      owner: "deno",
      group: "deno",
      type: "directory",
    },
    {
      fileName: "archive/deno/",
      fileSize: 0,
      fileMode: 509,
      mtime: 1591799635,
      uid: 1001,
      gid: 1001,
      owner: "deno",
      group: "deno",
      type: "directory",
    },
    {
      fileName: "archive/deno/land/",
      fileSize: 0,
      fileMode: 509,
      mtime: 1591799660,
      uid: 1001,
      gid: 1001,
      owner: "deno",
      group: "deno",
      type: "directory",
    },
    {
      fileName: "archive/deno/land/land.txt",
      fileMode: 436,
      fileSize: 5,
      mtime: 1591799660,
      uid: 1001,
      gid: 1001,
      owner: "deno",
      group: "deno",
      type: "file",
      content: "land\n",
    },
    {
      fileName: "archive/file.txt",
      fileMode: 436,
      fileSize: 5,
      mtime: 1591799626,
      uid: 1001,
      gid: 1001,
      owner: "deno",
      group: "deno",
      type: "file",
      content: "file\n",
    },
    {
      fileName: "archive/deno.txt",
      fileMode: 436,
      fileSize: 5,
      mtime: 1591799642,
      uid: 1001,
      gid: 1001,
      owner: "deno",
      group: "deno",
      type: "file",
      content: "deno\n",
    },
  ];

  const untar = new UntarStream();
  await file.readable.pipeTo(untar.writable);

  for await (const entry of untar.readable) {
    const expected = expectedEntries.shift();
    assert(expected);
    const content = expected.content;
    delete expected.content;

    // @ts-ignore its fine
    assertEquals({ ...entry }, expected);

    if (content) {
      const buffer = new Buffer();
      await entry.readable.pipeTo(buffer.writable);
      assertEquals(content, await toText(buffer.readable));
    }
  }
});

Deno.test("untarArchiveWithLink", async function () {
  const filePath = resolve(testdataDir, "with_link.tar");
  const file = await Deno.open(filePath, { read: true });

  type ExpectedEntry = TarMeta & { content?: string };

  const expectedEntries: ExpectedEntry[] = [
    {
      fileName: "hello.txt",
      fileMode: 436,
      fileSize: 14,
      mtime: 1696384910,
      uid: 1000,
      gid: 1000,
      owner: "user",
      group: "user",
      type: "file",
      content: "Hello World!\n\n",
    },
    {
      fileName: "link_to_hello.txt",
      linkName: "./hello.txt",
      fileMode: 511,
      fileSize: 0,
      mtime: 1696384945,
      uid: 1000,
      gid: 1000,
      owner: "user",
      group: "user",
      type: "symlink",
    },
  ];

  for await (const entry of file.readable.pipeThrough(new UntarStream())) {
    const expected = expectedEntries.shift();
    assert(expected);
    const content = expected.content;
    delete expected.content;

    assertEquals({ ...entry }, expected);

    if (content) {
      assertEquals(content, await toText(entry.readable));
    }
  }
});
