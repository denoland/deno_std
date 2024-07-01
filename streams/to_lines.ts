// Copyright 2018-2024 the Deno authors. All rights reserved. MIT license.

import { TextLineStream } from "./text_line_stream.ts";

/**
 * Converts a ReadableStream of `Uint8Array` or `string` into an
 * `AsyncGenerator` of `string`, where each value is divided by a newline at
 * `\n` or `\r\n`. Trimming the last line if it is empty.
 *
 * @param readable A `ReadableStream` of `Uint8Array` or `string`.
 * @param options An optional `PipeOptions`.
 * @returns A `ReadableStream<string>`
 *
 * @example JSON Lines
 * ```ts
 * import { toLines } from "@std/streams/to-lines";
 * import { assertEquals } from "@std/assert/assert-equals";
 *
 * const readable = ReadableStream.from([
 *   '{"name": "Alice", "age": ',
 *   '30}\r\n{"name": "Bob", "age"',
 *   ": 25}\n",
 * ])
 *   .pipeThrough(new TextEncoderStream());
 *
 * type Person = { name: string, age: number };
 *
 * const people: Person[] = []
 * for await (const line of toLines(readable)) {
 *   people.push(JSON.parse(line) as Person)
 * }
 *
 * assertEquals(
 *   people,
 *   [{ "name": "Alice", "age": 30 }, { "name": "Bob", "age": 25 }],
 * );
 * ```
 */
export function toLines(
  readable: ReadableStream<Uint8Array>,
  options?: PipeOptions,
): ReadableStream<string> {
  return readable
    .pipeThrough(new TextDecoderStream())
    .pipeThrough(new TextLineStream(), options);
}
