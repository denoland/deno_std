// Copyright 2018-2024 the Deno authors. All rights reserved. MIT license.
/**
 * The interface required to provide a file.
 */
export interface TarStreamFile {
  pathname: string | [Uint8Array, Uint8Array];
  size: number;
  sizeExtension?: boolean;
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
export class TarStream {
  #readable: ReadableStream<Uint8Array>;
  #writable: WritableStream<TarStreamInput>;
  /**
   * Constructs a new instance.
   */
  constructor() {
    const { readable, writable } = new TransformStream<
      TarStreamFile | TarStreamDir,
      TarStreamFile | TarStreamDir
    >();
    const gen = (async function* () {
      const paths: string[] = [];
      for await (const chunk of readable) {
        if (chunk.options && !validTarStreamOptions(chunk.options)) {
          throw new Error("Invalid Options Provided!");
        }

        if (
          "size" in chunk &&
          (
            chunk.size < 0 ||
            Math.pow(8, chunk.sizeExtension ? 12 : 11) < chunk.size ||
            chunk.size.toString() === "NaN"
          )
        ) {
          throw new Error(
            "Invalid Size Provided! Size cannot exceed 8 GiBs by default or 64 GiBs with sizeExtension set to true.",
          );
        }

        const [prefix, name] = typeof chunk.pathname === "string"
          ? parsePathname(chunk.pathname, !("size" in chunk))
          : function () {
            if ("size" in chunk === (chunk.pathname[1].slice(-1)[0] === 47)) {
              throw new Error(
                `Pre-parsed pathname for ${
                  "size" in chunk ? "directory" : "file"
                } is not suffixed correctly. Directories should end in a forward slash, while files shouldn't.`,
              );
            }
            return chunk.pathname;
          }();
        {
          const decoder = new TextDecoder();
          const pathname = prefix.length
            ? decoder.decode(prefix) + "/" + decoder.decode(name)
            : decoder.decode(name);
          if (paths.includes(pathname)) {
            continue;
          }
          paths.push(pathname);
        }
        const typeflag = "size" in chunk ? "0" : "5";
        const sizeExtension = "size" in chunk && chunk.sizeExtension || false;
        const encoder = new TextEncoder();
        const header = new Uint8Array(512);

        header.set(name); // name
        header.set(
          encoder.encode(
            (chunk.options?.mode ?? (typeflag === "5" ? "755" : "644"))
              .padStart(6, "0") +
              " \0" + // mode
              (chunk.options?.uid ?? "").padStart(6, "0") + " \0" + // uid
              (chunk.options?.gid ?? "").padStart(6, "0") + " \0" + // gid
              ("size" in chunk ? chunk.size.toString(8) : "").padStart(
                sizeExtension ? 12 : 11,
                "0",
              ) + (sizeExtension ? "" : " ") + // size
              (chunk.options?.mtime?.toString(8) ??
                Math.floor(new Date().getTime() / 1000).toString(8)).padStart(
                  11,
                  "0",
                ) +
              " " + // mtime
              " ".repeat(8) + // checksum | Needs to be updated
              typeflag + // typeflag
              "\0".repeat(100) + // linkname
              "ustar\0" + // magic
              "00" + // version
              (chunk.options?.uname ?? "").padEnd(32, "\0") + // uname
              (chunk.options?.gname ?? "").padEnd(32, "\0") + // gname
              (chunk.options?.devmajor ?? "").padEnd(8, "\0") + // devmajor
              (chunk.options?.devminor ?? "").padEnd(8, "\0"), // devminor
          ),
          100,
        );
        header.set(prefix, 345); // prefix

        header.set(
          encoder.encode(
            header.reduce((x, y) => x + y).toString(8).padStart(6, "0") + "\0",
          ),
          148,
        ); // update checksum
        yield header;

        if ("size" in chunk) {
          let size = 0;
          for await (const x of chunk.iterable) {
            size += x.length;
            yield x;
          }
          if (chunk.size !== size) {
            throw new Error(
              "Invalid Tarball! Provided size did not match bytes read from iterable.",
            );
          }
          if (chunk.size % 512) {
            yield new Uint8Array(new Array(512 - chunk.size % 512).fill(0));
          }
        }
      }
      yield new Uint8Array(new Array(1024).fill(0));
    })();

    this.#readable = new ReadableStream(
      {
        leftover: new Uint8Array(0),
        type: "bytes",
        async pull(controller) {
          // If Byte Stream
          if (controller.byobRequest?.view) {
            const buffer = new Uint8Array(
              controller.byobRequest.view.buffer,
            );
            if (buffer.length < this.leftover.length) {
              buffer.set(this.leftover.slice(0, buffer.length));
              this.leftover = this.leftover.slice(buffer.length);
              return controller.byobRequest.respond(buffer.length);
            }
            buffer.set(this.leftover);
            let offset = this.leftover.length;
            while (offset < buffer.length) {
              const { done, value } = await gen.next();
              if (done) {
                try {
                  controller.byobRequest.respond(offset); // Will throw if zero
                  controller.close();
                } catch {
                  controller.close();
                  controller.byobRequest.respond(0); // But still needs to be resolved.
                }
                return;
              }
              if (value.length > buffer.length - offset) {
                buffer.set(value.slice(0, buffer.length - offset), offset);
                offset = buffer.length - offset;
                controller.byobRequest.respond(buffer.length);
                this.leftover = value.slice(offset);
                return;
              }
              buffer.set(value, offset);
              offset += value.length;
            }
            this.leftover = new Uint8Array(0);
            return controller.byobRequest.respond(buffer.length);
          }
          // Else Default Stream
          const { done, value } = await gen.next();
          if (done) {
            return controller.close();
          }
          controller.enqueue(value);
        },
      } as UnderlyingByteSource & { leftover: Uint8Array },
    );
    this.#writable = writable;
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
  get writable(): WritableStream<TarStreamFile | TarStreamDir> {
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
  isDirectory = false,
): [Uint8Array, Uint8Array] {
  pathname = pathname.split("/").filter((x) => x).join("/");
  if (pathname.startsWith("./")) {
    pathname = pathname.slice(2);
  }
  if (isDirectory) {
    pathname += "/";
  }

  const name = new TextEncoder().encode(pathname);
  if (name.length <= 100) {
    return [new Uint8Array(0), name];
  }

  if (name.length > 256) {
    throw new Error("Invalid Pathname! Pathname cannot exceed 256 bytes.");
  }

  let i = Math.max(0, name.lastIndexOf(47));
  if (pathname.slice(i + 1).length > 100) {
    throw new Error("Invalid Filename! Filename cannot exceed 100 bytes.");
  }

  for (; i > 0; --i) {
    i = name.lastIndexOf(47, i) + 1;
    if (name.slice(i + 1).length > 100) {
      i = Math.max(0, name.indexOf(47, i + 1));
      break;
    }
  }

  const prefix = name.slice(0, i);
  if (prefix.length > 155) {
    throw new Error(
      "Invalid Pathname! Pathname needs to be split-able on a forward slash separator into [155, 100] bytes respectively.",
    );
  }
  return [prefix, name.slice(i + 1)];
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
