// Copyright 2018-2024 the Deno authors. All rights reserved. MIT license.
// This module is browser compatible.

/**
 * A {@linkcode TransformStream} that will only read & enqueue `size` amount of
 * chunks.
 *
 * If `options.error` is set, then instead of terminating the stream,
 * a {@linkcode RangeError} will be thrown when the total number of enqueued
 * chunks is about to exceed the specified size.
 *
 * @example `size` is equal to the total number of chunks
 * ```ts
 * import { LimitedTransformStream } from "@std/streams/limited-transform-stream";
 * import { assertEquals } from "@std/assert/assert-equals";
 *
 * const stream = ReadableStream.from(["1234", "5678"]);
 * const transformed = stream.pipeThrough(
 *   new LimitedTransformStream(2),
 * );
 *
 * // All chunks were read
 * assertEquals(
 *   await Array.fromAsync(transformed),
 *   ["1234", "5678"],
 * );
 * ```
 *
 * @example `size` is less than the total number of chunks
 * ```ts
 * import { LimitedTransformStream } from "@std/streams/limited-transform-stream";
 * import { assertEquals } from "@std/assert/assert-equals";
 *
 * const stream = ReadableStream.from(["1234", "5678"]);
 * const transformed = stream.pipeThrough(
 *   new LimitedTransformStream(1),
 * );
 *
 * // Only the first chunk was read
 * assertEquals(
 *   await Array.fromAsync(transformed),
 *   ["1234"],
 * );
 * ```
 *
 * @example error: true
 * ```ts
 * import { LimitedTransformStream } from "@std/streams/limited-transform-stream";
 * import { assertRejects } from "@std/assert/assert-rejects";
 *
 * const stream = ReadableStream.from(["1234", "5678"]);
 * const transformed = stream.pipeThrough(
 *   new LimitedTransformStream(1, { error: true }),
 * );
 *
 * await assertRejects(async () => {
 *   await Array.fromAsync(transformed);
 * }, RangeError);
 * ```
 */
export class LimitedTransformStream<T> extends TransformStream<T, T> {
  #read = 0;

  /** Constructs a new instance. */
  constructor(size: number, options: { error?: boolean } = {}) {
    super({
      transform: (chunk, controller) => {
        if ((this.#read + 1) > size) {
          if (options.error) {
            throw new RangeError(`Exceeded chunk limit of '${size}'`);
          } else {
            controller.terminate();
          }
        } else {
          this.#read++;
          controller.enqueue(chunk);
        }
      },
    });
  }
}
