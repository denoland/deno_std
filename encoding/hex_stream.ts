// Copyright 2018-2024 the Deno authors. All rights reserved. MIT license.

/**
 * Utilities for encoding and decoding to and from hex in a streaming manner.
 *
 * @module
 */

import { decodeHex, encodeHex } from "./hex.ts";

/**
 * Converts a Uint8Array stream into a hex-encoded stream.
 *
 * @see {@link https://www.rfc-editor.org/rfc/rfc4648.html#section-8}
 *
 * @example Usage
 * ```ts
 * import { assertEquals } from "@std/assert";
 * import { encodeHex } from "@std/encoding/hex";
 * import { HexEncoderStream } from "@std/encoding/hex-stream";
 *
 * assertEquals(
 *   (await Array.fromAsync(
 *     (await Deno.open("./deno.json"))
 *       .readable
 *       .pipeThrough(new HexEncoderStream()),
 *   )).join(""),
 *   encodeHex(await Deno.readFile("./deno.json")),
 * );
 * ```
 */
export class HexEncoderStream extends TransformStream<Uint8Array, string> {
  constructor() {
    super({
      transform(chunk, controller) {
        controller.enqueue(encodeHex(chunk));
      },
    });
  }
}

/**
 * Decodes a hex-encoded stream into a Uint8Array stream.
 *
 * @see {@link https://www.rfc-editor.org/rfc/rfc4648.html#section-8}
 *
 * @example Usage
 * ```ts
 * import { assertEquals } from "@std/assert";
 * import { HexDecoderStream, HexEncoderStream } from "@std/encoding/hex-stream";
 *
 * const readable = (await Deno.open("./deno.json"))
 *   .readable
 *   .pipeThrough(new HexEncoderStream());
 *
 * assertEquals(
 *   Uint8Array.from((await Array.fromAsync(
 *     readable.pipeThrough(new HexDecoderStream()),
 *   )).map(x => [...x]).flat()),
 *   await Deno.readFile("./deno.json"),
 * );
 * ```
 */
export class HexDecoderStream extends TransformStream<string, Uint8Array> {
  constructor() {
    let push = "";
    super({
      transform(chunk, controller) {
        push += chunk;
        if (push.length < 2) {
          return;
        }
        const remainder = -push.length % 2;
        controller.enqueue(decodeHex(push.slice(0, remainder || undefined)));
        push = remainder ? push.slice(remainder) : "";
      },
      flush(controller) {
        if (push.length) {
          controller.enqueue(decodeHex(push));
        }
      },
    });
  }
}
