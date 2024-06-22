// Copyright 2018-2023 the Deno authors. All rights reserved. MIT license.
/**
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
  FILE_TYPES,
  recordSize,
  TarInfo,
  ustarStructure,
} from "./_stream_common.ts";

const ustar = "ustar\u000000";

function pad(num: number, bytes: number): string {
  return num.toString(8).padStart(bytes, "0");
}
/*
struct posix_header {           // byte offset
  char name[100];               //   0
  char mode[8];                 // 100
  char uid[8];                  // 108
  char gid[8];                  // 116
  char size[12];                // 124
  char mtime[12];               // 136
  char chksum[8];               // 148
  char typeflag;                // 156
  char linkname[100];           // 157
  char magic[6];                // 257
  char version[2];              // 263
  char uname[32];               // 265
  char gname[32];               // 297
  char devmajor[8];             // 329
  char devminor[8];             // 337
  char prefix[155];             // 345
                                // 500
};
*/

/**
 * Create header for a file in a tar archive
 */
function formatHeader(data: TarData): Uint8Array {
  const encoder = new TextEncoder();
  const buffer = new Uint8Array(512);
  let offset = 0;
  for (const value of ustarStructure) {
    const entry = encoder.encode(data[value.field as keyof TarData]);
    buffer.set(entry, offset);
    offset += value.length; // space it out with nulls
  }
  return buffer;
}

export interface TarData {
  fileName?: string;
  fileNamePrefix?: string;
  fileMode?: string;
  uid?: string;
  gid?: string;
  fileSize: string;
  mtime?: string;
  checksum?: string;
  type?: string;
  ustar?: string;
  owner?: string;
  group?: string;
}

export interface TarDataWithSource extends TarData {
  /**
   * buffer to read
   */
  readable: ReadableStream<Uint8Array>;
}

export interface TarOptions extends TarInfo {
  /**
   * file name
   */
  name: string;

  /**
   * append any arbitrary content
   */
  readable: ReadableStream<Uint8Array>;

  /**
   * size of the content to be appended
   */
  contentSize: number;
}

/**
 * A class to create a tar archive
 */
export class TarStream extends TransformStream<TarOptions, Uint8Array> {
  constructor() {
    super({
      transform: async (chunk: TarOptions, controller) => {
        // separate file name into two parts if needed
        let fileNamePrefix: string | undefined;
        let fileName = chunk.name;
        if (fileName.length > 100) {
          const i = fileName.lastIndexOf("/", 155);
          if (i >= 0) {
            fileNamePrefix = fileName.substring(0, i);
            fileName = fileName.substring(i + 1);
          } else {
            throw new Error(
              "ustar format does not allow a long file name (length of [file name prefix] + / + [file name] must be shorter than 256 bytes)",
            );
          }
          if (fileNamePrefix.length > 155) {
            throw new Error(
              "ustar format does not allow a long file name (length of [file name prefix] + / + [file name] must be shorter than 256 bytes)",
            );
          }
        }
        const mode = chunk.fileMode || parseInt("777", 8) & 0xfff;
        const mtime = Math.floor(chunk.mtime ?? new Date().valueOf() / 1000);
        const uid = chunk.uid || 0;
        const gid = chunk.gid || 0;

        if (typeof chunk.owner === "string" && chunk.owner.length >= 32) {
          throw new Error(
            "ustar format does not allow owner name length >= 32 bytes",
          );
        }
        if (typeof chunk.group === "string" && chunk.group.length >= 32) {
          throw new Error(
            "ustar format does not allow group name length >= 32 bytes",
          );
        }

        const type = FILE_TYPES.indexOf(chunk.type ?? "file");

        const tarData: TarDataWithSource = {
          fileName,
          fileNamePrefix,
          fileMode: pad(mode, 7),
          uid: pad(uid, 7),
          gid: pad(gid, 7),
          fileSize: pad(chunk.contentSize, 11),
          mtime: pad(mtime, 11),
          checksum: "        ",
          type: type.toString(),
          ustar,
          owner: chunk.owner || "",
          group: chunk.group || "",
          readable: chunk.readable,
        };

        // calculate the checksum
        let checksum = 0;
        const encoder = new TextEncoder();
        for (const key in tarData) {
          if (key === "readable") {
            continue;
          }
          checksum += encoder.encode(tarData[key as keyof TarData]).reduce(
            (p, c) => p + c,
            0,
          );
        }

        tarData.checksum = pad(checksum, 6) + "\u0000 ";

        controller.enqueue(formatHeader(tarData));

        for await (const readableChunk of chunk.readable) {
          controller.enqueue(readableChunk);
        }

        controller.enqueue(
          new Uint8Array(
            recordSize -
              (parseInt(tarData.fileSize, 8) % recordSize || recordSize),
          ),
        );
      },
      flush(controller) {
        // append 2 empty records
        controller.enqueue(new Uint8Array(recordSize * 2));
      },
    });
  }
}
