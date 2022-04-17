// Copyright 2018-2022 the Deno authors. All rights reserved. MIT license.
import { assertEquals } from "../testing/asserts.ts";

import { digest } from "./mod.ts";
import { _wasmBytes as wasmBytes } from "./crypto.mjs";
import * as wasmFileModule from "./crypto.wasm.mjs";

const webCrypto = globalThis.crypto;

Deno.test("test", async () => {
  const input = new TextEncoder().encode("SHA-384");

  const wasmDigest = digest("SHA-384", input, undefined);

  const webDigest = new Uint8Array(
    await webCrypto.subtle!.digest("SHA-384", input),
  );

  assertEquals(wasmDigest, webDigest);
});

Deno.test("Inlined WASM file's metadata should match its content", () => {
  assertEquals(wasmBytes.length, wasmFileModule.size);
  assertEquals(wasmBytes.byteLength, wasmFileModule.size);
  assertEquals(wasmFileModule.data.length, wasmFileModule.size);
  assertEquals(wasmFileModule.data.buffer.byteLength, wasmFileModule.size);
});
