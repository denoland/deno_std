// Copyright 2018-2026 the Deno authors. MIT license.

import {
  isIPv4,
  isIPv6,
  matchIPv4Subnet,
  matchIPv6Subnet,
  matchSubnets,
  parseIPv4,
  parseIPv6,
} from "./unstable_ip.ts";
import { assertEquals } from "@std/assert";

/** Builds the 16 bytes of an IPv6 address from its eight hextets. */
function bytes(...hextets: number[]): Uint8Array {
  const out = new Uint8Array(16);
  for (const [i, hextet] of hextets.entries()) {
    out[i * 2] = hextet >>> 8;
    out[i * 2 + 1] = hextet & 0xff;
  }
  return out;
}

Deno.test("parseIPv4() returns the address bytes", () => {
  const list: [string, number[]][] = [
    ["192.148.122.255", [192, 148, 122, 255]],
    ["0.128.11.33", [0, 128, 11, 33]],
    ["0.0.0.0", [0, 0, 0, 0]],
    ["255.255.255.255", [255, 255, 255, 255]],
  ];

  for (const [addr, expected] of list) {
    assertEquals(parseIPv4(addr), new Uint8Array(expected));
  }
});

Deno.test("parseIPv4() returns undefined for invalid addresses", () => {
  const list = [
    // Out of range.
    "192.148.122.256",
    "192.168.0.-40",
    // Wrong number of parts.
    "0.128.11",
    "17823366190",
    "192.168.1.2.3",
    "1.2.3.",
    "1..2.3",
    "",
    // Not decimal digits.
    "1a.1a.1.1",
    "a.b.c.d",
    "0x7f.0.0.1",
    "1e2.1.1.1",
    "+1.2.3.4",
    // Leading zeros: `010` must not be read as octal.
    "01.002.3.4",
    "010.0.0.1",
    // Surrounding whitespace.
    " 1.2.3.4",
    "1.2.3.4 ",
  ];

  for (const addr of list) {
    assertEquals(parseIPv4(addr), undefined, addr);
  }
});

Deno.test("isIPv4()", () => {
  const list = [
    { addr: "192.148.122.255", expected: true },
    { addr: "0.128.11.33", expected: true },
    { addr: "0.0.0.0", expected: true },

    { addr: "192.148.122.256", expected: false },
    { addr: "0.128.11", expected: false },
    { addr: "17823366190", expected: false },
    { addr: "192.168.0.-40", expected: false },
    { addr: "1a.1a.1.1", expected: false },
    { addr: "a.b.c.d", expected: false },
    { addr: "192.168.1.2.3", expected: false },
    { addr: " 1.2.3.4", expected: false },
    { addr: "1.2.3.4 ", expected: false },
    { addr: "01.002.3.4", expected: false },
    { addr: "0x7f.0.0.1", expected: false },
    { addr: "1e2.1.1.1", expected: false },
    { addr: "+1.2.3.4", expected: false },
    { addr: "1.2.3.", expected: false },
    { addr: "1..2.3", expected: false },
  ];

  for (const { addr, expected } of list) {
    assertEquals(isIPv4(addr), expected, addr);
  }
});

Deno.test("parseIPv6() returns the address bytes", () => {
  const list: [string, Uint8Array][] = [
    [
      "2001:db8:3333:4444:5555:6666:7777:8888",
      bytes(0x2001, 0x0db8, 0x3333, 0x4444, 0x5555, 0x6666, 0x7777, 0x8888),
    ],
    ["2001:db8::1", bytes(0x2001, 0x0db8, 0, 0, 0, 0, 0, 1)],
    ["2001::db8:0:1", bytes(0x2001, 0, 0, 0, 0, 0x0db8, 0, 1)],
    ["::", bytes()],
    ["::1", bytes(0, 0, 0, 0, 0, 0, 0, 1)],
    ["1::", bytes(1)],
    // "::" standing for a single zero group at either end. Rejected before
    // the parsers landed, because expansion keyed off a hextet count that a
    // trailing or leading "::" inflated to 9.
    ["1:2:3:4:5:6:7::", bytes(1, 2, 3, 4, 5, 6, 7, 0)],
    ["::1:2:3:4:5:6:7", bytes(0, 1, 2, 3, 4, 5, 6, 7)],
    // Uppercase hex is accepted, per the URL standard.
    ["2001:DB8::1", bytes(0x2001, 0x0db8, 0, 0, 0, 0, 0, 1)],
    // x:x:x:x:x:x:d.d.d.d, RFC 4291, section 2.2.
    [
      "2003:3333:4444:5555:6666:7777:192.168.0.1",
      bytes(0x2003, 0x3333, 0x4444, 0x5555, 0x6666, 0x7777, 0xc0a8, 0x0001),
    ],
    ["::192.168.0.1", bytes(0, 0, 0, 0, 0, 0, 0xc0a8, 0x0001)],
    ["::ffff:127.0.0.1", bytes(0, 0, 0, 0, 0, 0xffff, 0x7f00, 0x0001)],
  ];

  for (const [addr, expected] of list) {
    assertEquals(parseIPv6(addr), expected, addr);
  }
});

Deno.test("parseIPv6() returns undefined for invalid addresses", () => {
  const list = [
    // Not hex.
    "2001:db8:3333:4444:5555:6666:7777:gggg",
    "2001:db8::4444:0:-30:8888",
    // Too few or too many pieces.
    "2001:db8:3333:4444:5555:6666:7777",
    "1:2:3:4:5:6:7:8:9",
    "1:2:3:4:5:6:7::8",
    "",
    // Seven pieces already, so there is no room for the IPv4 tail's two.
    "1:2:3:4:5:6::1.2.3.4",
    // More than one "::".
    "2001:db8::4444::8888",
    "2001:db8:::1",
    // A lone leading or trailing ":".
    ":1",
    "1:",
    // A bare IPv4 address is not an IPv6 address.
    "192.128.0.1",
    // Embedded IPv4 must itself be a valid dotted quad.
    "2003:3333:4444:5555:6666:7777:192.168.0.256",
    "::ffff:1.2.3",
    "::ffff:0x1.2.3.4",
    "::ffff:01.2.3.4",
    "::1..2.3",
    "::1.2.3.",
    // Surrounding whitespace, in both positions.
    " ::1",
    "::1 ",
    // Zone IDs are intentionally omitted by the URL standard.
    "fe80::1%eth0",
  ];

  for (const addr of list) {
    assertEquals(parseIPv6(addr), undefined, addr);
  }
});

Deno.test("isIPv6()", () => {
  const list = [
    { addr: "2001:db8:3333:4444:5555:6666:7777:8888", expected: true },
    { addr: "2001:db8::1", expected: true },
    { addr: "2001::db8:0:1", expected: true },
    { addr: "::", expected: true },
    { addr: "::1", expected: true },
    { addr: "2003:3333:4444:5555:6666:7777:192.168.0.1", expected: true },
    { addr: "ab::cd:192.168.0.1", expected: true },
    { addr: "::192.168.0.1", expected: true },
    { addr: "1:2:3:4:5:6:7::", expected: true },
    { addr: "::1:2:3:4:5:6:7", expected: true },

    { addr: "2001:db8:3333:4444:5555:6666:7777:gggg", expected: false },
    { addr: "2003:3333:4444:5555:6666:7777:192.168.0.256", expected: false },
    { addr: "2001:db8:3333:4444:5555:6666:7777", expected: false },
    { addr: "2001:db8::4444::8888", expected: false },
    { addr: "2001:db8::4444:0:-30:8888", expected: false },
    { addr: "192.128.0.1", expected: false },
    { addr: ":1", expected: false },
    { addr: "2001:db8:::1", expected: false },
    { addr: " ::1", expected: false },
    { addr: "::1 ", expected: false },
    { addr: "::ffff:0x1.2.3.4", expected: false },
    { addr: "fe80::1%eth0", expected: false },
    { addr: "1:2:3:4:5:6:7::8", expected: false },
    { addr: "::ffff:1.2.3", expected: false },
    { addr: "1:2:3:4:5:6:7:8:9", expected: false },
  ];

  for (const { addr, expected } of list) {
    assertEquals(isIPv6(addr), expected, addr);
  }
});

Deno.test("matchSubnets()", () => {
  const mixed = [
    "192.168.1.0/24",
    "10.0.0.0/8",
    "2001:db8::/32",
    "172.16.0.100", // exact IP
  ];

  const list = [
    // Multiple and mixed subnets
    { addr: "192.168.1.50", subnets: mixed, expected: true },
    { addr: "10.5.5.5", subnets: mixed, expected: true },
    { addr: "172.16.0.100", subnets: mixed, expected: true },
    { addr: "172.16.0.101", subnets: mixed, expected: false },
    { addr: "8.8.8.8", subnets: mixed, expected: false },
    { addr: "2001:db8:1234::1", subnets: mixed, expected: true },
    { addr: "2001:db9::1", subnets: mixed, expected: false },

    // Invalid inputs
    { addr: "invalid-ip", subnets: ["192.168.1.0/24"], expected: false },
    { addr: "192.168.1.10", subnets: ["invalid-subnet"], expected: false },
    { addr: "192.168.1.10", subnets: ["192.168.1.0/33"], expected: false },
    { addr: "192.168.1.10", subnets: ["192.168.1.0/AA"], expected: false },
    { addr: "192.168.1.10", subnets: ["192.168.1.0/"], expected: false },
    { addr: "2001:db8::1", subnets: ["2001:db8::/129"], expected: false },
    { addr: "2001:db8::1", subnets: ["2001:db8::/"], expected: false },
    { addr: "192.168.1.10", subnets: [], expected: false },

    // Addresses the parsers now reject are not members of any subnet.
    { addr: " 192.168.1.10", subnets: mixed, expected: false },
    { addr: "010.0.0.1", subnets: mixed, expected: false },
    { addr: "0x7f.0.0.1", subnets: ["127.0.0.0/8"], expected: false },
    { addr: "2001:db8:::1", subnets: mixed, expected: false },
    { addr: "2001:db8::1%eth0", subnets: mixed, expected: false },

    // So are subnets whose base address the parsers reject.
    { addr: "192.168.1.10", subnets: ["192.168.01.0/24"], expected: false },
    { addr: "192.168.1.10", subnets: ["0x7f.0.0.0/8"], expected: false },
  ];

  for (const { addr, subnets, expected } of list) {
    assertEquals(matchSubnets(addr, subnets), expected, addr);
  }
});

Deno.test("matchIPv4Subnet()", () => {
  const list = [
    { addr: "192.168.1.10", subnet: "192.168.1.0/24", expected: true },
    { addr: "192.168.1.11", subnet: "/32", expected: false },
    { addr: "192.168.1", subnet: "192.168.1/32", expected: false },
    { addr: "192.168.1.1", subnet: "192.168.1.0/", expected: false },
    { addr: "192.168.1.1", subnet: "192.168.1.0/33", expected: false },
    { addr: "192.168.1.1", subnet: "192.168.1.0/0", expected: true },

    // No "/" means no prefix length, so nothing matches.
    { addr: "192.168.1.1", subnet: "192.168.1.1", expected: false },

    // Prefix lengths are decimal digits only. The address has to sit inside
    // the subnet under the length `parseInt()` used to produce, or the row
    // passes for the wrong reason: `/0x18` meant 0, `/1e1` meant 1, the rest
    // meant 24.
    { addr: "1.2.3.4", subnet: "192.168.1.0/0x18", expected: false },
    { addr: "192.168.1.1", subnet: "192.168.1.0/0x18", expected: false },
    { addr: "192.168.1.1", subnet: "192.168.1.0/1e1", expected: false },
    { addr: "192.168.1.1", subnet: "192.168.1.0/ 24", expected: false },
    { addr: "192.168.1.1", subnet: "192.168.1.0/+24", expected: false },
    { addr: "192.168.1.1", subnet: "192.168.1.0/24abc", expected: false },
    { addr: "192.168.1.1", subnet: "192.168.1.0/24/8", expected: false },

    // Zero-padded lengths keep working; unlike an octet they are unambiguous.
    { addr: "192.168.1.1", subnet: "192.168.1.0/024", expected: true },
    { addr: "192.168.1.1", subnet: "192.168.1.0/0024", expected: true },
    { addr: "192.168.2.1", subnet: "192.168.1.0/024", expected: false },
    { addr: "1.2.3.4", subnet: "192.168.1.0/00", expected: true },
    { addr: "192.168.1.1", subnet: "192.168.1.0/033", expected: false },

    // Bit-level boundaries.
    { addr: "192.168.1.255", subnet: "192.168.1.0/24", expected: true },
    { addr: "192.168.2.0", subnet: "192.168.1.0/24", expected: false },
    { addr: "192.168.1.127", subnet: "192.168.1.0/25", expected: true },
    { addr: "192.168.1.128", subnet: "192.168.1.0/25", expected: false },
    { addr: "192.168.1.1", subnet: "192.168.1.1/32", expected: true },
    { addr: "192.168.1.2", subnet: "192.168.1.1/32", expected: false },

    // An address the parser rejects is not in any subnet.
    { addr: "010.0.0.1", subnet: "10.0.0.0/8", expected: false },
    { addr: " 192.168.1.10", subnet: "192.168.1.0/24", expected: false },
  ];

  for (const { addr, subnet, expected } of list) {
    assertEquals(matchIPv4Subnet(addr, subnet), expected, `${addr} ${subnet}`);
  }
});

Deno.test("matchIPv6Subnet()", () => {
  const list = [
    // Basic functionality
    { addr: "2001:db8::1", subnet: "2001:db8::/64", expected: true },

    // Invalid prefix lengths
    { addr: "2001:db8::1", subnet: "2001:db8::/129", expected: false },
    { addr: "2001:db8::1", subnet: "/129", expected: false },
    { addr: "2001:db8::1", subnet: "2001:db8::/", expected: false },

    // Invalid address formats
    { addr: "2001:db8", subnet: "2001:db8::/64", expected: false },
    { addr: "2001:db8::1", subnet: "2001:db8", expected: false },

    // Malformed embedded IPv4 and other junk
    { addr: "2001:db8::192.168.1", subnet: "2001:db8::/64", expected: false },
    { addr: "gggg::1", subnet: "2001:db8::/64", expected: false },
    { addr: "invalid", subnet: "2001:db8::/64", expected: false },

    // Zero prefix (matches all)
    { addr: "2001:db8::1", subnet: "::/0", expected: true },

    // Remaining bits test
    { addr: "2001:db8::1", subnet: "2001:db8::/121", expected: true },

    // Additional coverage cases
    { addr: "2001:db8::", subnet: "2001:db8::/64", expected: true },
    { addr: "::", subnet: "::/128", expected: true },

    // Additional edge cases
    { addr: "2001:db8::1", subnet: "2001:db8::1/-1", expected: false },
    { addr: "2001:db8::1", subnet: "2001:db8::1/abc", expected: false },

    // Zero-padded lengths keep working.
    { addr: "2001:db8::1", subnet: "2001:db8::/064", expected: true },
    { addr: "2001:db9::1", subnet: "2001:db8::/064", expected: false },
    { addr: "2001:db8::1", subnet: "2001:db8::/0129", expected: false },

    // IPv6 with embedded IPv4
    {
      addr: "2001:db8::ffff:192.168.1.1.1",
      subnet: "2001:db8::/64",
      expected: false,
    },
    {
      addr: "2001:db8::ffff:192.168.1",
      subnet: "2001:db8::/64",
      expected: false,
    },
    {
      addr: "::ffff:192.168.1.1:",
      subnet: "::ffff:0.0.0.0/128",
      expected: false,
    },
    {
      addr: "::ffff:192.168.1.1",
      subnet: "::ffff:192.168.0.0/112",
      expected: true,
    },

    // Bit-level boundaries.
    { addr: "2001:db9::1", subnet: "2001:db8::/32", expected: false },
    { addr: "2001:db8:8000::", subnet: "2001:db8::/33", expected: false },
    { addr: "2001:db8:7fff::", subnet: "2001:db8::/33", expected: true },

    // Addresses the parser now rejects.
    { addr: "2001:db8:::1", subnet: "2001:db8::/32", expected: false },
    { addr: "2001:db8::1 ", subnet: "2001:db8::/32", expected: false },
    { addr: "fe80::1%eth0", subnet: "fe80::/10", expected: false },
  ];

  for (const { addr, subnet, expected } of list) {
    assertEquals(matchIPv6Subnet(addr, subnet), expected, `${addr} ${subnet}`);
  }
});
