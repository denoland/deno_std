// Copyright 2018-2026 the Deno authors. MIT license.
// This module is browser compatible.

const CHAR_0 = 0x30;
const CHAR_9 = 0x39;

/** Hex digit value of a char code, or -1 if it is not a hex digit. */
function hexValue(code: number): number {
  if (code >= CHAR_0 && code <= CHAR_9) return code - CHAR_0;
  if (code >= 0x61 && code <= 0x66) return code - 0x61 + 10; // a-f
  if (code >= 0x41 && code <= 0x46) return code - 0x41 + 10; // A-F
  return -1;
}

function isDigit(code: number): boolean {
  return code >= CHAR_0 && code <= CHAR_9;
}

/**
 * Parses a string as an IPv4 address.
 *
 * The accepted syntax is the URL standard's
 * {@link https://url.spec.whatwg.org/#valid-ipv4-address-string | valid IPv4-address string}:
 * four decimal octets separated by `.`, each written as the shortest possible
 * string of ASCII digits. Hexadecimal, octal and fewer-than-four-part forms are
 * rejected, as is surrounding whitespace.
 *
 * @experimental **UNSTABLE**: New API, yet to be vetted.
 *
 * @param addr IPv4 address in a string format (e.g., "192.168.0.1").
 * @returns The four address bytes, or `undefined` if the string is not a valid
 * IPv4 address.
 *
 * @example Parse an IPv4 address
 * ```ts
 * import { parseIPv4 } from "@std/net/unstable-ip"
 * import { assertEquals } from "@std/assert"
 *
 * assertEquals(parseIPv4("192.168.0.1"), new Uint8Array([192, 168, 0, 1]))
 * assertEquals(parseIPv4("0x7f.0.0.1"), undefined)
 * ```
 */
export function parseIPv4(addr: string): Uint8Array | undefined {
  const parts = addr.split(".");
  if (parts.length !== 4) return undefined;

  const bytes = new Uint8Array(4);
  for (let i = 0; i < 4; i++) {
    const part = parts[i]!;
    // "Shortest possible" rules out leading zeros, so each octet value has
    // exactly one spelling and `010` cannot be read as octal.
    if (part.length === 0 || part.length > 3) return undefined;
    if (part.length > 1 && part.charCodeAt(0) === CHAR_0) return undefined;

    let value = 0;
    for (let j = 0; j < part.length; j++) {
      const code = part.charCodeAt(j);
      if (!isDigit(code)) return undefined;
      value = value * 10 + (code - CHAR_0);
    }
    if (value > 255) return undefined;
    bytes[i] = value;
  }
  return bytes;
}

/**
 * Validates whether a given string is a valid IPv4 address.
 *
 * See {@linkcode parseIPv4} for the accepted syntax.
 *
 * @experimental **UNSTABLE**: New API, yet to be vetted.
 *
 * @param addr IPv4 address in a string format (e.g., "192.168.0.1").
 * @returns A boolean indicating if the string is a valid IPv4 address.
 *
 * @example Check if the address is a IPv4
 * ```ts
 * import { isIPv4 } from "@std/net/unstable-ip"
 * import { assert, assertFalse } from "@std/assert"
 *
 * const correctIp = "192.168.0.1"
 * const incorrectIp = "192.168.0.256"
 *
 * assert(isIPv4(correctIp))
 * assertFalse(isIPv4(incorrectIp))
 * ```
 */
export function isIPv4(addr: string): boolean {
  return parseIPv4(addr) !== undefined;
}

/**
 * Parses a string as an IPv6 address.
 *
 * Implements the URL standard's
 * {@link https://url.spec.whatwg.org/#concept-ipv6-parser | IPv6 parser}, which
 * covers `::` compression and the trailing `x:x:x:x:x:x:d.d.d.d` form. Zone
 * IDs (`fe80::1%eth0`) are intentionally omitted by that standard and are
 * rejected here too, unlike `node:net`'s `isIP()`.
 *
 * @experimental **UNSTABLE**: New API, yet to be vetted.
 *
 * @param addr IPv6 address in a string format (e.g., "2001:db8::1").
 * @returns The sixteen address bytes, or `undefined` if the string is not a
 * valid IPv6 address.
 *
 * @example Parse an IPv6 address
 * ```ts
 * import { parseIPv6 } from "@std/net/unstable-ip"
 * import { assertEquals } from "@std/assert"
 *
 * const loopback = new Uint8Array(16)
 * loopback[15] = 1
 *
 * assertEquals(parseIPv6("::1"), loopback)
 * assertEquals(parseIPv6("2001:db8:::1"), undefined)
 * ```
 */
export function parseIPv6(addr: string): Uint8Array | undefined {
  const pieces = new Uint16Array(8);
  let pieceIndex = 0;
  let compress = -1;
  let pointer = 0;

  if (addr.charCodeAt(pointer) === 0x3a) { // ":"
    if (addr.charCodeAt(pointer + 1) !== 0x3a) return undefined;
    pointer += 2;
    pieceIndex += 1;
    compress = pieceIndex;
  }

  while (pointer < addr.length) {
    if (pieceIndex === 8) return undefined;

    if (addr.charCodeAt(pointer) === 0x3a) {
      if (compress !== -1) return undefined;
      pointer += 1;
      pieceIndex += 1;
      compress = pieceIndex;
      continue;
    }

    let value = 0;
    let length = 0;
    while (length < 4) {
      const digit = hexValue(addr.charCodeAt(pointer));
      if (digit === -1) break;
      value = value * 0x10 + digit;
      pointer += 1;
      length += 1;
    }

    if (addr.charCodeAt(pointer) === 0x2e) { // "."
      if (length === 0) return undefined;
      // Rewind: what looked like a hextet is the first octet of an IPv4 tail.
      pointer -= length;
      if (pieceIndex > 6) return undefined;

      let numbersSeen = 0;
      while (pointer < addr.length) {
        let ipv4Piece = -1;
        if (numbersSeen > 0) {
          if (addr.charCodeAt(pointer) === 0x2e && numbersSeen < 4) {
            pointer += 1;
          } else return undefined;
        }
        if (!isDigit(addr.charCodeAt(pointer))) return undefined;
        while (isDigit(addr.charCodeAt(pointer))) {
          const number = addr.charCodeAt(pointer) - CHAR_0;
          if (ipv4Piece === -1) ipv4Piece = number;
          else if (ipv4Piece === 0) return undefined;
          else ipv4Piece = ipv4Piece * 10 + number;
          if (ipv4Piece > 255) return undefined;
          pointer += 1;
        }
        pieces[pieceIndex] = pieces[pieceIndex]! * 0x100 + ipv4Piece;
        numbersSeen += 1;
        if (numbersSeen === 2 || numbersSeen === 4) pieceIndex += 1;
      }
      if (numbersSeen !== 4) return undefined;
      break;
    } else if (addr.charCodeAt(pointer) === 0x3a) {
      pointer += 1;
      if (pointer >= addr.length) return undefined;
    } else if (pointer < addr.length) {
      return undefined;
    }

    pieces[pieceIndex] = value;
    pieceIndex += 1;
  }

  if (compress !== -1) {
    let swaps = pieceIndex - compress;
    pieceIndex = 7;
    while (pieceIndex !== 0 && swaps > 0) {
      const swapIndex = compress + swaps - 1;
      const tmp = pieces[pieceIndex]!;
      pieces[pieceIndex] = pieces[swapIndex]!;
      pieces[swapIndex] = tmp;
      pieceIndex -= 1;
      swaps -= 1;
    }
  } else if (pieceIndex !== 8) return undefined;

  const bytes = new Uint8Array(16);
  for (let i = 0; i < 8; i++) {
    bytes[i * 2] = pieces[i]! >>> 8;
    bytes[i * 2 + 1] = pieces[i]! & 0xff;
  }
  return bytes;
}

/**
 * Validates whether a given string is a IPv6 address.
 *
 * See {@linkcode parseIPv6} for the accepted syntax.
 *
 * @experimental **UNSTABLE**: New API, yet to be vetted.
 *
 * @param addr IPv6 address in a string format (e.g., "2001:db8::1").
 * @returns A boolean indicating if the string is a valid IPv6 address.
 *
 * @example Check if the address is a IPv6
 * ```ts
 * import { isIPv6 } from "@std/net/unstable-ip"
 * import { assert, assertFalse } from "@std/assert"
 *
 * const correctIp = "2001::db8:0:1"
 * const incorrectIp = "2001::db8::1"
 *
 * assert(isIPv6(correctIp))
 * assertFalse(isIPv6(incorrectIp))
 * ```
 */
export function isIPv6(addr: string): boolean {
  return parseIPv6(addr) !== undefined;
}

/**
 * Checks if an IP address matches a subnet or specific IP address.
 *
 * @experimental **UNSTABLE**: New API, yet to be vetted.
 *
 * @param addr The IP address to check (IPv4 or IPv6)
 * @param subnetOrIps The subnet in CIDR notation (e.g., "192.168.1.0/24") or a specific IP address
 * @returns true if the IP address matches the subnet or IP, false otherwise
 * @example Check if the address is a IPv6
 *
 * ```ts
 * import { matchSubnets } from "@std/net/unstable-ip"
 * import { assert, assertFalse } from "@std/assert"
 *
 * assert(matchSubnets("192.168.1.10", ["192.168.1.0/24"]));
 * assertFalse(matchSubnets("192.168.2.10", ["192.168.1.0/24"]));
 *
 * assert(matchSubnets("2001:db8::ffff", ["2001:db8::/64"]));
 * assertFalse(matchSubnets("2001:db9::1", ["2001:db8::/64"]));
 * ```
 */
export function matchSubnets(addr: string, subnetOrIps: string[]): boolean {
  const isV4 = isIPv4(addr);
  if (!isV4 && !isIPv6(addr)) return false;

  for (const subnetOrIp of subnetOrIps) {
    // Without a "/" the entry is a specific address, compared verbatim.
    if (!subnetOrIp.includes("/")) {
      if (addr === subnetOrIp) return true;
      continue;
    }
    const matched = isV4
      ? matchIPv4Subnet(addr, subnetOrIp)
      : matchIPv6Subnet(addr, subnetOrIp);
    if (matched) return true;
  }

  return false;
}

/**
 * Parses a CIDR prefix length: decimal digits only, within range. Unlike an
 * address octet, a zero-padded length has only one reading, so `/024` is
 * accepted.
 */
function parsePrefixLength(
  prefix: string,
  maxLength: number,
): number | undefined {
  if (prefix.length === 0) return undefined;

  let value = 0;
  for (let i = 0; i < prefix.length; i++) {
    const code = prefix.charCodeAt(i);
    if (!isDigit(code)) return undefined;
    value = value * 10 + (code - CHAR_0);
    if (value > maxLength) return undefined;
  }
  return value;
}

/** Splits `a.b.c.d/n` into its address and prefix length. */
function parseSubnet(
  subnet: string,
  parse: (addr: string) => Uint8Array | undefined,
  maxLength: number,
): [Uint8Array, number] | undefined {
  const slash = subnet.indexOf("/");
  if (slash === -1) return undefined;

  const bytes = parse(subnet.slice(0, slash));
  if (bytes === undefined) return undefined;

  const prefixLength = parsePrefixLength(subnet.slice(slash + 1), maxLength);
  if (prefixLength === undefined) return undefined;

  return [bytes, prefixLength];
}

/** Compares the leading `prefixLength` bits of two equal-length addresses. */
function matchPrefix(
  addr: Uint8Array,
  subnet: Uint8Array,
  prefixLength: number,
): boolean {
  const fullBytes = prefixLength >> 3;
  for (let i = 0; i < fullBytes; i++) {
    if (addr[i] !== subnet[i]) return false;
  }

  const remainingBits = prefixLength & 7;
  if (remainingBits === 0) return true;

  const mask = (0xff << (8 - remainingBits)) & 0xff;
  return (addr[fullBytes]! & mask) === (subnet[fullBytes]! & mask);
}

/**
 * Checks if an IPv4 address matches a subnet or specific IPv4 address.
 *
 * @experimental **UNSTABLE**: New API, yet to be vetted.
 *
 * @param addr The IP address to check (IPv4)
 * @param subnet The subnet in CIDR notation (e.g., "192.168.1.0/24") or a specific IP address
 * @returns true if the IP address matches the subnet or IP, false otherwise
 * @example Check if the address is a IPv6
 *
 * ```ts
 * import { matchIPv4Subnet } from "@std/net/unstable-ip"
 * import { assert, assertFalse } from "@std/assert"
 *
 * assert(matchIPv4Subnet("192.168.1.10", "192.168.1.0/24"));
 * assertFalse(matchIPv4Subnet("192.168.2.10", "192.168.1.0/24"));
 * ```
 */
export function matchIPv4Subnet(addr: string, subnet: string): boolean {
  const addrBytes = parseIPv4(addr);
  if (addrBytes === undefined) return false;

  const parsed = parseSubnet(subnet, parseIPv4, 32);
  if (parsed === undefined) return false;

  return matchPrefix(addrBytes, parsed[0], parsed[1]);
}

/**
 * Checks if an IPv6 address matches a subnet or specific IPv6 address.
 *
 * @experimental **UNSTABLE**: New API, yet to be vetted.
 *
 * @param addr The IP address to check (IPv6)
 * @param subnet The subnet in CIDR notation (e.g., "2001:db8::/64") or a specific IP address
 * @returns true if the IP address matches the subnet or IP, false otherwise
 * @example Check if the address is a IPv6
 *
 * ```ts
 * import { matchIPv6Subnet } from "@std/net/unstable-ip"
 * import { assert, assertFalse } from "@std/assert"
 *
 * assert(matchIPv6Subnet("2001:db8::ffff", "2001:db8::/64"));
 * assertFalse(matchIPv6Subnet("2001:db9::1", "2001:db8::/64"));
 * ```
 */
export function matchIPv6Subnet(addr: string, subnet: string): boolean {
  const addrBytes = parseIPv6(addr);
  if (addrBytes === undefined) return false;

  const parsed = parseSubnet(subnet, parseIPv6, 128);
  if (parsed === undefined) return false;

  return matchPrefix(addrBytes, parsed[0], parsed[1]);
}
