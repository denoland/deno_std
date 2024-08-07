// Copyright 2018-2024 the Deno authors. All rights reserved. MIT license.

/**
 * Utilities for encoding and decoding to and from base32 in a streaming manner.
 *
 * @module
 */

import { decodeBase32, encodeBase32 } from "./base32.ts";

/**
 * Converts a Uint8Array stream into a base32-encoded stream.
 *
 * @see {@link https://www.rfc-editor.org/rfc/rfc4648.html#section-6}
 *
 * @example Usage
 * ```ts
 * import { assertEquals } from "@std/assert";
 * import { encodeBase32 } from "@std/encoding/base32";
 * import { Base32EncoderStream } from "@std/encoding/base32-stream";
 *
 * assertEquals(
 *   (await Array.fromAsync(
 *     (await Deno.open("./deno.json"))
 *       .readable
 *       .pipeThrough(new Base32EncoderStream()),
 *   )).join(""),
 *   encodeBase32(await Deno.readFile("./deno.json")),
 * );
 * ```
 */
export class Base32EncoderStream extends TransformStream<Uint8Array, string> {
  constructor() {
    let push = new Uint8Array(0);
    super({
      transform(chunk, controller) {
        const concat = new Uint8Array(push.length + chunk.length);
        concat.set(push);
        concat.set(chunk, push.length);

        const remainder = -concat.length % 5;
        controller.enqueue(
          encodeBase32(concat.slice(0, remainder || undefined)),
        );
        push = remainder ? concat.slice(remainder) : new Uint8Array(0);
      },
      flush(controller) {
        if (push.length) {
          controller.enqueue(encodeBase32(push));
        }
      },
    });
  }
}

/**
 * Decodes a base32-encoded stream into a Uint8Array stream.
 *
 * @see {@link https://www.rfc-editor.org/rfc/rfc4648.html#section-6}
 *
 * @example Usage
 * ```ts
 * import { assertEquals } from "@std/assert";
 * import { Base32DecoderStream, Base32EncoderStream } from "@std/encoding/base32-stream";
 *
 * const readable = (await Deno.open("./deno.json"))
 *   .readable
 *   .pipeThrough(new Base32EncoderStream());
 *
 * assertEquals(
 *   Uint8Array.from((await Array.fromAsync(
 *     readable.pipeThrough(new Base32DecoderStream()),
 *   )).map(x => [...x]).flat()),
 *   await Deno.readFile("./deno.json"),
 * );
 * ```
 */
export class Base32DecoderStream extends TransformStream<string, Uint8Array> {
  constructor() {
    let push = "";
    super({
      transform(chunk, controller) {
        push += chunk;
        if (push.length < 8) {
          return;
        }
        const remainder = -push.length % 8;
        controller.enqueue(decodeBase32(push.slice(0, remainder || undefined)));
        push = remainder ? chunk.slice(remainder) : "";
      },
      flush(controller) {
        if (push.length) {
          controller.enqueue(decodeBase32(push));
        }
      },
    });
  }
}
