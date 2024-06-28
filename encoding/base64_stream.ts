// Copyright 2018-2024 the Deno authors. All rights reserved. MIT license.

/**
 * Utilities for encoding and decoding to and from base64 in a streaming manner.
 *
 * @module
 */

import { decodeBase64, encodeBase64 } from "./base64.ts";

/**
 * Converts a Uint8Array stream into a base64-encoded stream.
 *
 * @see {@link https://www.rfc-editor.org/rfc/rfc4648.html#section-4}
 *
 * @example Usage
 * ```ts
 * import { assertEquals } from "@std/assert";
 * import { encodeBase64 } from "@std/encoding/base64";
 * import { Base64EncoderStream } from "@std/encoding/base64-stream";
 *
 * assertEquals(
 *   (await Array.fromAsync(
 *     (await Deno.open("./deno.json"))
 *       .readable
 *       .pipeThrough(new Base64EncoderStream()),
 *   )).join(""),
 *   encodeBase64(await Deno.readFile("./deno.json")),
 * );
 * ```
 */
export class Base64EncoderStream extends TransformStream<Uint8Array, string> {
  constructor() {
    let push = new Uint8Array(0);
    super({
      transform(chunk, controller) {
        const concat = new Uint8Array(push.length + chunk.length);
        concat.set(push);
        concat.set(chunk, push.length);

        const remainder = -concat.length % 3;
        controller.enqueue(
          encodeBase64(concat.slice(0, remainder || undefined)),
        );
        push = remainder ? concat.slice(remainder) : new Uint8Array(0);
      },
      flush(controller) {
        if (push.length) {
          controller.enqueue(encodeBase64(push));
        }
      },
    });
  }
}

/**
 * Decodes a base64-encoded stream into a Uint8Array stream.
 *
 * @see {@link https://www.rfc-editor.org/rfc/rfc4648.html#section-4}
 *
 * @example Usage
 * ```ts
 * import { assertEquals } from "@std/assert";
 * import { Base64DecoderStream, Base64EncoderStream } from "@std/encoding/base64-stream";
 *
 * const readable = (await Deno.open("./deno.json"))
 *   .readable
 *   .pipeThrough(new Base64EncoderStream());
 *
 * assertEquals(
 *   Uint8Array.from((await Array.fromAsync(
 *     readable.pipeThrough(new Base64DecoderStream()),
 *   )).map(x => [...x]).flat()),
 *   await Deno.readFile("./deno.json"),
 * );
 * ```
 */
export class Base64DecoderStream extends TransformStream<string, Uint8Array> {
  constructor() {
    let push = "";
    super({
      transform(chunk, controller) {
        push += chunk;
        if (push.length < 4) {
          return;
        }
        const remainder = -push.length % 4;
        controller.enqueue(decodeBase64(push.slice(0, remainder || undefined)));
        push = remainder ? push.slice(remainder) : "";
      },
      flush(controller) {
        if (push.length) {
          controller.enqueue(decodeBase64(push));
        }
      },
    });
  }
}
