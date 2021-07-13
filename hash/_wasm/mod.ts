// Copyright 2018-2021 the Deno authors. All rights reserved. MIT license.
import type {
  DigestFormatOptions,
  DigestOptions,
  Hasher,
  Message,
} from "../hasher.ts";
import { Hasher as InnerHasher } from "./wasm_bindings.js";

import * as hex from "../../encoding/hex.ts";
import * as base64 from "../../encoding/base64.ts";

export class WasmHasher implements Hasher {
  #inner: InnerHasher;

  constructor(algorithm: string | InnerHasher) {
    if (typeof algorithm === "string") {
      this.#inner = new InnerHasher(algorithm);
    } else {
      this.#inner = algorithm;
    }
  }

  update(message: Message): this {
    let view: Uint8Array;

    if (message instanceof Uint8Array) {
      view = message;
    } else if (typeof message === "string") {
      view = new TextEncoder().encode(message);
    } else if (ArrayBuffer.isView(message)) {
      view = new Uint8Array(
        message.buffer,
        message.byteOffset,
        message.byteLength,
      );
    } else if (message instanceof ArrayBuffer) {
      view = new Uint8Array(message);
    } else {
      throw new Error("`message` is invalid type");
    }

    // Messages will be split into chunks of this size to avoid unneccessarily
    // increasing the size of the WASM heap.
    const chunkSize = 65_536;

    for (
      let offset = 0;
      offset < view.byteLength;
      offset += chunkSize
    ) {
      this.#inner.update(
        new Uint8Array(
          view.buffer,
          view.byteOffset + offset,
          Math.min(chunkSize, view.byteLength - offset),
        ),
      );
    }

    return this;
  }

  reset(): this {
    this.#inner.reset();
    return this;
  }

  digest(options: DigestOptions): Uint8Array {
    const length = options?.length;
    if (length !== undefined && (length < 0 || !Number.isSafeInteger(length))) {
      throw new TypeError(
        `length must be a positive safe integer (but it was ${length})`,
      );
    }
    const digest = this.#inner.digest(length);
    return digest;
  }

  digestAndReset(options: DigestOptions): Uint8Array {
    const length = options?.length;
    if (length !== undefined && (length < 0 || !Number.isSafeInteger(length))) {
      throw new TypeError(
        `length must be a positive safe integer (but it was ${length})`,
      );
    }
    const digest = this.#inner.digestAndReset(length);
    return digest;
  }

  clone(): WasmHasher {
    return new WasmHasher(this.#inner.clone());
  }

  toString(options: DigestOptions & DigestFormatOptions): string {
    const digest = this.digest(options);

    const encoding = options?.encoding ?? "hex";

    if (encoding === "hex") {
      return new TextDecoder().decode(hex.encode(digest));
    } else if (encoding === "base64") {
      return base64.encode(digest);
    } else if (encoding === "unicode") {
      return String.fromCodePoint(...digest);
    } else {
      throw new Error(`invalid encoding: ${encoding}`);
    }
  }
}
