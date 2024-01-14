// Copyright 2018-2024 the Deno authors. All rights reserved. MIT license.
// This module is browser compatible.

import { type Reader } from "./types.ts";
import { BufReader } from "./buf_reader.ts";
import { concat } from "../bytes/concat.ts";

/**
 * Read strings line-by-line from a Reader.
 *
 *  @example
 * ```ts
 * import { readLines } from "https://deno.land/std@$STD_VERSION/io/read_lines.ts";
 * import * as path from "https://deno.land/std@$STD_VERSION/path/mod.ts";
 *
 * const filename = path.join(Deno.cwd(), "std/io/README.md");
 * let fileReader = await Deno.open(filename);
 *
 * for await (let line of readLines(fileReader)) {
 *   console.log(line);
 * }
 * ```
 *
 * @deprecated (will be removed in 0.215.0) Use
 * {@linkcode https://deno.land/std/io/to_readable_stream.ts | toReadableStream}
 * and {@linkcode https://deno.land/std/io/text_line_stream.ts | TextLineStream}
 * instead.
 */
export async function* readLines(
  reader: Reader,
  decoderOpts?: {
    encoding?: string;
    fatal?: boolean;
    ignoreBOM?: boolean;
  },
): AsyncIterableIterator<string> {
  const bufReader = new BufReader(reader);
  let chunks: Uint8Array[] = [];
  const decoder = new TextDecoder(decoderOpts?.encoding, decoderOpts);
  while (true) {
    const res = await bufReader.readLine();
    if (!res) {
      if (chunks.length > 0) {
        yield decoder.decode(concat(chunks));
      }
      break;
    }
    chunks.push(res.line);
    if (!res.more) {
      yield decoder.decode(concat(chunks));
      chunks = [];
    }
  }
}
