// Copyright 2018-2021 the Deno authors. All rights reserved. MIT license.
// Copyright Joyent, Inc. and Node.js contributors. All rights reserved. MIT license.
import { default as randomBytes } from "./_crypto/randomBytes.ts";
import {
  createHasher as stdCreateHasher,
  Hasher,
  SupportedAlgorithm,
  supportedAlgorithms,
} from "../hash/mod.ts";
import { pbkdf2, pbkdf2Sync } from "./_crypto/pbkdf2.ts";
import { Buffer } from "./buffer.ts";
import { Transform } from "./stream.ts";
import { TransformOptions } from "./_stream/transform.ts";
import { encode as encodeToHex } from "../encoding/hex.ts";

/**
 * The Hash class is a utility for creating hash digests of data. It can be used in one of two ways:
 *
 * - As a stream that is both readable and writable, where data is written to produce a computed hash digest on the readable side, or
 * - Using the hash.update() and hash.digest() methods to produce the computed hash.
 *
 * The crypto.createHash() method is used to create Hash instances. Hash objects are not to be created directly using the new keyword.
 */
export class Hash extends Transform {
  public hash: Hasher;
  constructor(algorithm: SupportedAlgorithm, _opts?: TransformOptions) {
    super({
      transform(chunk: string, _encoding: string, callback: () => void): void {
        hash.update(chunk);
        callback();
      },
      flush(callback: () => void): void {
        this.push(hash.digest());
        callback();
      },
    });
    const hash = this.hash = stdCreateHasher(algorithm);
  }

  // TODO(kt3k): Implement copy method
  // copy(options) { ... }

  /**
   * Updates the hash content with the given data.
   */
  update(data: string | ArrayBuffer, _encoding?: string): this {
    if (typeof data === "string") {
      data = new TextEncoder().encode(data);
      this.hash.update(data);
    } else {
      this.hash.update(data);
    }
    return this;
  }

  /**
   * Calculates the digest of all of the data.
   *
   * If encoding is provided a string will be returned; otherwise a Buffer is returned.
   *
   * Supported encoding is currently 'hex' only. 'binary', 'base64' will be supported in the future versions.
   */
  digest(encoding?: string): Buffer | string {
    const digest = this.hash.digest();
    if (encoding === undefined) {
      return Buffer.from(digest);
    }

    switch (encoding) {
      case "hex": {
        return new TextDecoder().decode(encodeToHex(new Uint8Array(digest)));
      }
      // TODO(kt3k): Support more output encodings such as base64, binary, etc
      default: {
        throw new Error(
          `The output encoding for hash digest is not impelemented: ${encoding}`,
        );
      }
    }
  }
}

/**
 * Creates and returns a Hash object that can be used to generate hash digests
 * using the given `algorithm`. Optional `options` argument controls stream behavior.
 */
export function createHash(
  algorithm: SupportedAlgorithm,
  opts?: TransformOptions,
) {
  return new Hash(algorithm, opts);
}

/**
 * Returns an array of the names of the supported hash algorithms, such as 'sha1'.
 */
export function getHashes(): SupportedAlgorithm[] {
  return supportedAlgorithms.slice();
}

export default { Hash, createHash, getHashes, pbkdf2, pbkdf2Sync, randomBytes };
export { pbkdf2, pbkdf2Sync, randomBytes };
