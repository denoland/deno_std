// Copyright 2018-2026 the Deno authors. MIT license.

import { CborTag } from "./tag.ts";
import type { CborType } from "./types.ts";

function calcBytes(x: bigint): number {
  let bytes = 0;
  while (x > 0n) {
    ++bytes;
    x >>= 8n;
  }
  return bytes;
}

function calcHeaderSize(x: number | bigint): number {
  if (x < 24) return 1;
  if (x < 2 ** 8) return 2;
  if (x < 2 ** 16) return 3;
  if (x < 2 ** 32) return 5;
  return 9;
}

export function calcEncodingSize(x: CborType): number {
  if (x == undefined || typeof x === "boolean") return 1;
  if (typeof x === "number") {
    return x % 1 === 0 ? calcHeaderSize(x < 0 ? -x - 1 : x) : 9;
  }
  if (typeof x === "bigint") {
    if (x < 0n) x = -x - 1n;
    if (x < 2n ** 64n) return calcHeaderSize(x);
    const bytes = calcBytes(x);
    return 1 + calcHeaderSize(bytes) + bytes;
  }
  if (typeof x === "string") {
    return calcHeaderSize(x.length * 3) + x.length * 3;
  }
  if (x instanceof Uint8Array) {
    return calcHeaderSize(x.length) + x.length;
  }
  if (x instanceof Date) return 1 + calcEncodingSize(x.getTime() / 1000);
  if (x instanceof CborTag) {
    return calcHeaderSize(x.tagNumber) + calcEncodingSize(x.tagContent);
  }
  if (x instanceof Array) {
    let size = calcHeaderSize(x.length);
    for (const y of x) size += calcEncodingSize(y);
    return size;
  }
  if (x instanceof Map) {
    let size = 3 + calcHeaderSize(x.size);
    for (const y of x) size += calcEncodingSize(y[0]) + calcEncodingSize(y[1]);
    return size;
  }
  // Must iterate the same keys as encodeObject().
  const keys = Object.keys(x);
  let size = 0;
  for (const y of keys) {
    // Keys are encoded via TextEncoder like string values, so they can take
    // up to 3 UTF-8 bytes per UTF-16 code unit. Allocate against that
    // upper bound, the same way the string-value branch does.
    size += calcHeaderSize(y.length * 3) + y.length * 3 +
      calcEncodingSize(x[y]);
  }
  return size + calcHeaderSize(keys.length);
}

export function encode(
  input: CborType,
  output: Uint8Array,
  offset: number,
): number {
  switch (typeof input) {
    case "undefined":
      output[offset++] = 0b111_10111;
      break;
    case "boolean":
      output[offset++] = input ? 0b111_10101 : 0b111_10100;
      break;
    case "number":
      return encodeNumber(input, output, offset);
    case "bigint":
      return encodeBigInt(input, output, offset);
    case "string":
      return encodeString(input, output, offset);
    default:
      if (input === null) output[offset++] = 0b111_10110;
      else if (input instanceof Uint8Array) {
        return encodeUint8Array(input, output, offset);
      } else if (input instanceof Date) {
        return encodeDate(input, output, offset);
      } else if (input instanceof CborTag) {
        return encodeTag(input, output, offset);
      } else if (input instanceof Map) return encodeMap(input, output, offset);
      else if (input instanceof Array) {
        return encodeArray(input, output, offset);
      } else return encodeObject(input, output, offset);
  }
  return offset;
}

function encodeHeader(
  majorType: number,
  input: number | bigint,
  output: Uint8Array,
  offset: number,
): number {
  if (input < 24) output[offset++] = majorType + Number(input);
  else if (input < 2 ** 8) {
    output[offset++] = majorType + 0b000_11000;
    output[offset++] = Number(input);
  } else {
    const view = new DataView(output.buffer);
    if (input < 2 ** 16) {
      output[offset++] = majorType + 0b000_11001;
      view.setUint16(offset, Number(input));
      offset += 2;
    } else if (input < 2 ** 32) {
      output[offset++] = majorType + 0b000_11010;
      view.setUint32(offset, Number(input));
      offset += 4;
    } else {
      output[offset++] = majorType + 0b000_11011;
      view.setBigUint64(offset, BigInt(input));
      offset += 8;
    }
  }
  return offset;
}

function encodeNumber(
  input: number,
  output: Uint8Array,
  offset: number,
): number {
  if (input % 1 === 0) {
    const isNegative = input < 0;
    if (isNegative && input <= -(2 ** 64)) {
      throw new RangeError(
        `Cannot encode number: It (${input}) exceeds -(2 ** 64) - 1`,
      );
    } else if (input >= 2 ** 64) {
      throw new RangeError(
        `Cannot encode number: It (${input}) exceeds 2 ** 64 - 1`,
      );
    }
    return encodeHeader(
      isNegative ? 0b001_00000 : 0b000_00000,
      isNegative ? -input - 1 : input,
      output,
      offset,
    );
  }
  const view = new DataView(output.buffer);
  output[offset++] = 0b111_11011;
  view.setFloat64(offset, input);
  return offset + 8;
}

function encodeBigInt(
  input: bigint,
  output: Uint8Array,
  offset: number,
): number {
  const isNegative = input < 0n;
  if (isNegative) input = -input - 1n;
  if (input >= 2n ** 64n) {
    output[offset++] = isNegative ? 0b110_00011 : 0b110_00010;
    const bytes = calcBytes(input);
    offset = encodeHeader(0b010_00000, bytes, output, offset);
    for (let i = bytes - 1; i >= 0; --i) {
      output[offset + i] = Number(input & 0xFFn);
      input >>= 8n;
    }
    return offset + bytes;
  }
  return encodeHeader(
    isNegative ? 0b001_00000 : 0b000_00000,
    input,
    output,
    offset,
  );
}

function encodeUint8Array(
  input: Uint8Array,
  output: Uint8Array,
  offset: number,
): number {
  offset = encodeHeader(0b010_00000, input.length, output, offset);
  output.set(input, offset);
  return offset + input.length;
}

function encodeString(
  input: string,
  output: Uint8Array,
  offset: number,
): number {
  const length = new TextEncoder()
    .encodeInto(input, output.subarray(offset)).written;
  output.set(
    output.subarray(offset, offset + length),
    offset + calcHeaderSize(length),
  );
  return encodeHeader(0b011_00000, length, output, offset) + length;
}

function encodeArray(
  input: CborType[],
  output: Uint8Array,
  offset: number,
): number {
  offset = encodeHeader(0b100_00000, input.length, output, offset);
  for (const value of input) offset = encode(value, output, offset);
  return offset;
}

function encodeObject(
  input: { [k: string]: CborType },
  output: Uint8Array,
  offset: number,
): number {
  output[offset] = 0b101_00000;
  // Must iterate the same keys as calcEncodingSize().
  const keys = Object.keys(input);
  offset = encodeHeader(0b101_00000, keys.length, output, offset);
  for (const key of keys) {
    offset = encodeString(key, output, offset);
    offset = encode(input[key], output, offset);
  }
  return offset;
}

function encodeDate(input: Date, output: Uint8Array, offset: number): number {
  output[offset++] = 0b110_00001;
  return encodeNumber(input.getTime() / 1000, output, offset);
}

function encodeTag(
  input: CborTag<CborType>,
  output: Uint8Array,
  offset: number,
): number {
  const tagNumber = BigInt(input.tagNumber);
  if (tagNumber < 0n) {
    throw new RangeError(
      `Cannot encode Tag Item: Tag Number (${input.tagNumber}) is less than zero`,
    );
  }
  if (tagNumber >= 2n ** 64n) {
    throw new RangeError(
      `Cannot encode Tag Item: Tag Number (${input.tagNumber}) exceeds 2 ** 64 - 1`,
    );
  }
  offset = encodeHeader(0b110_00000, tagNumber, output, offset);
  return encode(
    input.tagContent,
    output,
    offset,
  );
}

function encodeMap(
  input: Map<CborType, CborType>,
  output: Uint8Array,
  offset: number,
): number {
  // Tag Number 259 = [217, 1, 3]
  output[offset++] = 217;
  output[offset++] = 1;
  output[offset++] = 3;
  offset = encodeHeader(0b101_00000, input.size, output, offset);
  for (const pair of input) {
    offset = encode(pair[0], output, offset);
    offset = encode(pair[1], output, offset);
  }
  return offset;
}
