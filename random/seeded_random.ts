// Copyright 2018-2024 the Deno authors. All rights reserved. MIT license.

/**
 * Equivalent to `PCG32_INITIALIZER` in the official C/C++ library.
 *
 * This can be used as a "default" seed in cases where uniqueness is not
 * required, as it will always generate the same results.
 *
 * May be suitable for testing, but not recommended for production use.
 */
// deno-fmt-ignore
export const PCG32_INITIALIZER: Readonly<SeededRandomState> = {
  algorithm: "pcg32",
  state: [0x85, 0x3c, 0x49, 0xe6, 0x74, 0x8f, 0xea, 0x9b],
  inc: [0xda, 0x3e, 0x39, 0xcb, 0x94, 0xb9, 0x5b, 0xdb],
}

/**
 * The maximum value of a 64-bit unsigned integer plus one.
 * `n % U64_CEIL` simulates uint64 integer overflow in C.
 */
const U64_CEIL = 2n ** 64n;
/**
 * The maximum value of a 32-bit unsigned integer plus one.
 * `n % U32_CEIL` simulates uint32 integer overflow in C.
 */
const U32_CEIL = 2n ** 32n;

/**
 * Options for {@linkcode SeededRandom}.
 */
type SeededRandomConstructorOptions = {
  /**
   * The seed for the random number generator. Must be 16 bytes long.
   */
  seed: Uint8Array | (Byte[] & { length: 16 });
};

/**
 * A number that fits into a single byte as an unsigned integer (0..255).
 */
export type Byte =
  // deno-fmt-ignore
  | 0x00 | 0x01 | 0x02 | 0x03 | 0x04 | 0x05 | 0x06 | 0x07 | 0x08 | 0x09 | 0x0a | 0x0b | 0x0c | 0x0d | 0x0e | 0x0f
  | 0x10 | 0x11 | 0x12 | 0x13 | 0x14 | 0x15 | 0x16 | 0x17 | 0x18 | 0x19 | 0x1a | 0x1b | 0x1c | 0x1d | 0x1e | 0x1f
  | 0x20 | 0x21 | 0x22 | 0x23 | 0x24 | 0x25 | 0x26 | 0x27 | 0x28 | 0x29 | 0x2a | 0x2b | 0x2c | 0x2d | 0x2e | 0x2f
  | 0x30 | 0x31 | 0x32 | 0x33 | 0x34 | 0x35 | 0x36 | 0x37 | 0x38 | 0x39 | 0x3a | 0x3b | 0x3c | 0x3d | 0x3e | 0x3f
  | 0x40 | 0x41 | 0x42 | 0x43 | 0x44 | 0x45 | 0x46 | 0x47 | 0x48 | 0x49 | 0x4a | 0x4b | 0x4c | 0x4d | 0x4e | 0x4f
  | 0x50 | 0x51 | 0x52 | 0x53 | 0x54 | 0x55 | 0x56 | 0x57 | 0x58 | 0x59 | 0x5a | 0x5b | 0x5c | 0x5d | 0x5e | 0x5f
  | 0x60 | 0x61 | 0x62 | 0x63 | 0x64 | 0x65 | 0x66 | 0x67 | 0x68 | 0x69 | 0x6a | 0x6b | 0x6c | 0x6d | 0x6e | 0x6f
  | 0x70 | 0x71 | 0x72 | 0x73 | 0x74 | 0x75 | 0x76 | 0x77 | 0x78 | 0x79 | 0x7a | 0x7b | 0x7c | 0x7d | 0x7e | 0x7f
  | 0x80 | 0x81 | 0x82 | 0x83 | 0x84 | 0x85 | 0x86 | 0x87 | 0x88 | 0x89 | 0x8a | 0x8b | 0x8c | 0x8d | 0x8e | 0x8f
  | 0x90 | 0x91 | 0x92 | 0x93 | 0x94 | 0x95 | 0x96 | 0x97 | 0x98 | 0x99 | 0x9a | 0x9b | 0x9c | 0x9d | 0x9e | 0x9f
  | 0xa0 | 0xa1 | 0xa2 | 0xa3 | 0xa4 | 0xa5 | 0xa6 | 0xa7 | 0xa8 | 0xa9 | 0xaa | 0xab | 0xac | 0xad | 0xae | 0xaf
  | 0xb0 | 0xb1 | 0xb2 | 0xb3 | 0xb4 | 0xb5 | 0xb6 | 0xb7 | 0xb8 | 0xb9 | 0xba | 0xbb | 0xbc | 0xbd | 0xbe | 0xbf
  | 0xc0 | 0xc1 | 0xc2 | 0xc3 | 0xc4 | 0xc5 | 0xc6 | 0xc7 | 0xc8 | 0xc9 | 0xca | 0xcb | 0xcc | 0xcd | 0xce | 0xcf
  | 0xd0 | 0xd1 | 0xd2 | 0xd3 | 0xd4 | 0xd5 | 0xd6 | 0xd7 | 0xd8 | 0xd9 | 0xda | 0xdb | 0xdc | 0xdd | 0xde | 0xdf
  | 0xe0 | 0xe1 | 0xe2 | 0xe3 | 0xe4 | 0xe5 | 0xe6 | 0xe7 | 0xe8 | 0xe9 | 0xea | 0xeb | 0xec | 0xed | 0xee | 0xef
  | 0xf0 | 0xf1 | 0xf2 | 0xf3 | 0xf4 | 0xf5 | 0xf6 | 0xf7 | 0xf8 | 0xf9 | 0xfa | 0xfb | 0xfc | 0xfd | 0xfe | 0xff;

/**
 * Resumable state for a {@linkcode SeededRandom}.
 */
export type SeededRandomState = {
  /**
   * The algorithm. Currently, only `pcg32` is supported.
   */
  algorithm: "pcg32";
  /**
   * The current changeable state of the PCG random number generator.
   * This value changes upon each iteration of the random number generator.
   */
  state: readonly Byte[] & { length: 8 };
  /**
   * The amount used to increment each iteration of the PCG random number generator.
   * This value affects the random numbers generated but remains constant.
   */
  inc: readonly Byte[] & { length: 8 };
};

/**
 * A seeded pseudo-random number generator, implementing the
 * {@link https://en.wikipedia.org/wiki/Permuted_congruential_generator | PCG32}
 * algorithm.
 *
 * @example Usage
 * ```ts
 * import { SeededRandom } from "@std/random";
 * import { assertEquals } from "@std/assert";
 *
 * const prng = new SeededRandom({
 *  seed: [
 *    0x19, 0x57, 0xc5, 0x20, 0x6d, 0x56, 0xb3, 0xf4,
 *    0x6e, 0xa1, 0x3c, 0x00, 0xb4, 0x6b, 0xcf, 0xa9,
 *  ],
 * });
 * assertEquals(prng.random(), 0.9590322358999401);
 * assertEquals(prng.random(), 0.3763687589671463);
 * assertEquals(prng.random(), 0.5337617760524154);
 * ```
 */
export class SeededRandom {
  #state!: bigint;
  #inc!: bigint;

  /**
   * Constructs a new instance.
   *
   * @param seed - The seed for the random number generator, which can be
   * either a 2-tuple of bigints or a single bigint, which
   * will be converted to a state 2-tuple.
   *
   * @example Usage
   * ```ts no-assert
   * import { SeededRandom } from "@std/random";
   * const prng = new SeededRandom({
   *  seed: [
   *    0x19, 0x57, 0xc5, 0x20, 0x6d, 0x56, 0xb3, 0xf4,
   *    0x6e, 0xa1, 0x3c, 0x00, 0xb4, 0x6b, 0xcf, 0xa9,
   *  ],
   * });
   * ```
   */
  constructor({ seed }: SeededRandomConstructorOptions) {
    this.#seed(seed);

    // For convenience, allowing destructuring and direct usage in callbacks
    // equivalently to Math.random()
    this.random = this.random.bind(this);
  }

  /**
   * Creates a new instance from a given state.
   *
   * @param state The state to use.
   * @returns A `SeededRandom` instance resumed from the given state.
   *
   * @example Usage
   * ```ts no-eval
   * import { SeededRandom } from "@std/random";
   * import { assertEquals } from "@std/assert";
   *
   * const prng = new SeededRandom({
   *  seed: [
   *    0x19, 0x57, 0xc5, 0x20, 0x6d, 0x56, 0xb3, 0xf4,
   *    0x6e, 0xa1, 0x3c, 0x00, 0xb4, 0x6b, 0xcf, 0xa9,
   *  ],
   * });
   * const state = prng.state;
   * const prng2 = SeededRandom.fromState(state);
   *
   * assertEquals(prng2.state, state);
   * ```
   */
  static fromState(state: Readonly<SeededRandomState>): SeededRandom {
    // seed with empty bytes as we'll overwrite the state anyway
    const prng = new SeededRandom({ seed: new Uint8Array(16) });
    prng.state = state;

    return prng;
  }

  /**
   * The current state of the random number generator.
   * @returns The state as an object.
   *
   * @example Usage
   * ```ts
   * import { SeededRandom } from "@std/random";
   * import { assertEquals } from "@std/assert";
   *
   * const prng = new SeededRandom({
   *  seed: [
   *    0x19, 0x57, 0xc5, 0x20, 0x6d, 0x56, 0xb3, 0xf4,
   *    0x6e, 0xa1, 0x3c, 0x00, 0xb4, 0x6b, 0xcf, 0xa9,
   *  ],
   * });
   * assertEquals(prng.state, {
   *  algorithm: "pcg32",
   *  state: [0xe9, 0xf5, 0xb9, 0x5f, 0x96, 0x9f, 0x7b, 0xce],
   *  inc: [0xdd, 0x42, 0x78, 0x01, 0x68, 0xd7, 0x9f, 0x53],
   * });
   * ```
   */
  get state(): Readonly<SeededRandomState> {
    const u = new Uint8Array(8);
    const dv = new DataView(u.buffer);

    dv.setBigUint64(0, this.#state);
    const state = Array.from(u);

    dv.setBigUint64(0, this.#inc);
    const inc = Array.from(u);

    return {
      algorithm: "pcg32",
      state,
      inc,
    } as SeededRandomState;
  }

  set state(value: Readonly<SeededRandomState>) {
    const [state, inc] = getUint64s([...value.state, ...value.inc], 2);
    this.#state = state!;
    this.#inc = inc!;
  }

  // https://github.com/imneme/pcg-c-basic/blob/bc39cd76ac3d541e618606bcc6e1e5ba5e5e6aa3/pcg_basic.c#L42-L49
  #seed(seed: Uint8Array | (Byte[] & { length: 16 })): void {
    const [initState, initSeq] = getUint64s(seed, 2);

    this.#state = 0n;
    this.#inc = ((initSeq! << 1n) | 1n) % U64_CEIL;
    this.#randomUint32();
    this.#state += initState!;
    this.#randomUint32();
  }

  /**
   * Generates a random number using the current state of the prng.
   * @returns A random number between 0 and 1
   *
   * @example Usage
   * ```ts
   * import { SeededRandom } from "@std/random";
   * import { assertEquals } from "@std/assert";
   *
   * const prng = new SeededRandom({
   *  seed: [
   *    0x19, 0x57, 0xc5, 0x20, 0x6d, 0x56, 0xb3, 0xf4,
   *    0x6e, 0xa1, 0x3c, 0x00, 0xb4, 0x6b, 0xcf, 0xa9,
   *  ],
   * });
   *
   * assertEquals(prng.random(), 0.9590322358999401);
   * assertEquals(prng.random(), 0.3763687589671463);
   * assertEquals(prng.random(), 0.5337617760524154);
   * ```
   */
  random(): number {
    return uint32ToFloat64(this.#randomUint32());
  }

  /**
   * Generates a new seed from the current prng that can be used to create a new prng.
   * @returns The new seed
   *
   * @example Usage
   * ```ts no-assert
   * import { SeededRandom } from "@std/random";
   * import { assertEquals } from "@std/assert";
   *
   * const prng = new SeededRandom({
   *  seed: new Uint8Array([25, 87, 197, 32, 109, 86, 179, 244, 110, 161, 60, 0, 180, 107, 207, 169]),
   * });
   * assertEquals(
   *  prng.randomSeed(),
   *  new Uint8Array([245, 131, 34, 249, 96, 89, 179, 247, 136, 164, 156, 156, 42, 174, 157, 149]),
   * );
   * ```
   */
  randomSeed(): Uint8Array {
    const bytes = new Uint8Array(16);
    const dv = new DataView(bytes.buffer);

    for (let i = 0; i < 4; i++) {
      dv.setUint32(i * 4, this.#randomUint32());
    }

    return bytes;
  }

  // https://github.com/imneme/pcg-c-basic/blob/bc39cd76ac3d541e618606bcc6e1e5ba5e5e6aa3/pcg_basic.c#L60-L67
  #randomUint32(): number {
    const oldState = this.#state;

    this.#state = (this.#state * 6364136223846793005n + (this.#inc | 1n)) %
      U64_CEIL;

    const xorShifted = (((oldState >> 18n) ^ oldState) >> 27n) % U32_CEIL;
    const rot = (oldState >> 59n) % U32_CEIL;

    return Number(
      ((xorShifted >> rot) | (xorShifted << ((-rot) & 31n))) % U32_CEIL,
    );
  }
}

/** Convert a 32-bit unsigned integer to a float64 in the range [0, 1). */
function uint32ToFloat64(u32: number): number {
  return u32 / (2 ** 32);
}

/** Convert byte array to array of `n` uint64s, reading big-endian. */
function getUint64s(arr: Uint8Array | Byte[], n: number) {
  const dv = new DataView(Uint8Array.from(arr).buffer);
  if (dv.byteLength !== n * 8) {
    throw new Error(`Expected byte length ${n * 8}; got ${dv.byteLength}`);
  }
  return Array.from({ length: n }, (_, i) => dv.getBigUint64(i * 8));
}
