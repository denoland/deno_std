// Originally ported from Go:
// https://github.com/golang/go/blob/go1.12.5/src/encoding/csv/
// Copyright 2011 The Go Authors. All rights reserved. BSD license.
// https://github.com/golang/go/blob/master/LICENSE
// Copyright 2018-2024 the Deno authors. All rights reserved. MIT license.

import { graphemeLength } from "./_shared.ts";

/** Options for {@linkcode parseRecord}. */
export interface ReadOptions {
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
   * @default {"#"}
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
   * If === 0, it will be set to the number of fields in the first row, so that
   * future rows must have the same field count.
   * If negative, no check is made and records may have a variable number of
   * fields.
   *
   * If the wrong number of fields is in a row, a `ParseError` is thrown.
   */
  fieldsPerRecord?: number;
}

export const defaultReadOptions: ReadOptions = {
  separator: ",",
  trimLeadingSpace: false,
};

export interface LineReader {
  readLine(): Promise<string | null>;
  isEOF(): boolean;
}

export async function parseRecord(
  line: string,
  reader: LineReader,
  options: ReadOptions,
  startLine: number,
  lineIndex: number = startLine,
): Promise<Array<string>> {
  // line starting with comment character is ignored
  if (options.comment && line[0] === options.comment) {
    return [];
  }

  if (options.separator === undefined) {
    throw new TypeError("Separator is required");
  }

  let currentLine = line;
  const quote = '"';
  const quoteLen = quote.length;
  const separatorLen = options.separator.length;
  let recordBuffer = "";
  const fieldIndexes = [] as number[];
  currentLineLoop: while (true) {
    if (options.trimLeadingSpace) {
      currentLine = currentLine.trimStart();
    }

    if (currentLine.length === 0 || !currentLine.startsWith(quote)) {
      // Non-quoted string field
      const i = currentLine.indexOf(options.separator);
      let field = currentLine;
      if (i >= 0) {
        field = field.substring(0, i);
      }
      // Check to make sure a quote does not appear in field.
      if (!options.lazyQuotes) {
        const j = field.indexOf(quote);
        if (j >= 0) {
          const col = graphemeLength(
            line.slice(0, line.length - currentLine.slice(j).length),
          );
          throw new ParseError(startLine + 1, lineIndex, col, ERR_BARE_QUOTE);
        }
      }
      recordBuffer += field;
      fieldIndexes.push(recordBuffer.length);
      if (i >= 0) {
        currentLine = currentLine.substring(i + separatorLen);
        continue currentLineLoop;
      }
      break currentLineLoop;
    } else {
      // Quoted string field
      currentLine = currentLine.substring(quoteLen);
      while (true) {
        const i = currentLine.indexOf(quote);
        if (i >= 0) {
          // Hit next quote.
          recordBuffer += currentLine.substring(0, i);
          currentLine = currentLine.substring(i + quoteLen);
          if (currentLine.startsWith(quote)) {
            // `""` sequence (append quote).
            recordBuffer += quote;
            currentLine = currentLine.substring(quoteLen);
          } else if (currentLine.startsWith(options.separator)) {
            // `","` sequence (end of field).
            currentLine = currentLine.substring(separatorLen);
            fieldIndexes.push(recordBuffer.length);
            continue currentLineLoop;
          } else if (0 === currentLine.length) {
            // `"\n` sequence (end of line).
            fieldIndexes.push(recordBuffer.length);
            break currentLineLoop;
          } else if (options.lazyQuotes) {
            // `"` sequence (bare quote).
            recordBuffer += quote;
          } else {
            // `"*` sequence (invalid non-escaped quote).
            const col = graphemeLength(
              line.slice(0, line.length - currentLine.length - quoteLen),
            );
            throw new ParseError(startLine + 1, lineIndex, col, ERR_QUOTE);
          }
        } else if (currentLine.length > 0 || !reader.isEOF()) {
          // Hit end of line (copy all data so far).
          recordBuffer += currentLine;
          const r = await reader.readLine();
          lineIndex++;
          currentLine = r ?? ""; // This is a workaround for making this module behave similarly to the encoding/csv/reader.go.
          line = currentLine;
          if (r === null) {
            // Abrupt end of file (EOF or error).
            if (!options.lazyQuotes) {
              const col = graphemeLength(line);
              throw new ParseError(startLine + 1, lineIndex, col, ERR_QUOTE);
            }
            fieldIndexes.push(recordBuffer.length);
            break currentLineLoop;
          }
          recordBuffer += "\n"; // preserve line feed (This is because TextProtoReader removes it.)
        } else {
          // Abrupt end of file (EOF on error).
          if (!options.lazyQuotes) {
            const col = graphemeLength(line);
            throw new ParseError(startLine + 1, lineIndex, col, ERR_QUOTE);
          }
          fieldIndexes.push(recordBuffer.length);
          break currentLineLoop;
        }
      }
    }
  }
  const result = [] as string[];
  let preIdx = 0;
  for (const i of fieldIndexes) {
    result.push(recordBuffer.slice(preIdx, i));
    preIdx = i;
  }
  return result;
}

/**
 * A ParseError is returned for parsing errors.
 * Line numbers are 1-indexed and columns are 0-indexed.
 *
 * @example Usage
 * ```ts
 * import { parse, ParseError } from "@std/csv/parse";
 * import { assertEquals } from "@std/assert";
 *
 * try {
 *   parse(`a "word","b"`);
 * } catch (error) {
 *   if (error instanceof ParseError) {
 *     assertEquals(error.message, `parse error on line 1, column 2: bare " in non-quoted-field`);
 *   }
 * }
 * ```
 */
export class ParseError extends SyntaxError {
  /**
   * Line where the record starts.
   *
   * @example Usage
   * ```ts
   * import { parse, ParseError } from "@std/csv/parse";
   * import { assertEquals } from "@std/assert";
   *
   * try {
   *   parse(`a "word","b"`);
   * } catch (error) {
   *   if (error instanceof ParseError) {
   *     assertEquals(error.startLine, 1);
   *   }
   * }
   * ```
   */
  startLine: number;
  /**
   * Line where the error occurred.
   *
   * @example Usage
   * ```ts
   * import { parse, ParseError } from "@std/csv/parse";
   * import { assertEquals } from "@std/assert";
   *
   * try {
   *   parse(`a "word","b"`);
   * } catch (error) {
   *   if (error instanceof ParseError) {
   *     assertEquals(error.line, 1);
   *   }
   * }
   * ```
   */
  line: number;
  /**
   * Column (rune index) where the error occurred.
   *
   * @example Usage
   * ```ts
   * import { parse, ParseError } from "@std/csv/parse";
   * import { assertEquals } from "@std/assert";
   *
   * try {
   *   parse(`a "word","b"`);
   * } catch (error) {
   *   if (error instanceof ParseError) {
   *     assertEquals(error.column, 2);
   *   }
   * }
   * ```
   */
  column: number | null;

  /**
   * Constructs a new instance.
   *
   * @example Usage
   * ```ts
   * import { parse, ParseError } from "@std/csv/parse";
   * import { assertEquals } from "@std/assert";
   *
   * try {
   *   parse(`a "word","b"`);
   * } catch (error) {
   *   if (error instanceof ParseError) {
   *     assertEquals(error.message, `parse error on line 1, column 2: bare " in non-quoted-field`);
   *   }
   * }
   * ```
   *
   * @param start Line where the record starts
   * @param line Line where the error occurred
   * @param column Column The index where the error occurred
   * @param message Error message
   */
  constructor(
    start: number,
    line: number,
    column: number | null,
    message: string,
  ) {
    super();
    this.startLine = start;
    this.column = column;
    this.line = line;

    if (message === ERR_FIELD_COUNT) {
      this.message = `record on line ${line}: ${message}`;
    } else if (start !== line) {
      this.message =
        `record on line ${start}; parse error on line ${line}, column ${column}: ${message}`;
    } else {
      this.message =
        `parse error on line ${line}, column ${column}: ${message}`;
    }
  }
}

export const ERR_BARE_QUOTE = 'bare " in non-quoted-field';
export const ERR_QUOTE = 'extraneous or missing " in quoted-field';
export const ERR_INVALID_DELIM = "Invalid Delimiter";
export const ERR_FIELD_COUNT = "wrong number of fields";

export function convertRowToObject(
  row: string[],
  headers: readonly string[],
  index: number,
) {
  if (row.length !== headers.length) {
    throw new Error(
      `Error number of fields line: ${index}\nNumber of fields found: ${headers.length}\nExpected number of fields: ${row.length}`,
    );
  }
  const out: Record<string, unknown> = {};
  for (const [index, header] of headers.entries()) {
    out[header] = row[index];
  }
  return out;
}

/** Parse result type for {@linkcode parse} and {@linkcode CsvParseStream}. */
export type ParseResult<ParseOptions, T> =
  // If `columns` option is specified, the return type is Record type.
  T extends ParseOptions & { columns: readonly (infer C extends string)[] }
    ? RecordWithColumn<C>[]
    // If `skipFirstRow` option is specified, the return type is Record type.
    : T extends ParseOptions & { skipFirstRow: true }
      ? Record<string, string | undefined>[]
    // If `columns` and `skipFirstRow` option is _not_ specified, the return type is string[][].
    : T extends
      ParseOptions & { columns?: undefined; skipFirstRow?: false | undefined }
      ? string[][]
    // else, the return type is Record type or string[][].
    : Record<string, string | undefined>[] | string[][];

/**
 * Record type with column type.
 *
 * @example
 * ```
 * type RecordWithColumn<"aaa"|"bbb"> => Record<"aaa"|"bbb", string>
 * type RecordWithColumn<string> => Record<string, string | undefined>
 * ```
 */
export type RecordWithColumn<C extends string> = string extends C
  ? Record<string, string | undefined>
  : Record<C, string>;
