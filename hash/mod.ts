// Copyright 2018-2021 the Deno authors. All rights reserved. MIT license.

import { WasmHasher } from "./_wasm/mod.ts";
import type { DigestOptions, Hasher, Message } from "./hasher.ts";
export type { DigestOptions, Hasher, Message } from "./hasher.ts";

export const supportedAlgorithms = [
  "blake2b",
  "blake2s",
  "blake3",
  "keccak224",
  "keccak256",
  "keccak384",
  "keccak512",
  "md2",
  "md4",
  "md5",
  "ripemd160",
  "ripemd320",
  "sha1",
  "sha224",
  "sha256",
  "sha3-224",
  "sha3-256",
  "sha3-384",
  "sha3-512",
  "sha384",
  "sha512",
  "shake128",
  "shake256",
] as const;

export type SupportedAlgorithm = typeof supportedAlgorithms[number];

/**
 * Returns a new hasher instance implementing the specified hash algorithm.
 */
export function createHasher(algorithm: SupportedAlgorithm): Hasher {
  return new WasmHasher(algorithm);
}

const instances: { [k in SupportedAlgorithm]?: Hasher } = {};

/**
 * Returns the digest of a message using the specified hash algorithm. This will
 * re-use a shared Hasher instance internally, which may perform better than
 * creating a new one for every operation.
 */
export function digest(
  algorithm: SupportedAlgorithm,
  message: Message,
  options?: DigestOptions,
): Uint8Array {
  const hasher = instances[algorithm] ??= createHasher(algorithm);
  hasher.update(message);
  return hasher.digestAndReset(options);
}
