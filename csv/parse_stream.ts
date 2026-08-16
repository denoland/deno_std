// Copyright 2018-2026 the Deno authors. MIT license.
// This module is browser compatible.

import {
  convertRowToObject,
  type LineReader,
  parseRecord,
  type ParseResult,
} from "./_io.ts";
import { TextDelimiterStream } from "@std/streams/text-delimiter-stream";

/** Options for {@linkcode CsvParseStream}. */
export interface CsvParseStreamOptions {
  /** Character which separates values.
   *
   * @default {","}
   */
  separator?: string;
  /** Character to start a comment.
   *
   * Lines beginning with the comment character without preceding whitespace
   * are ignored. With leading whitespace the comment character becomes part of
   * the field, even you provide `trimLeadingSpace: true`.
   *
   * By default, no character is considered to be a start of a comment.
   */
  comment?: string;
  /** Flag to trim the leading space of the value.
   *
   * This is done even if the field delimiter, `separator`, is white space.
   *
   * @default {false}
   */
  trimLeadingSpace?: boolean;
  /**
   * Allow unquoted quote in a quoted field or non-double-quoted quotes in
   * quoted field.
   *
   * @default {false}
   */
  lazyQuotes?: boolean;
  /**
   * Enabling checking number of expected fields for each row.
   *
   * If positive, each record is required to have the given number of fields.
   * If 0, it will be set to the number of fields in the first row, so that
   * future rows must have the same field count.
   * If negative, no check is made and records may have a variable number of
   * fields.
   *
   * If the wrong number of fields is in a row, a {@linkcode https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/SyntaxError | SyntaxError}
   * is thrown.
   */
  fieldsPerRecord?: number;
  /**
   * If you provide `skipFirstRow: true` and `columns`, the first line will be
   * skipped.
   * If you provide `skipFirstRow: true` but not `columns`, the first line will
   * be skipped and used as header definitions.
   *
   * @default {false}
   */
  skipFirstRow?: boolean;
  /** List of names used for header definition. */
  columns?: readonly string[];
}

class StreamLineReader implements LineReader {
  #reader: ReadableStreamDefaultReader<string>;
  #done = false;
  constructor(reader: ReadableStreamDefaultReader<string>) {
    this.#reader = reader;
  }

  async readLine(): Promise<string | null> {
    const { value, done } = await this.#reader.read();
    if (done) {
      this.#done = true;
      return null;
    } else {
      // NOTE: Remove trailing CR for compatibility with golang's `encoding/csv`
      return stripLastCR(value!);
    }
  }

  isEOF(): boolean {
    return this.#done;
  }

  cancel() {
    this.#reader.cancel();
  }
}

function stripLastCR(s: string): string {
  return s.endsWith("\r") ? s.slice(0, -1) : s;
}

/** Row return type. */
export type RowType<T> = T extends undefined ? string[]
  : ParseResult<CsvParseStreamOptions, T>[number];

/**
 * `CsvParseStream` transforms a stream of CSV-encoded text into a stream of
 * parsed objects.
 *
 * A `CsvParseStream` expects input conforming to
 * {@link https://www.rfc-editor.org/rfc/rfc4180.html | RFC 4180}.
 *
 * @example Usage with default options
 * ```ts
 * import { CsvParseStream } from "@std/csv/parse-stream";
 * import { assertEquals } from "@std/assert/equals";
 * import { assertType, IsExact } from "@std/testing/types"
 *
 * const source = ReadableStream.from([
 *   "name,age\n",
 *   "Alice,34\n",
 *   "Bob,24\n",
 * ]);
 * const stream = source.pipeThrough(new CsvParseStream());
 * const result = await Array.fromAsync(stream);
 *
 * assertEquals(result, [
 *   ["name", "age"],
 *   ["Alice", "34"],
 *   ["Bob", "24"],
 * ]);
 * assertType<IsExact<typeof result, string[][]>>(true);
 * ```
 *
 * @example Skip first row with `skipFirstRow: true`
 * ```ts
 * import { CsvParseStream } from "@std/csv/parse-stream";
 * import { assertEquals } from "@std/assert/equals";
 * import { assertType, IsExact } from "@std/testing/types"
 *
 * const source = ReadableStream.from([
 *   "name,age\n",
 *   "Alice,34\n",
 *   "Bob,24\n",
 * ]);
 * const stream = source.pipeThrough(new CsvParseStream({ skipFirstRow: true }));
 * const result = await Array.fromAsync(stream);
 *
 * assertEquals(result, [
 *   { name: "Alice", age: "34" },
 *   { name: "Bob", age: "24" },
 * ]);
 * assertType<IsExact<typeof result, Record<string, string>[]>>(true);
 * ```
 *
 * @example Specify columns with `columns` option
 * ```ts
 * import { CsvParseStream } from "@std/csv/parse-stream";
 * import { assertEquals } from "@std/assert/equals";
 * import { assertType, IsExact } from "@std/testing/types"
 *
 * const source = ReadableStream.from([
 *   "Alice,34\n",
 *   "Bob,24\n",
 * ]);
 * const stream = source.pipeThrough(new CsvParseStream({
 *   columns: ["name", "age"]
 * }));
 * const result = await Array.fromAsync(stream);
 *
 * assertEquals(result, [
 *   { name: "Alice", age: "34" },
 *   { name: "Bob", age: "24" },
 * ]);
 * assertType<IsExact<typeof result, Record<"name" | "age", string>[]>>(true);
 * ```
 *
 * @example Specify columns with `columns` option and skip first row with
 * `skipFirstRow: true`
 * ```ts
 * import { CsvParseStream } from "@std/csv/parse-stream";
 * import { assertEquals } from "@std/assert/equals";
 * import { assertType, IsExact } from "@std/testing/types"
 *
 * const source = ReadableStream.from([
 *   "Alice,34\n",
 *   "Bob,24\n",
 * ]);
 * const stream = source.pipeThrough(new CsvParseStream({
 *   columns: ["name", "age"],
 *   skipFirstRow: true,
 * }));
 * const result = await Array.fromAsync(stream);
 *
 * assertEquals(result, [{ name: "Bob", age: "24" }]);
 * assertType<IsExact<typeof result, Record<"name" | "age", string>[]>>(true);
 * ```
 *
 * @example TSV (tab-separated values) with `separator: "\t"`
 * ```ts
 * import { CsvParseStream } from "@std/csv/parse-stream";
 * import { assertEquals } from "@std/assert/equals";
 *
 * const source = ReadableStream.from([
 *   "Alice\t34\n",
 *   "Bob\t24\n",
 * ]);
 * const stream = source.pipeThrough(new CsvParseStream({
 *   separator: "\t",
 * }));
 * const result = await Array.fromAsync(stream);
 *
 * assertEquals(result, [
 *   ["Alice", "34"],
 *   ["Bob", "24"],
 * ]);
 * ```
 *
 * @example Trim leading space with `trimLeadingSpace: true`
 * ```ts
 * import { CsvParseStream } from "@std/csv/parse-stream";
 * import { assertEquals } from "@std/assert/equals";
 *
 * const source = ReadableStream.from([
 *   "      Alice,34\n          ",
 *   "Bob,     24\n",
 * ]);
 * const stream = source.pipeThrough(new CsvParseStream({
 *   trimLeadingSpace: true,
 * }));
 * const result = await Array.fromAsync(stream);
 *
 * assertEquals(result, [
 *   ["Alice", "34"],
 *   ["Bob", "24"],
 * ]);
 * ```
 *
 * @example Quoted fields
 * ```ts
 * import { CsvParseStream } from "@std/csv/parse-stream";
 * import { assertEquals } from "@std/assert/equals";
 *
 * const source = ReadableStream.from([
 *   `"a ""word""","com`,
 *   `ma,","newline`,
 *   `\n"\nfoo,bar,b`,
 *   `az\n`,
 * ]);
 * const stream = source.pipeThrough(new CsvParseStream());
 * const result = await Array.fromAsync(stream);
 *
 * assertEquals(result, [
 *   ['a "word"', "comma,", "newline\n"],
 *   ["foo", "bar", "baz"]
 * ]);
 * ```
 *
 * @example Allow lazy quotes with `lazyQuotes: true`
 * ```ts
 * import { CsvParseStream } from "@std/csv/parse-stream";
 * import { assertEquals } from "@std/assert/equals";
 *
 * const source = ReadableStream.from([
 *   `a "word","1"`,
 *   `2",a","b`,
 * ]);
 * const stream = source.pipeThrough(new CsvParseStream({
 *   lazyQuotes: true,
 * }));
 * const result = await Array.fromAsync(stream);
 *
 * assertEquals(result, [['a "word"', '1"2', 'a"', 'b']]);
 * ```
 *
 * @example Define comment prefix with `comment` option
 * ```ts
 * import { CsvParseStream } from "@std/csv/parse-stream";
 * import { assertEquals } from "@std/assert/equals";
 *
 * const source = ReadableStream.from([
 *   "Alice,34\n",
 *   "# THIS IS A COMMENT\n",
 *   "Bob,24\n",
 * ]);
 * const stream = source.pipeThrough(new CsvParseStream({
 *   comment: "#",
 * }));
 * const result = await Array.fromAsync(stream);
 *
 * assertEquals(result, [
 *   ["Alice", "34"],
 *   ["Bob", "24"],
 * ]);
 * ```
 *
 * @example Infer the number of fields from the first row with
 * `fieldsPerRecord: 0`
 * ```ts
 * import { CsvParseStream } from "@std/csv/parse-stream";
 * import { assertEquals } from "@std/assert/equals";
 * import { assertRejects } from "@std/assert/rejects";
 *
 * const source = ReadableStream.from([
 *   "Alice,34\n",
 *   "Bob,24,CA\n", // Note that this row has more fields than the first row
 * ]);
 * const stream = source.pipeThrough(new CsvParseStream({
 *   fieldsPerRecord: 0,
 * }));
 * const reader = stream.getReader();
 * assertEquals(await reader.read(), { done: false, value: ["Alice", "34"] });
 * await assertRejects(
 *   () => reader.read(),
 *   SyntaxError,
 *   "Syntax error on line 2: expected 2 fields but got 3",
 * );
 * ```
 *
 * @example Enforce the number of field for each row with `fieldsPerRecord: 2`
 * ```ts
 * import { CsvParseStream } from "@std/csv/parse-stream";
 * import { assertEquals } from "@std/assert/equals";
 * import { assertRejects } from "@std/assert/rejects";
 *
 * const source = ReadableStream.from([
 *   "Alice,34\n",
 *   "Bob,24,CA\n",
 * ]);
 * const stream = source.pipeThrough(new CsvParseStream({
 *   fieldsPerRecord: 2,
 * }));
 * const reader = stream.getReader();
 * assertEquals(await reader.read(), { done: false, value: ["Alice", "34"] });
 * await assertRejects(
 *   () => reader.read(),
 *   SyntaxError,
 *   "Syntax error on line 2: expected 2 fields but got 3",
 * );
 * ```
 *
 * @typeParam T The type of options for the stream.
 */
export class CsvParseStream<
  const T extends CsvParseStreamOptions | undefined = undefined,
> implements TransformStream<string, RowType<T>> {
  readonly #readable: ReadableStream<
    string[] | Record<string, string | unknown>
  >;
  readonly #options: CsvParseStreamOptions;
  readonly #lineReader: StreamLineReader;
  readonly #lines: TextDelimiterStream;
  #zeroBasedLineIndex = 0;
  #isFirstRow = true;

  // The number of fields per record that is either inferred from the first row
  // (when options.fieldsPerRecord = 0), or set by the caller (when
  // options.fieldsPerRecord > 0).
  //
  // Each possible variant means the following:
  // "ANY": Variable number of fields is allowed.
  // "UNINITIALIZED": The first row has not been read yet. Once it's read, the
  //                  number of fields will be set.
  // <number>: The number of fields per record that every record must follow.
  #fieldsPerRecord: "ANY" | "UNINITIALIZED" | number;

  #headers: readonly string[] = [];

  /** Construct a new instance.
   *
   * @param options Options for the stream.
   */
  constructor(options?: T) {
    this.#options = {
      ...options,
      separator: options?.separator ?? ",",
      trimLeadingSpace: options?.trimLeadingSpace ?? false,
    };

    if (
      this.#options.fieldsPerRecord === undefined ||
      this.#options.fieldsPerRecord < 0
    ) {
      this.#fieldsPerRecord = "ANY";
    } else if (this.#options.fieldsPerRecord === 0) {
      this.#fieldsPerRecord = "UNINITIALIZED";
    } else {
      // TODO(magurotuna): Should we check if it's a valid integer?
      this.#fieldsPerRecord = this.#options.fieldsPerRecord;
    }

    this.#lines = new TextDelimiterStream("\n");
    this.#lineReader = new StreamLineReader(this.#lines.readable.getReader());
    this.#readable = new ReadableStream({
      pull: (controller) => this.#pull(controller),
      cancel: () => this.#lineReader.cancel(),
    });
  }

  async #pull(
    controller: ReadableStreamDefaultController<
      string[] | Record<string, string | unknown>
    >,
  ): Promise<void> {
    const line = await this.#lineReader.readLine();
    if (line === "") {
      // Found an empty line
      this.#zeroBasedLineIndex++;
      return this.#pull(controller);
    }
    if (line === null) {
      // Reached to EOF
      controller.close();
      this.#lineReader.cancel();
      return;
    }

    const record = await parseRecord(
      line,
      this.#lineReader,
      this.#options,
      this.#zeroBasedLineIndex,
    );

    if (this.#isFirstRow) {
      this.#isFirstRow = false;
      if (this.#options.skipFirstRow || this.#options.columns) {
        this.#headers = [];

        if (this.#options.skipFirstRow) {
          const head = record;
          this.#headers = head;
        }

        if (this.#options.columns) {
          this.#headers = this.#options.columns;
        }
      }

      if (this.#options.skipFirstRow) {
        return this.#pull(controller);
      }

      if (this.#fieldsPerRecord === "UNINITIALIZED") {
        this.#fieldsPerRecord = record.length;
      }
    }

    if (
      typeof this.#fieldsPerRecord === "number" &&
      record.length !== this.#fieldsPerRecord
    ) {
      throw new SyntaxError(
        `Syntax error on line ${
          this.#zeroBasedLineIndex + 1
        }: expected ${this.#fieldsPerRecord} fields but got ${record.length}`,
      );
    }

    this.#zeroBasedLineIndex++;
    if (record.length > 0) {
      if (this.#options.skipFirstRow || this.#options.columns) {
        controller.enqueue(convertRowToObject(
          record,
          this.#headers,
          this.#zeroBasedLineIndex,
        ));
      } else {
        controller.enqueue(record);
      }
    } else {
      return this.#pull(controller);
    }
  }

  /**
   * The instance's {@linkcode ReadableStream}.
   *
   * @example Usage
   * ```ts
   * import { CsvParseStream } from "@std/csv/parse-stream";
   * import { assertEquals } from "@std/assert/equals";
   *
   * const source = ReadableStream.from([
   *   "name,age\n",
   *   "Alice,34\n",
   *   "Bob,24\n",
   * ]);
   * const parseStream = new CsvParseStream({ skipFirstRow: true });
   * const parts = source.pipeTo(parseStream.writable);
   * assertEquals(await Array.fromAsync(parseStream.readable), [
   *   { name: "Alice", age: "34" },
   *   { name: "Bob", age: "24" },
   * ]);
   * ```
   *
   * @returns The instance's {@linkcode ReadableStream}.
   */
  get readable(): ReadableStream<RowType<T>> {
    return this.#readable as ReadableStream<RowType<T>>;
  }

  /**
   * The instance's {@linkcode WritableStream}.
   *
   * @example Usage
   * ```ts
   * import { CsvParseStream } from "@std/csv/parse-stream";
   * import { assertEquals } from "@std/assert/equals";
   *
   * const source = ReadableStream.from([
   *   "name,age\n",
   *   "Alice,34\n",
   *   "Bob,24\n",
   * ]);
   * const parseStream = new CsvParseStream({ skipFirstRow: true });
   * const parts = source.pipeTo(parseStream.writable);
   * assertEquals(await Array.fromAsync(parseStream.readable), [
   *   { name: "Alice", age: "34" },
   *   { name: "Bob", age: "24" },
   * ]);
   * ```
   *
   * @returns The instance's {@linkcode WritableStream}.
   */
  get writable(): WritableStream<string> {
    return this.#lines.writable;
  }
}
