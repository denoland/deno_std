// Copyright 2018-2024 the Deno authors. All rights reserved. MIT license.

import { assert, assertEquals } from "@std/assert";

import { eTag, ifMatch, ifNoneMatch } from "./etag.ts";

const encoder = new TextEncoder();

Deno.test({
  name: "eTag() handles empty string",
  async fn() {
    const actual = await eTag("");
    assertEquals(actual, `"0-47DEQpj8HBSa+/TImW+5JCeuQeR"`);
  },
});

Deno.test({
  name: "eTag() handles string",
  async fn() {
    const actual = await eTag("hello deno");
    assertEquals(actual, `"a-YdfmHmj2RiwOVqJupcf3PLK9PuJ"`);
  },
});

Deno.test({
  name: "eTag() handles empty Uint8Array",
  async fn() {
    const actual = await eTag(new Uint8Array());
    assertEquals(actual, `"0-47DEQpj8HBSa+/TImW+5JCeuQeR"`);
  },
});

Deno.test({
  name: "eTag() handles Uint8Array",
  async fn() {
    const actual = await eTag(encoder.encode("hello deno"));
    assertEquals(actual, `"a-YdfmHmj2RiwOVqJupcf3PLK9PuJ"`);
  },
});

Deno.test({
  name: "eTag() handles Deno.FileInfo",
  async fn() {
    const fixture: Deno.FileInfo = {
      isFile: true,
      isDirectory: false,
      isSymlink: false,
      size: 1024,
      mtime: new Date(Date.UTC(96, 1, 2, 3, 4, 5, 6)),
      atime: null,
      birthtime: null,
      dev: 0,
      ino: null,
      mode: null,
      nlink: null,
      uid: null,
      gid: null,
      rdev: null,
      blksize: null,
      blocks: null,
      isBlockDevice: null,
      isCharDevice: null,
      isFifo: null,
      isSocket: null,
    };
    const actual = await eTag(fixture);
    assertEquals(actual, `W/"400-H0YzXysQPV20qNisAZMuvAEVuHV"`);
  },
});

Deno.test({
  name: "ifMatch()",
  async fn() {
    assert(!ifMatch(`"abcdefg"`, await eTag("hello deno")));
    assert(
      ifMatch(`"a-YdfmHmj2RiwOVqJupcf3PLK9PuJ"`, await eTag("hello deno")),
    );
    assert(
      ifMatch(
        `"abcdefg", "a-YdfmHmj2RiwOVqJupcf3PLK9PuJ"`,
        await eTag("hello deno"),
      ),
    );
    assert(ifMatch("*", await eTag("hello deno")));
    assert(
      !ifMatch(
        "*",
        await eTag({
          size: 1024,
          mtime: new Date(Date.UTC(96, 1, 2, 3, 4, 5, 6)),
        }),
      ),
    );
  },
});

Deno.test({
  name: "ifNoneMatch()",
  async fn() {
    assert(ifNoneMatch(`"abcdefg"`, await eTag("hello deno")));
    assert(
      !ifNoneMatch(
        `"a-YdfmHmj2RiwOVqJupcf3PLK9PuJ"`,
        await eTag("hello deno"),
      ),
    );
    assert(
      !ifNoneMatch(
        `"abcdefg", "a-YdfmHmj2RiwOVqJupcf3PLK9PuJ"`,
        await eTag("hello deno"),
      ),
    );
    assert(!ifNoneMatch("*", await eTag("hello deno")));
    assert(
      !ifNoneMatch(
        `W/"400-H0YzXysQPV20qNisAZMuvAEVuHV"`,
        await eTag({
          size: 1024,
          mtime: new Date(Date.UTC(96, 1, 2, 3, 4, 5, 6)),
        }),
      ),
    );
    assert(
      !ifNoneMatch(
        `"400-H0YzXysQPV20qNisAZMuvAEVuHV"`,
        await eTag({
          size: 1024,
          mtime: new Date(Date.UTC(96, 1, 2, 3, 4, 5, 6)),
        }),
      ),
    );
  },
});
