// Copyright 2018-2021 the Deno authors. All rights reserved. MIT license.

/**
 * Types accepted as message input for a hasher.
 * String messages will first be encoded as UTF-8.
*/
export type Message = ArrayBuffer | ArrayBufferView | DataView | string;

/** An instance of a specific hash algorithm. */
export interface Hasher {
  /** Updates the hasher's state with additional message data. */
  update(message: Message): this;

  /** Resets the hasher to its initial state, before any input. */
  reset(): this;

  /**
   * Returns a new hasher that is a copy of this one. This may be used to more
   * efficiently calculate multiple digests that begin with the same input.
    */
  clone(): Hasher;

  /** Returns the digest of the hasher's state as bytes. */
  digest(options?: DigestOptions): Uint8Array;

  /**
   * Returns the digest of the hasher's state as bytes, and resets it to its
   * initial state. This may be slightly more efficient than calling .digest()
   * and .reset() separately for some algorithms.
   */
  digestAndReset(options?: DigestOptions): Uint8Array;

  /**
   * Returns the digest of the hasher's state encoded as a string.
   * By default, this will use lowercase hexadecimal.
   */
  toString(options?: DigestOptions & DigestFormatOptions): string;
}

/** Options for how the algorithm performs its digest operation. */
export interface DigestOptions {
  /**
   * Digest output length in (bytes). An error will be thrown if this is set to
   * a length that the algorithm does not support, and most algorithms only
   * support a single output length. Variable-length digests will default to the
   * minimum length required to meet the algorithm's maximum security target.
  */
  length?: number;
}

/** Options for how a digest is encoded/formatted as a string. */
export type DigestFormatOptions = {
  /**
   * Supported string encodings for hash digests.
   *
   * "hex" is lowercase hexadecimal.
   * "base64" is standard Base64 (with `+/` digits and `=` padding).
   * "unicode" is unicode code points, such as are used by atob()/btoa().
   *     https://developer.mozilla.org/en-US/docs/Web/API/DOMString/Binary
   */
  encoding?: "hex" | "base64" | "unicode";
};
