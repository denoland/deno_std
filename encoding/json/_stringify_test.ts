// Copyright 2018-2022 the Deno authors. All rights reserved. MIT license.

import { assertEquals, assertRejects } from "../../testing/asserts.ts";
import { readableStreamFromIterable } from "../../streams/conversion.ts";
import { JSONStringifyStream, StringifyStreamOptions } from "./_stringify.ts";

async function assertValidStringify(
  transformer: typeof JSONStringifyStream,
  chunks: unknown[],
  expect: string[],
  options?: StringifyStreamOptions,
) {
  const r = readableStreamFromIterable(chunks);
  const res = [];
  for await (const data of r.pipeThrough(new transformer(options))) {
    res.push(data);
  }
  assertEquals(res, expect);
}

async function assertInvalidStringify(
  transformer: typeof JSONStringifyStream,
  chunks: unknown[],
  options?: StringifyStreamOptions,
  // deno-lint-ignore no-explicit-any
  ErrorClass?: (new (...args: any[]) => Error) | undefined,
  msgIncludes?: string | undefined,
) {
  const r = readableStreamFromIterable(chunks);
  await assertRejects(
    async () => {
      for await (const _ of r.pipeThrough(new transformer(options)));
    },
    ErrorClass,
    msgIncludes,
  );
}

Deno.test({
  name: "[encoding/json/stream] JSONStringifyStream",
  async fn() {
    await assertValidStringify(
      JSONStringifyStream,
      [{ foo: "bar" }, { foo: "bar" }],
      ['{"foo":"bar"}\n', '{"foo":"bar"}\n'],
    );
  },
});

Deno.test({
  name: "[encoding/json/stream] JSONStringifyStream: throws",
  async fn() {
    const cyclic: Record<string, unknown> = {};
    cyclic.cyclic = cyclic;
    await assertInvalidStringify(
      JSONStringifyStream,
      [cyclic],
      {},
      TypeError,
      "Converting circular structure to JSON",
    );
  },
});

Deno.test({
  name: "[encoding/json/stream] JSONStringifyStream: prefix and suffix",
  async fn() {
    await assertValidStringify(
      JSONStringifyStream,
      [{ foo: "bar" }, { foo: "bar" }],
      [
        '[[prefix]]{"foo":"bar"}[[suffix]]',
        '[[prefix]]{"foo":"bar"}[[suffix]]',
      ],
      { prefix: "[[prefix]]", suffix: "[[suffix]]" },
    );
  },
});
