// Copyright 2018-2024 the Deno authors. All rights reserved. MIT license.

/**
 * An interface specifying the requirements for the {@linkcode FixedChunkStream} to
 * successfully resize the chunks, with the exception of the last chunk.
 */
export interface Fixable<T, U = T extends ArrayLike<infer V> ? V : never>
  extends ArrayLike<U> {
  /**
   * Validates that a constructor property exists on the type. The constructor
   * needs a signature of `new(length: number): T`, but TypeScript is unable to
   * validate this, so you must.
   */
  constructor: Exclude<unknown, undefined>;
  /**
   * A method that inserts the `ArrayLike<U>` in `T` at the optional `offset`
   * index.
   */
  set(array: ArrayLike<U>, offset?: number): void;
  /**
   * A method that slices a chunk from `start` to `end` returning `T`
   */
  slice(start?: number, end?: number): T;
  /**
   * A property that returns the length of `T`
   */
  readonly length: number;
}

/**
 * A transform stream that resize the chunks into perfectly `size` chunks with
 * the exception of the last chunk.
 *
 * Works on any type that meets the {@linkcode Fixable} requirements.
 * TypeScript is unable to validate the constructor requirement of needing a
 * signature of `new(length:number): T` so you must validate this yourself.
 *
 * @typeParam T is the type inside the stream. `Uint8Array` for example.
 *
 * @example Usage
 * ```ts
 * import { FixedChunkStream } from "@std/streams/fixed-chunk-stream";
 * import { assertEquals } from "@std/assert/assert-equals";
 *
 * const readable = ReadableStream.from(function* () {
 *   let count = 0
 *   for (let i = 0; i < 100; ++i) {
 *     const array = new Uint8Array(Math.floor(Math.random() * 1000));
 *     count += array.length;
 *     yield array;
 *   }
 *   yield new Uint8Array(512 - count % 512)
 * }())
 *   .pipeThrough(new FixedChunkStream(512))
 *   .pipeTo(new WritableStream({
 *     write(chunk, _controller) {
 *       assertEquals(chunk.length, 512)
 *     }
 *   }))
 * ```
 */
export class FixedChunkStream<T extends Fixable<T>>
  extends TransformStream<T, T> {
  /**
   * Constructs a new instance.
   *
   * @param size The size of the chunks to be resized to.
   *
   * @example Usage
   * ```ts no-assert
   * import { FixedChunkStream } from "@std/streams/fixed-chunk-stream";
   *
   * const readable = ReadableStream.from(function* () {
   *   for (let i = 0; i < 100; ++i) {
   *     yield new Uint8Array(Math.floor(Math.random() * 1000));
   *   }
   * }())
   *   .pipeThrough(new FixedChunkStream(512))
   *   .pipeThrough(new TransformStream({
   *     transform(chunk, controller) {
   *       controller.enqueue(chunk.length.toString() + '\n')
   *     }
   *   }))
   *   .pipeThrough(new TextEncoderStream())
   *   .pipeTo(Deno.stdout.writable, { preventClose: true })
   * ```
   */
  constructor(size: number) {
    let push: T | undefined;
    super({
      transform(chunk, controller) {
        if (push != undefined) {
          const concat = new (chunk.constructor as { new (length: number): T })(
            push.length + chunk.length,
          );
          concat.set(push);
          concat.set(chunk, push.length);
          chunk = concat;
        }

        for (let i = size; i < chunk.length; i += size) {
          controller.enqueue(chunk.slice(i - size, i));
        }
        const remainder = -chunk.length % size;
        push = remainder ? chunk.slice(remainder) : undefined;
      },
      flush(controller) {
        if (push?.length) {
          controller.enqueue(push);
        }
      },
    });
  }
}
