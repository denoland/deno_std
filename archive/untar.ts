// Copyright 2018-2024 the Deno authors. All rights reserved. MIT license.

/*!
 * Ported and modified from: https://github.com/beatgammit/tar-js and
 * licensed as:
 *
 * (The MIT License)
 *
 * Copyright (c) 2011 T. Jameson Little
 * Copyright (c) 2019 Jun Kato
 * Copyright (c) 2018-2022 the Deno authors
 *
 * Permission is hereby granted, free of charge, to any person obtaining a copy
 * of this software and associated documentation files (the "Software"), to deal
 * in the Software without restriction, including without limitation the rights
 * to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
 * copies of the Software, and to permit persons to whom the Software is
 * furnished to do so, subject to the following conditions:
 *
 * The above copyright notice and this permission notice shall be included in
 * all copies or substantial portions of the Software.
 *
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
 * OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
 * THE SOFTWARE.
 */

import {
  FileTypes,
  HEADER_LENGTH,
  readBlock,
  type TarMeta,
  USTAR_STRUCTURE,
  type UstarFields,
} from "./_common.ts";
import { readAll } from "@std/io/read-all";
import type { Reader } from "@std/io/types";

export type { Reader };

/**
 * Extend TarMeta with the `linkName` property so that readers can access
 * symbolic link values without polluting the world of archive writers.
 *
 * > [!WARNING]
 * > **UNSTABLE**: New API, yet to be vetted.
 *
 * @experimental
 */
export interface TarMetaWithLinkName extends TarMeta {
  /** File name of the symbolic link. */
  linkName?: string;
}

/**
 * Tar header with raw, unprocessed bytes as values.
 *
 * > [!WARNING]
 * > **UNSTABLE**: New API, yet to be vetted.
 *
 * @experimental
 */
export type TarHeader = {
  [key in UstarFields]: Uint8Array;
};

// https://pubs.opengroup.org/onlinepubs/9699919799/utilities/pax.html#tag_20_92_13_06
// eight checksum bytes taken to be ascii spaces (decimal value 32)
const initialChecksum = 8 * 32;

/**
 * Trims a Uint8Array by removing any trailing zero bytes.
 *
 * @param buffer The Uint8Array to trim.
 * @returns A new Uint8Array with trailing zero bytes removed, or the original
 * buffer if no trailing zero bytes are found.
 */
function trim(buffer: Uint8Array): Uint8Array {
  const index = buffer.indexOf(0);
  return index === -1 ? buffer : buffer.subarray(0, index);
}

/**
 * Parse file header in a tar archive
 * @param length
 */
function parseHeader(buffer: Uint8Array): TarHeader {
  const data = {} as TarHeader;
  let offset = 0;
  USTAR_STRUCTURE.forEach(function (value) {
    const arr = buffer.subarray(offset, offset + value.length);
    data[value.field] = arr;
    offset += value.length;
  });
  return data;
}

/**
 * Tar entry
 *
 * > [!WARNING]
 * > **UNSTABLE**: New API, yet to be vetted.
 *
 * @experimental
 *
 * @example Usage
 * ```ts no-assert
 * import { TarEntry } from "@std/archive/untar";
 *
 * const content = new TextEncoder().encode("hello tar world!");
 * const reader = new Buffer(content);
 * const tarMeta = {
 *   fileName: "archive/",
 *   fileSize: 0,
 *   fileMode: 509,
 *   mtime: 1591800767,
 *   uid: 1001,
 *   gid: 1001,
 *   owner: "deno",
 *   group: "deno",
 *   type: "directory",
 * };
 * const tarEntry: TarEntry = new TarEntry(tarMeta, reader);
 * ```
 */
export interface TarEntry extends TarMetaWithLinkName {}

/**
 * Contains tar header metadata and a reader to the entry's body.
 *
 * > [!WARNING]
 * > **UNSTABLE**: New API, yet to be vetted.
 *
 * @experimental
 */
export class TarEntry implements Reader {
  #reader: Reader | (Reader & Deno.Seeker);
  #size: number;
  #read = 0;
  #consumed = false;
  #entrySize: number;

  /**
   * Constructs a new instance.
   *
   * @param meta The metadata of the entry.
   * @param reader The reader to read the entry from.
   */
  constructor(
    meta: TarMetaWithLinkName,
    reader: Reader | (Reader & Deno.Seeker),
  ) {
    Object.assign(this, meta);
    this.#reader = reader;

    // File Size
    this.#size = this.fileSize || 0;
    // Entry Size
    const blocks = Math.ceil(this.#size / HEADER_LENGTH);
    this.#entrySize = blocks * HEADER_LENGTH;
  }

  /**
   * Returns whether the entry has already been consumed.
   *
   * @returns Whether the entry has already been consumed.
   */
  get consumed(): boolean {
    return this.#consumed;
  }

  /**
   * Reads up to `p.byteLength` bytes of the tar entry into `p`. It resolves to
   * the number of bytes read (`0 < n <= p.byteLength`) and rejects if any
   * error encountered. Even if read() resolves to n < p.byteLength, it may use
   * all of `p` as scratch space during the call. If some data is available but
   * not `p.byteLength bytes`, read() conventionally resolves to what is available
   * instead of waiting for more.
   *
   * @param p The buffer to read the entry into.
   * @returns The number of bytes read (`0 < n <= p.byteLength`) or `null` if
   * there are no more bytes to read.
   *
   * @example Usage
   * ```ts
   * import { Buffer } from "@std/io/buffer";
   * import { TarEntry } from "@std/archive/untar";
   * import { assertEquals } from "@std/assert/equals";
   *
   * const text = "Hello, world!";
   *
   * const reader = new Buffer(new TextEncoder().encode(text));
   * const tarMeta = {
   *   fileName: "text",
   *   fileSize: 0,
   *   fileMode: 509,
   *   mtime: 1591800767,
   *   uid: 1001,
   *   gid: 1001,
   *   owner: "deno",
   *   group: "deno",
   *   type: "file",
   * };
   *
   * const tarEntry: TarEntry = new TarEntry(tarMeta, reader);
   * const p = new Uint8Array(1024);
   * const n = await tarEntry.read(p);
   * const result = new TextDecoder().decode(p.subarray(0, n));
   *
   * assertEquals(result, text);
   * ```
   */
  async read(p: Uint8Array): Promise<number | null> {
    // Bytes left for entry
    const entryBytesLeft = this.#entrySize - this.#read;
    const bufSize = Math.min(
      // bufSize can't be greater than p.length nor bytes left in the entry
      p.length,
      entryBytesLeft,
    );

    if (entryBytesLeft <= 0) {
      this.#consumed = true;
      return null;
    }

    const block = new Uint8Array(bufSize);
    const n = await readBlock(this.#reader, block);
    const bytesLeft = this.#size - this.#read;

    this.#read += n || 0;
    if (n === null || bytesLeft <= 0) {
      if (n === null) this.#consumed = true;
      return null;
    }

    // Remove zero filled
    const offset = bytesLeft < n ? bytesLeft : n;
    p.set(block.subarray(0, offset), 0);

    return offset < 0 ? n - Math.abs(offset) : offset;
  }

  /** Discords the current entry. */
  async discard() {
    // Discard current entry
    if (this.#consumed) return;
    this.#consumed = true;

    if (typeof (this.#reader as Deno.Seeker).seek === "function") {
      await (this.#reader as Deno.Seeker).seek(
        this.#entrySize - this.#read,
        Deno.SeekMode.Current,
      );
      this.#read = this.#entrySize;
    } else {
      await readAll(this);
    }
  }
}

/**
 * ### Overview
 * A class to extract from a tar archive.  Tar archives allow for storing multiple
 * files in a single file (called an archive, or sometimes a tarball).  These
 * archives typically have the '.tar' extension.
 *
 * ### Supported file formats
 * Only the ustar file format is supported.  This is the most common format. The
 * pax file format may also be read, but additional features, such as longer
 * filenames may be ignored.
 *
 * ### Usage
 * The workflow is to create a Untar instance referencing the source of the tar file.
 * You can then use the untar reference to extract files one at a time. See the worked
 * example below for details.
 *
 * ### Understanding compression
 * A tar archive may be compressed, often identified by the `.tar.gz` extension.
 * This utility does not support decompression which must be done before extracting
 * the files.
 *
 * @example Usage
 * ```ts no-eval
 * import { Untar } from "@std/archive/untar";
 * import { ensureFile } from "@std/fs/ensure-file";
 * import { ensureDir } from "@std/fs/ensure-dir";
 * import { copy } from "@std/io/copy";
 *
 * using reader = await Deno.open("./out.tar", { read: true });
 * const untar = new Untar(reader);
 *
 * for await (const entry of untar) {
 *   console.log(entry); // metadata
 *
 *   if (entry.type === "directory") {
 *     await ensureDir(entry.fileName);
 *     continue;
 *   }
 *
 *   await ensureFile(entry.fileName);
 *   using file = await Deno.open(entry.fileName, { write: true });
 *   // <entry> is a reader.
 *   await copy(entry, file);
 * }
 * ```
 *
 * > [!WARNING]
 * > **UNSTABLE**: New API, yet to be vetted.
 *
 * @experimental
 */
export class Untar {
  /** Internal reader. */
  #reader: Reader;
  /** Internal block. */
  #block: Uint8Array;
  #entry: TarEntry | undefined;

  /**
   * Constructs a new instance.
   *
   * @param reader The reader to extract from.
   */
  constructor(reader: Reader) {
    this.#reader = reader;
    this.#block = new Uint8Array(HEADER_LENGTH);
  }

  #checksum(header: Uint8Array): number {
    let sum = initialChecksum;
    for (let i = 0; i < HEADER_LENGTH; i++) {
      if (i >= 148 && i < 156) {
        // Ignore checksum header
        continue;
      }
      sum += header[i]!;
    }
    return sum;
  }

  async #getAndValidateHeader(): Promise<TarHeader | null> {
    await readBlock(this.#reader, this.#block);
    const header = parseHeader(this.#block);

    // calculate the checksum
    const decoder = new TextDecoder();
    const checksum = this.#checksum(this.#block);

    if (parseInt(decoder.decode(header.checksum), 8) !== checksum) {
      if (checksum === initialChecksum) {
        // EOF
        return null;
      }
      throw new Error("checksum error");
    }

    const magic = decoder.decode(header.ustar);

    if (magic.indexOf("ustar")) {
      throw new Error(`unsupported archive format: ${magic}`);
    }

    return header;
  }

  #getMetadata(header: TarHeader): TarMetaWithLinkName {
    const decoder = new TextDecoder();
    // get meta data
    const meta: TarMetaWithLinkName = {
      fileName: decoder.decode(trim(header.fileName)),
    };
    const fileNamePrefix = trim(header.fileNamePrefix);
    if (fileNamePrefix.byteLength > 0) {
      meta.fileName = decoder.decode(fileNamePrefix) + "/" + meta.fileName;
    }
    (["fileMode", "mtime", "uid", "gid"] as const)
      .forEach((key) => {
        const arr = trim(header[key]);
        if (arr.byteLength > 0) {
          meta[key] = parseInt(decoder.decode(arr), 8);
        }
      });
    (["owner", "group", "type"] as const)
      .forEach((key) => {
        const arr = trim(header[key]);
        if (arr.byteLength > 0) {
          meta[key] = decoder.decode(arr);
        }
      });

    meta.fileSize = parseInt(decoder.decode(header.fileSize), 8);
    meta.type = FileTypes[parseInt(meta.type!)] ?? meta.type;

    // Only create the `linkName` property for symbolic links to minimize
    // the effect on existing code that only deals with non-links.
    if (meta.type === "symlink") {
      meta.linkName = decoder.decode(trim(header.linkName));
    }

    return meta;
  }

  /**
   * Extract the next entry of the tar archive.
   *
   * @returns A TarEntry with header metadata and a reader to the entry's body,
   * or null if there are no more entries to extract.
   *
   * @example Usage
   * ```ts no-eval
   * import { Tar, Untar } from "@std/archive";
   *
   * const fileName = "output.txt";
   * const text = "hello tar world!";
   *
   * // create a tar archive
   * const tar = new Tar();
   * const content = new TextEncoder().encode(text);
   * await tar.append(fileName, {
   *   reader: new Buffer(content),
   *   contentSize: content.byteLength,
   * });
   *
   * // read data from a tar archive
   * const untar = new Untar(tar.getReader());
   * const result = await untar.extract();
   * const untarText = new TextDecoder("utf-8").decode(await readAll(result));
   * ```
   */
  async extract(): Promise<TarEntry | null> {
    if (this.#entry && !this.#entry.consumed) {
      // If entry body was not read, discard the body
      // so we can read the next entry.
      await this.#entry.discard();
    }

    const header = await this.#getAndValidateHeader();
    if (header === null) return null;

    const meta = this.#getMetadata(header);

    this.#entry = new TarEntry(meta, this.#reader);

    return this.#entry;
  }

  /**
   * Iterate over all entries of the tar archive.
   *
   * @yields A TarEntry with tar header metadata and a reader to the entry's body.
   * @returns An async iterator.
   *
   * @example Usage
   * ```ts no-eval
   * import { Untar } from "@std/archive/untar";
   * import { ensureFile } from "@std/fs/ensure-file";
   * import { ensureDir } from "@std/fs/ensure-dir";
   * import { copy } from "@std/io/copy";
   *
   * using reader = await Deno.open("./out.tar", { read: true });
   * const untar = new Untar(reader);
   *
   * for await (const entry of untar) {
   *   console.log(entry); // metadata
   *
   *   if (entry.type === "directory") {
   *     await ensureDir(entry.fileName);
   *     continue;
   *   }
   *
   *   await ensureFile(entry.fileName);
   *   using file = await Deno.open(entry.fileName, { write: true });
   *   // <entry> is a reader.
   *   await copy(entry, file);
   * }
   * ```
   */
  async *[Symbol.asyncIterator](): AsyncIterableIterator<TarEntry> {
    while (true) {
      const entry = await this.extract();

      if (entry === null) return;

      yield entry;
    }
  }
}
