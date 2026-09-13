// Copyright 2018-2026 the Deno authors. MIT license.

import { assert, assertEquals, assertThrows } from "@std/assert";
import { concat } from "@std/bytes";
import { random } from "./_common_test.ts";
import { encodeCbor } from "./encode_cbor.ts";
import { CborTag } from "./tag.ts";
import type { CborType } from "./types.ts";

Deno.test("encodeCbor() encoding undefined", () => {
  assertEquals(
    encodeCbor(undefined),
    new Uint8Array([0b111_10111]),
  );
});

Deno.test("encodeCbor() encoding null", () => {
  assertEquals(encodeCbor(null), new Uint8Array([0b111_10110]));
});

Deno.test("encodeCbor() encoding true", () => {
  assertEquals(encodeCbor(true), new Uint8Array([0b111_10101]));
});

Deno.test("encodeCbor() encoding false", () => {
  assertEquals(encodeCbor(false), new Uint8Array([0b111_10100]));
});

Deno.test("encodeCbor() encoding numbers as Uint", () => {
  let num: number | bigint = random(0, 24);
  assertEquals(encodeCbor(num), new Uint8Array([0b000_00000 + num]));

  num = random(24, 2 ** 8);
  assertEquals(encodeCbor(num), new Uint8Array([0b000_11000, num]));

  num = random(2 ** 8, 2 ** 16);
  assertEquals(
    encodeCbor(num),
    new Uint8Array([0b000_11001, num >> 8 & 0xFF, num & 0xFF]),
  );

  num = random(2 ** 16, 2 ** 32);
  assertEquals(
    encodeCbor(num),
    new Uint8Array([
      0b000_11010,
      num >> 24 & 0xFF,
      num >> 16 & 0xFF,
      num >> 8 & 0xFF,
      num & 0xFF,
    ]),
  );

  // JavaScript fails at correctly bit-wising this many bits as a number.
  num = BigInt(Number.MAX_SAFE_INTEGER);
  assertEquals(
    encodeCbor(Number.MAX_SAFE_INTEGER),
    new Uint8Array(
      [
        0b000_11011,
        num >> 56n & 0xFFn,
        num >> 48n & 0xFFn,
        num >> 40n & 0xFFn,
        num >> 32n & 0xFFn,
        num >> 24n & 0xFFn,
        num >> 16n & 0xFFn,
        num >> 8n & 0xFFn,
        num & 0xFFn,
      ].map((x) => Number(x)),
    ),
  );
});

Deno.test("encodeCbor() encoding numbers as Int", () => {
  const num = -random(1, 24); // -0 === 0
  assertEquals(
    encodeCbor(num),
    new Uint8Array([0b001_00000 + (-num - 1)]),
  );
});

Deno.test("encodeCbor() encoding numbers as Float", () => {
  const num = Math.random() * 2 ** 32;
  const view = new DataView(new ArrayBuffer(8));
  view.setFloat64(0, num);
  assertEquals(
    encodeCbor(num),
    concat([new Uint8Array([0b111_11011]), new Uint8Array(view.buffer)]),
  );
});

Deno.test("encodeCbor() encoding bigints as Uint", () => {
  let num = BigInt(random(0, 24));
  assertEquals(
    encodeCbor(num),
    new Uint8Array([0b000_00000 + Number(num)]),
  );

  num = BigInt(random(24, 2 ** 8));
  assertEquals(encodeCbor(num), new Uint8Array([0b000_11000, Number(num)]));

  num = BigInt(random(2 ** 8, 2 ** 16));
  assertEquals(
    encodeCbor(num),
    new Uint8Array([
      0b000_11001,
      Number(num >> 8n & 0xFFn),
      Number(num & 0xFFn),
    ]),
  );

  num = BigInt(random(2 ** 16, 2 ** 32));
  assertEquals(
    encodeCbor(num),
    new Uint8Array([
      0b000_11010,
      Number(num >> 24n & 0xFFn),
      Number(num >> 16n & 0xFFn),
      Number(num >> 8n & 0xFFn),
      Number(num & 0xFFn),
    ]),
  );

  num = BigInt(random(2 ** 32, 2 ** 64));
  assertEquals(
    encodeCbor(num),
    new Uint8Array([
      0b000_11011,
      Number(num >> 56n & 0xFFn),
      Number(num >> 48n & 0xFFn),
      Number(num >> 40n & 0xFFn),
      Number(num >> 32n & 0xFFn),
      Number(num >> 24n & 0xFFn),
      Number(num >> 16n & 0xFFn),
      Number(num >> 8n & 0xFFn),
      Number(num & 0xFFn),
    ]),
  );
});

Deno.test("encodeCbor() encoding bigints as Int", () => {
  const num = -BigInt(random(1, 24)); // -0 === 0
  assertEquals(
    encodeCbor(num),
    new Uint8Array([0b001_00000 + Number(-num - 1n)]),
  );
});

Deno.test("encodeCbor() encoding strings", () => {
  const decoder = new TextDecoder();

  let bytes = new Uint8Array(random(0, 24)).map((_) => random(97, 123)); // Range: `a` - `z`
  assertEquals(
    encodeCbor(decoder.decode(bytes)),
    new Uint8Array([0b011_00000 + bytes.length, ...bytes]),
  );

  bytes = new Uint8Array(random(24, 2 ** 8)).map((_) => random(97, 123)); // Range: `a` - `z`
  assertEquals(
    encodeCbor(decoder.decode(bytes)),
    new Uint8Array([0b011_11000, bytes.length, ...bytes]),
  );

  bytes = new Uint8Array(random(2 ** 8, 2 ** 16)).map((_) => random(97, 123)); // Range: `a` - `z`
  assertEquals(
    encodeCbor(decoder.decode(bytes)),
    new Uint8Array([
      0b011_11001,
      bytes.length >> 8 & 0xFF,
      bytes.length & 0xFF,
      ...bytes,
    ]),
  );

  bytes = new Uint8Array(random(2 ** 16, 2 ** 17)).map((_) => random(97, 123)); // Range: `a` - `z`
  assertEquals(
    encodeCbor(decoder.decode(bytes)),
    new Uint8Array([
      0b011_11010,
      bytes.length >> 24 & 0xFF,
      bytes.length >> 16 & 0xFF,
      bytes.length >> 8 & 0xFF,
      bytes.length & 0xFF,
      ...bytes,
    ]),
  );

  // Can't test the next bracket up due to JavaScript limitations.
});

Deno.test("encodeCbor() correctly preallocates enough space for strings", () => {
  const input = "\uD83D\uDCA9";
  const binary = new TextEncoder().encode(input);
  assert(input.length !== binary.length);
  assertEquals(
    encodeCbor(input),
    new Uint8Array([0b011_00100, ...binary]),
  );
});

Deno.test("encodeCbor() encoding Uint8Arrays", () => {
  let bytes = new Uint8Array(random(0, 24));
  assertEquals(
    encodeCbor(bytes),
    new Uint8Array([0b010_00000 + bytes.length, ...bytes]),
  );

  bytes = new Uint8Array(random(24, 2 ** 8));
  assertEquals(
    encodeCbor(bytes),
    new Uint8Array([0b010_11000, bytes.length, ...bytes]),
  );

  bytes = new Uint8Array(random(2 ** 8, 2 ** 16));
  assertEquals(
    encodeCbor(bytes),
    new Uint8Array([
      0b010_11001,
      bytes.length >> 8 & 0xFF,
      bytes.length & 0xFF,
      ...bytes,
    ]),
  );

  bytes = new Uint8Array(random(2 ** 16, 2 ** 17));
  assertEquals(
    encodeCbor(bytes),
    new Uint8Array([
      0b010_11010,
      bytes.length >> 24 & 0xFF,
      bytes.length >> 16 & 0xFF,
      bytes.length >> 8 & 0xFF,
      bytes.length & 0xFF,
      ...bytes,
    ]),
  );

  // Can't test the next bracket up due to JavaScript limitations.
});

Deno.test("encodeCbor() encoding Dates", () => {
  const date = new Date();
  assertEquals(
    encodeCbor(date),
    new Uint8Array([0b110_00001, ...encodeCbor(date.getTime() / 1000)]),
  );
});

Deno.test("encodeCbor() encoding bignums as Uint byte string", () => {
  const num = 2n ** 64n;
  assertEquals(
    encodeCbor(num),
    new Uint8Array([0b110_00010, 0b010_01001, 1, 0, 0, 0, 0, 0, 0, 0, 0]),
  );
});

Deno.test("encodeCbor() encoding bignums as Int byte string", () => {
  const num = -(2n ** 64n) - 1n;
  assertEquals(
    encodeCbor(num),
    new Uint8Array([0b110_00011, 0b010_01001, 1, 0, 0, 0, 0, 0, 0, 0, 0]),
  );
});

Deno.test("encodeCbor() encoding Map<CborType, CborType>", () => {
  const map = new Map<CborType, CborType>([[1, 2], ["3", 4], [[5], { a: 6 }]]);
  assertEquals(
    encodeCbor(map),
    Uint8Array.from([
      217,
      1,
      3,
      0b101_00000 + 3,
      ...Array.from(map
        .entries())
        .map(([k, v]) => [...encodeCbor(k), ...encodeCbor(v)])
        .flat(),
    ]),
  );
});

Deno.test("encodeCbor() encoding Maps", () => {
  let pairs = random(0, 24);
  let entries: [number, number][] = new Array(pairs)
    .fill(0)
    .map((_, i) => [i, i]);
  assertEquals(
    encodeCbor(new Map(entries)),
    Uint8Array.from([
      217,
      1,
      3,
      0b101_00000 + pairs,
      ...entries.map(([k, v]) => [...encodeCbor(k), ...encodeCbor(v)]).flat(),
    ]),
  );

  pairs = random(24, 2 ** 8);
  entries = new Array(pairs)
    .fill(0)
    .map((_, i) => [i, i]);
  assertEquals(
    encodeCbor(new Map(entries)),
    Uint8Array.from([
      217,
      1,
      3,
      0b101_11000,
      pairs,
      ...entries.map(([k, v]) => [...encodeCbor(k), ...encodeCbor(v)]).flat(),
    ]),
  );

  pairs = random(2 ** 8, 2 ** 16);
  entries = new Array(pairs)
    .fill(0)
    .map((_, i) => [i, i]);
  assertEquals(
    encodeCbor(new Map(entries)),
    Uint8Array.from([
      217,
      1,
      3,
      0b101_11001,
      pairs >> 8 & 0xFF,
      pairs & 0xFF,
      ...entries.map(([k, v]) => [...encodeCbor(k), ...encodeCbor(v)]).flat(),
    ]),
  );

  pairs = random(2 ** 16, 2 ** 17);
  entries = new Array(pairs)
    .fill(0)
    .map((_, i) => [i, i]);
  assertEquals(
    encodeCbor(new Map(entries)),
    Uint8Array.from([
      217,
      1,
      3,
      0b101_11010,
      pairs >> 24 & 0xFF,
      pairs >> 16 & 0xFF,
      pairs >> 8 & 0xFF,
      pairs & 0xFF,
      ...entries.map(([k, v]) => [...encodeCbor(k), ...encodeCbor(v)]).flat(),
    ]),
  );

  // Can't test the next bracket up due to JavaScript limitations.
});

Deno.test("encodeCbor() encoding arrays", () => {
  let array = new Array(random(0, 24)).fill(0);
  assertEquals(
    encodeCbor(array),
    new Uint8Array([
      0b100_00000 + array.length,
      ...array.map((x) => [...encodeCbor(x)]).flat(),
    ]),
  );

  array = new Array(random(24, 2 ** 8)).fill(0);
  assertEquals(
    encodeCbor(array),
    new Uint8Array([
      0b100_11000,
      array.length,
      ...array.map((x) => [...encodeCbor(x)]).flat(),
    ]),
  );

  array = new Array(random(2 ** 8, 2 ** 16)).fill(0);
  assertEquals(
    encodeCbor(array),
    new Uint8Array([
      0b100_11001,
      array.length >> 8 & 0xFF,
      array.length & 0xFF,
      ...array.map((x) => [...encodeCbor(x)]).flat(),
    ]),
  );

  array = new Array(random(2 ** 16, 2 ** 17)).fill(0);
  assertEquals(
    encodeCbor(array),
    new Uint8Array([
      0b100_11010,
      array.length >> 24 & 0xFF,
      array.length >> 16 & 0xFF,
      array.length >> 8 & 0xFF,
      array.length & 0xFF,
      ...array.map((x) => [...encodeCbor(x)]).flat(),
    ]),
  );

  // Can't test the next bracket up due to JavaScript limitations.
});

Deno.test("encodeCbor() encoding objects", () => {
  let pairs = random(0, 24);
  let entries: [string, number][] = new Array(pairs).fill(0).map((
    _,
    i,
  ) => [i.toString(), i]);
  assertEquals(
    encodeCbor(Object.fromEntries(entries)),
    new Uint8Array([
      0b101_00000 + pairs,
      ...entries.map(([k, v]) => [...encodeCbor(k), ...encodeCbor(v)])
        .flat(),
    ]),
  );

  pairs = random(24, 2 ** 8);
  entries = new Array(pairs).fill(0).map((_, i) => [i.toString(), i]);
  assertEquals(
    encodeCbor(Object.fromEntries(entries)),
    new Uint8Array([
      0b101_11000,
      pairs,
      ...entries.map(([k, v]) => [...encodeCbor(k), ...encodeCbor(v)])
        .flat(),
    ]),
  );

  pairs = random(2 ** 8, 2 ** 16);
  entries = new Array(pairs).fill(0).map((_, i) => [i.toString(), i]);
  assertEquals(
    encodeCbor(Object.fromEntries(entries)),
    new Uint8Array([
      0b101_11001,
      pairs >> 8 & 0xFF,
      pairs & 0xFF,
      ...entries.map(([k, v]) => [...encodeCbor(k), ...encodeCbor(v)])
        .flat(),
    ]),
  );

  // Can't test the next two bracket up due to JavaScript limitations.
});

Deno.test("encodeCbor() ignores inherited enumerable properties", () => {
  const input: { [k: string]: CborType } = Object.assign(
    Object.create({ inherited: 1 }),
    { own: 2 },
  );
  assertEquals(
    encodeCbor(input),
    new Uint8Array([
      0b101_00001,
      ...encodeCbor("own"),
      ...encodeCbor(2),
    ]),
  );
});

Deno.test("encodeCbor() sizes object keys with multi-byte characters", () => {
  // https://github.com/denoland/std/issues/7255
  // calcEncodingSize() previously sized object keys as `y.length` bytes,
  // but encodeString() writes UTF-8, which needs up to 3 bytes per UTF-16
  // code unit. A key whose UTF-8 form is longer than its UTF-16 length
  // blew past the preallocated buffer and threw "offset is out of bounds".
  assertEquals(
    encodeCbor({ "é☃é☃é☃é☃": 1 }),
    new Uint8Array([
      0b101_00001,
      ...encodeCbor("é☃é☃é☃é☃"),
      ...encodeCbor(1),
    ]),
  );

  // Mixed keys: an ASCII key next to a multi-byte key, so the size
  // arithmetic must hold for every key independently.
  assertEquals(
    encodeCbor({ a: 1, "日本語": 2, b: 3 }),
    new Uint8Array([
      0b101_00011,
      ...encodeCbor("a"),
      ...encodeCbor(1),
      ...encodeCbor("日本語"),
      ...encodeCbor(2),
      ...encodeCbor("b"),
      ...encodeCbor(3),
    ]),
  );

  // Value with a multi-byte string was already correctly sized; this guards
  // against regressing the value branch while changing the key branch.
  assertEquals(
    encodeCbor({ greeting: "héllo wörld" }),
    new Uint8Array([
      0b101_00001,
      ...encodeCbor("greeting"),
      ...encodeCbor("héllo wörld"),
    ]),
  );
});

Deno.test("encodeCbor() encoding CborTag()", () => {
  const bytes = new Uint8Array(random(0, 24)).map((_) => random(0, 256));
  assertEquals(
    encodeCbor(new CborTag(2, bytes)),
    new Uint8Array([0b110_00010, 0b010_00000 + bytes.length, ...bytes]),
  );
});

Deno.test("encodeCbor() rejecting numbers as Uint", () => {
  const num = 2 ** 65;
  assertThrows(
    () => {
      encodeCbor(num);
    },
    RangeError,
    `Cannot encode number: It (${num}) exceeds 2 ** 64 - 1`,
  );
});

Deno.test("encodeCbor() rejecting numbers as Int", () => {
  const num = -(2 ** 65);
  assertThrows(
    () => {
      encodeCbor(num);
    },
    RangeError,
    `Cannot encode number: It (${num}) exceeds -(2 ** 64) - 1`,
  );
});

Deno.test("encodeCbor() rejecting CborTag()", () => {
  let num = -5;
  assertThrows(
    () => {
      encodeCbor(
        new CborTag(
          num,
          new Uint8Array(random(0, 24)).map((_) => random(0, 256)),
        ),
      );
    },
    RangeError,
    `Cannot encode Tag Item: Tag Number (${num}) is less than zero`,
  );
  num = 2 ** 65;
  assertThrows(
    () => {
      encodeCbor(
        new CborTag(
          num,
          new Uint8Array(random(0, 24)).map((_) => random(0, 256)),
        ),
      );
    },
    RangeError,
    `Cannot encode Tag Item: Tag Number (${num}) exceeds 2 ** 64 - 1`,
  );
});
