import { assertEquals, assertExists } from "@std/assert";
import { decodeBase32Hex, encodeBase32Hex } from "./base32hex.ts";
import { decodeHex, encodeHex } from "./mod.ts";

// Test cases copied from https://github.com/LinusU/base32-encode/blob/master/test.js
// Copyright (c) 2016-2017 Linus Unnebäck. MIT license.
// Copyright 2018-2024 the Deno authors. All rights reserved. MIT license.
import { assertThrows } from "@std/assert/assert-throws";

const testCases = [
  ["73", "EC======"],
  ["f80c", "V060===="],
  ["6450", "CH80===="],
  ["cc91d0", "PI8T0==="],
  ["6c60c0", "DHGC0==="],
  ["4f6a23", "9TL26==="],
  ["88b44f18", "H2Q4U60="],
  ["90bad04714", "I2TD0HOK"],
  ["e9ef1def8086", "T7NHRRS0GO======"],
  ["83fe3f9c1e9302", "GFV3V70UIC10===="],
  ["15aa1f7cafc17cb8", "2ML1UV5FO5UBG==="],
  ["da51d4fed48b4c32dc", "R98T9VMKHD635N0="],
  ["c4be14228512d7299831", "OIV188K52BBIJ61H"],
  ["2f273c5b5ef04724fab944", "5SJJOMQUU13I9ULP8G======"],
  ["969da1b80ec2442d2bdd4bdb", "IQEQ3E0EO922QAUT9FDG===="],
  ["31f5adb50792f549d3714f3f99", "67QQRD87IBQKJKRH9SVPI==="],
  ["6a654f7a072c29951930700c0a61", "D9IKUUG75GKPA69GE060KO8="],
  ["0fe29d6825ad999e87d9b7cac3589d", "1VH9QQ15LMCPT1UPMV5C6M4T"],
  ["0f960ab44e165973a5172ccd294b3412", "1UB0LD2E2PCN798N5J6IIIPK28======"],
  ["325b9fd847a41fb0d485c207a1a5b02dcf", "69DPVM27KGFR1L45O83Q39DG5N7G===="],
  ["ddf80ebe21bf1b1e12a64c5cc6a74b5d92dd", "RNS0TFH1NSDHS4L69HECD9QBBM9DQ==="],
  [
    "c0cae52c6f641ce04a7ee5b9a8fa8ded121bca",
    "O35EAB3FCGEE0IJUSMSQHUKDTK91NIG=",
  ],
  [
    "872840a355c8c70586f462c9e669ee760cb3537e",
    "GSK418QLP33GB1NKCB4UCQFEEO6B6KRU",
  ],
  [
    "5773fe22662818a120c5688824c935fe018208a496",
    "ATPVS8J650CA2865D2429I9LVO0O4254IO======",
  ],
  [
    "416e23abc524d1b85736e2bea6cfecd5192789034a28",
    "85N27AU54J8RGLPMSAVADJVCQKCIF28398K0====",
  ],
  [
    "83d2386ebdd7e8e818ec00e3ccd882aa933b905b7e2e44",
    "GF93GRLTQVKEG67C03HSPM42LA9JN42RFON48===",
  ],
  [
    "a2fa8b881f3b8024f52745763c4ae08ea12bdf8bef1a72f8",
    "KBT8N20V7E029T978LR3OIN0HQGINNSBTSD75U0=",
  ],
  [
    "b074ae8b9efde0f17f37bccadde006d039997b59c8efb05add",
    "M1QAT2SUVNGF2VPNNJ5DRO06Q0SPIUQPP3NR0MMT",
  ],
  [
    "764fef941aee7e416dc204ae5ab9c5b9ce644567798e6849aea9",
    "EP7UV50QTPV42RE20IN5LEE5N7768HB7F676GIDEL4======",
  ],
  [
    "4995d9811f37f59797d7c3b9b9e5325aa78277415f70f4accf588c",
    "96ATJ08V6VQPF5UNOESRJP9IBAJO4TQ1BTOF9B6FB260====",
  ],
  [
    "24f0812ca8eed58374c11a7008f0b262698b72fd2792709208eaacb2",
    "4JO82B58TRAO6T6139O0HS5IC9KOMSNT4U9714G8TAMB4===",
  ],
  [
    "d70692543810d4bf50d81cf44a55801a557a388a341367c7ea077ca306",
    "QS394L1O23ABUK6O3JQ4KLC039ANKE4A6G9MFHVA0TUA61G=",
  ],
  [
    "6e08a89ca36b677ff8fe99e68a1241c8d8cef2570a5f60b6417d2538b30c",
    "DO4AH753DDJNVU7UJ7J8K4I1P3CCTSIN19FM1DI1FKIJHCOC",
  ],
  [
    "f2fc2319bd29457ccd01e8e194ee9bd7e97298b6610df4ab0f3d5baa0b2d7ccf69829edb74edef",
    "UBU266DT552NPJ81T3GP9RKRQVKN565MC46V9AOF7LDQK2PDFJ7MJ0KURDQERRO=",
  ],
] as const;

Deno.test({
  name: "encodeBase32Hex()",
  fn() {
    for (const [bin, b32] of testCases) {
      assertEquals(encodeBase32Hex(decodeHex(bin)), b32);
    }
  },
});

Deno.test({
  name: "decodeBase32Hex()",
  fn() {
    for (const [bin, b32] of testCases) {
      assertEquals(encodeHex(decodeBase32Hex(b32)), bin);
    }
  },
});

Deno.test({
  name: "decodeBase32Hex() throws on bad length",
  fn() {
    assertThrows(
      () => decodeBase32Hex("OOOO=="),
      Error,
      "Invalid string. Length must be a multiple of 8",
    );
  },
});

Deno.test({
  name: "decodeBase32Hex() throws on bad padding",
  fn() {
    assertThrows(
      () => decodeBase32Hex("5HXR334AQYAAAA=="),
      Error,
      "Invalid pad length",
    );
  },
});

Deno.test({
  name: "encodeBase32Hex() encodes very long text",
  fn() {
    const data = "a".repeat(16400);
    assertExists(encodeBase32Hex(data));
  },
});
