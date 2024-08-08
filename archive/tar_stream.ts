// Copyright 2018-2024 the Deno authors. All rights reserved. MIT license.
/**
 * The interface required to provide a file.
 */
export interface TarStreamFile {
  pathname: string | [Uint8Array, Uint8Array];
  size: number;
  iterable: Iterable<Uint8Array> | AsyncIterable<Uint8Array>;
  options?: Partial<TarStreamOptions>;
}

/**
 * The interface required to provide a directory.
 */
export interface TarStreamDir {
  pathname: string | [Uint8Array, Uint8Array];
  options?: Partial<TarStreamOptions>;
}

/**
 * A union type merging all the TarStream interfaces that can be piped into the
 * TarStream class.
 */
export type TarStreamInput = TarStreamFile | TarStreamDir;

/**
 * The options that can go along with a file or directory.
 * @param mode An octal number in ASCII.
 * @param uid An octal number in ASCII.
 * @param gid An octal number in ASCII.
 * @param mtime A number of seconds since the start of epoch. Avoid negative
 * values.
 * @param uname An ASCII string. Should be used in preference of uid.
 * @param gname An ASCII string. Should be used in preference of gid.
 * @param devmajor The major number for character device.
 * @param devminor The minor number for block device entry.
 */
export interface TarStreamOptions {
  mode: string;
  uid: string;
  gid: string;
  mtime: number;
  uname: string;
  gname: string;
  devmajor: string;
  devminor: string;
}

const SLASH_CODE_POINT = "/".charCodeAt(0);

/**
 * ### Overview
 * A TransformStream to create a tar archive.  Tar archives allow for storing
 * multiple files in a single file (called an archive, or sometimes a tarball).
 *   These archives typically have a single '.tar' extension.  This
 * implementation follows the [FreeBSD 15.0](https://man.freebsd.org/cgi/man.cgi?query=tar&sektion=5&apropos=0&manpath=FreeBSD+15.0-CURRENT) spec.
 *
 * ### File Format & Limitations
 * The ustar file format is used for creating the tar archive.  While this
 * format is compatible with most tar readers, the format has several
 * limitations, including:
 * - Pathnames must be at most 256 characters.
 * - Files must be at most 8 GiBs in size, or 64 GiBs if `sizeExtension` is set
 * to true.
 * - Sparse files are not supported.
 *
 * ### Usage
 * TarStream may throw an error for several reasons. A few of those are:
 * - The pathname is invalid.
 * - The size provided does not match that of the iterable's length.
 *
 * ### Compression
 * Tar archives are not compressed by default.  If you'd like to compress the
 * archive, you may do so by piping it through a compression stream.
 *
 * @example
 * ```ts
 * import { TarStream } from "@std/archive/tar-stream";
 *
 * await ReadableStream.from([
 *   {
 *     pathname: 'potato/'
 *   },
 *   {
 *     pathname: 'deno.json',
 *     size: (await Deno.stat('deno.json')).size,
 *     iterable: (await Deno.open('deno.json')).readable
 *   },
 *   {
 *     pathname: 'deno.lock',
 *     size: (await Deno.stat('deno.lock')).size,
 *     iterable: (await Deno.open('deno.lock')).readable
 *   }
 * ])
 *   .pipeThrough(new TarStream())
 *   .pipeThrough(new CompressionStream('gzip'))
 *   .pipeTo((await Deno.create('./out.tar.gz')).writable)
 * ```
 */
export class TarStream implements TransformStream<TarStreamInput, Uint8Array> {
  #readable: ReadableStream<Uint8Array>;
  #writable: WritableStream<TarStreamInput>;
  /**
   * Constructs a new instance.
   */
  constructor() {
    const { readable, writable } = new TransformStream<
      TarStreamInput,
      TarStreamInput & { pathname: [Uint8Array, Uint8Array] }
    >({
      transform(chunk, controller) {
        if (chunk.options && !validTarStreamOptions(chunk.options)) {
          return controller.error("Invalid Options Provided!");
        }

        if (
          "size" in chunk &&
          (chunk.size < 0 || 8 ** 12 < chunk.size ||
            chunk.size.toString() === "NaN")
        ) {
          return controller.error(
            "Invalid Size Provided! Size cannot exceed 64 Gibs.",
          );
        }

        const pathname = typeof chunk.pathname === "string"
          ? parsePathname(chunk.pathname)
          : function () {
            if (
              chunk.pathname[0].length > 155 || chunk.pathname[1].length > 100
            ) {
              controller.error(
                "Invalid Pathname. Pathnames, when provided as a Uint8Array, need to be no more than [155, 100] bytes respectively.",
              );
            }
            return chunk.pathname;
          }();

        controller.enqueue({ ...chunk, pathname });
      },
    });
    this.#writable = writable;
    const gen = async function* () {
      const encoder = new TextEncoder();
      for await (const chunk of readable) {
        const [prefix, name] = chunk.pathname;
        const typeflag = "size" in chunk ? "0" : "5";
        const header = new Uint8Array(512);
        const size = "size" in chunk ? chunk.size : 0;
        const options: TarStreamOptions = {
          mode: typeflag === "5" ? "755" : "644",
          uid: "",
          gid: "",
          mtime: Math.floor(new Date().getTime() / 1000),
          uname: "",
          gname: "",
          devmajor: "",
          devminor: "",
          ...chunk.options,
        };

        header.set(name); // name
        header.set(
          encoder.encode(
            options.mode.padStart(6, "0") + " \0" + // mode
              options.uid.padStart(6, "0") + " \0" + //uid
              options.gid.padStart(6, "0") + " \0" + // gid
              size.toString(8).padStart(size < 8 ** 11 ? 11 : 12, "0") +
              (size < 8 ** 11 ? " " : "") + // size
              options.mtime.toString(8).padStart(11, "0") + " " + // mtime
              " ".repeat(8) + // checksum | To be updated later
              typeflag + // typeflag
              "\0".repeat(100) + // linkname
              "ustar\0" + // magic
              "00" + // version
              options.uname.padStart(32, "\0") + // uname
              options.gname.padStart(32, "\0") + // gname
              options.devmajor.padStart(8, "\0") + // devmajor
              options.devminor.padStart(8, "\0"), // devminor
          ),
          100,
        );
        header.set(prefix, 345); // prefix
        // Update Checksum
        header.set(
          encoder.encode(
            header.reduce((x, y) => x + y).toString(8).padStart(6, "0") + "\0",
          ),
          148,
        );
        yield header;

        if ("size" in chunk) {
          let size = 0;
          for await (const value of chunk.iterable) {
            size += value.length;
            yield value;
          }
          if (chunk.size !== size) {
            throw new Error(
              "Invalid Tarball! Provided size did not match bytes read from provided iterable.",
            );
          }
          if (chunk.size % 512) {
            yield new Uint8Array(512 - size % 512);
          }
        }
      }
      yield new Uint8Array(1024);
    }();
    this.#readable = new ReadableStream({
      type: "bytes",
      async pull(controller) {
        const { done, value } = await gen.next();
        if (done) {
          controller.close();
          return controller.byobRequest?.respond(0);
        }
        if (controller.byobRequest?.view) {
          const buffer = new Uint8Array(controller.byobRequest.view.buffer);

          const size = buffer.length;
          if (size < value.length) {
            buffer.set(value.slice(0, size));
            controller.byobRequest.respond(size);
            controller.enqueue(value.slice(size));
          } else {
            buffer.set(value);
            controller.byobRequest.respond(value.length);
          }
        } else {
          controller.enqueue(value);
        }
      },
    });
  }

  /**
   * The ReadableStream
   */
  get readable(): ReadableStream<Uint8Array> {
    return this.#readable;
  }

  /**
   * The WritableStream
   */
  get writable(): WritableStream<TarStreamInput> {
    return this.#writable;
  }
}

/**
 * parsePathname is a function that validates the correctness of the pathname
 * being provided.
 * Function will throw if invalid pathname is provided.
 * The result can be provided instead of the string version to TarStream,
 * or can just be used to check in advance of creating the Tar archive.
 */
export function parsePathname(
  pathname: string,
): [Uint8Array, Uint8Array] {
  const name = new TextEncoder().encode(pathname);
  if (name.length <= 100) {
    return [new Uint8Array(0), name];
  }

  if (name.length > 256) {
    throw new Error("Invalid Pathname! Pathname cannot exceed 256 bytes.");
  }

  // If length of last part is > 100, then there's no possible answer to split the path
  let suitableSlashPos = Math.max(0, name.lastIndexOf(SLASH_CODE_POINT)); // always holds position of '/'
  if (name.length - suitableSlashPos > 100) {
    throw new Error("Invalid Filename! Filename cannot exceed 100 bytes.");
  }

  for (
    let nextPos = suitableSlashPos;
    nextPos > 0;
    suitableSlashPos = nextPos
  ) {
    // disclaimer: '/' won't appear at pos 0, so nextPos always be > 0 or = -1
    nextPos = name.lastIndexOf(SLASH_CODE_POINT, suitableSlashPos - 1);
    // disclaimer: since name.length > 100 in this case, if nextPos = -1, name.length - nextPos will also > 100
    if (name.length - nextPos > 100) {
      break;
    }
  }

  const prefix = name.slice(0, suitableSlashPos);
  if (prefix.length > 155) {
    throw new Error(
      "Invalid Pathname! Pathname needs to be split-able on a forward slash separator into [155, 100] bytes respectively.",
    );
  }
  return [prefix, name.slice(suitableSlashPos + 1)];
}
/**
 * validTarStreamOptions is a function that returns a true if all of the options
 * provided are in the correct format, otherwise returns false.
 */
export function validTarStreamOptions(
  options: Partial<TarStreamOptions>,
): boolean {
  if (
    options.mode && (options.mode.length > 6 || !/^[0-7]*$/.test(options.mode))
  ) return false;
  if (
    options.uid && (options.uid.length > 6 || !/^[0-7]*$/.test(options.uid))
  ) return false;
  if (
    options.gid && (options.gid.length > 6 || !/^[0-7]*$/.test(options.gid))
  ) return false;
  if (
    options.mtime != undefined &&
    (options.mtime.toString(8).length > 11 ||
      options.mtime.toString() === "NaN")
  ) return false;
  if (
    options.uname &&
    // deno-lint-ignore no-control-regex
    (options.uname.length > 32 || !/^[\x00-\x7F]*$/.test(options.uname))
  ) return false;
  if (
    options.gname &&
    // deno-lint-ignore no-control-regex
    (options.gname.length > 32 || !/^[\x00-\x7F]*$/.test(options.gname))
  ) return false;
  if (
    options.devmajor &&
    (options.devmajor.length > 8 || !/^[0-7]*$/.test(options.devmajor))
  ) return false;
  if (
    options.devminor &&
    (options.devminor.length > 8 || !/^[0-7]*$/.test(options.devminor))
  ) return false;
  return true;
}
