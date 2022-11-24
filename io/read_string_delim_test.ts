// Copyright 2018-2022 the Deno authors. All rights reserved. MIT license.

import { StringReader } from "./string_reader.ts";
import { readStringDelim } from "./read_string_delim.ts";
import { assertEquals } from "../testing/asserts.ts";

Deno.test("[io] readStringDelim basic", async () => {
  const delim = "!#$%&()=~";
  const exp = [
    "",
    "a",
    "bc",
    "def",
    "",
    "!",
    "!#",
    "!#$%&()=",
    "#$%&()=~",
    "",
    "",
  ];
  const str = exp.join(delim);
  const arr: string[] = [];
  for await (const v of readStringDelim(new StringReader(str), delim)) {
    arr.push(v);
  }
  assertEquals(arr, exp);
});

Deno.test("[io] readStringDelim bigger delim than buf size", async () => {
  // 0123456789...
  const delim = Array.from({ length: 1025 }).map((_, i) => i % 10).join("");
  const exp = ["", "a", "bc", "def", "01", "012345678", "123456789", "", ""];
  const str = exp.join(delim);
  const arr: string[] = [];
  for await (const v of readStringDelim(new StringReader(str), delim)) {
    arr.push(v);
  }
  assertEquals(arr, exp);
});

Deno.test("[io] readStringDelim delim=1213", async () => {
  const delim = "1213";
  const exp = ["", "a", "bc", "def", "01", "012345678", "123456789", "", ""];
  const str = exp.join(delim);
  const arr: string[] = [];
  for await (const v of readStringDelim(new StringReader(str), "1213")) {
    arr.push(v);
  }
  assertEquals(arr, exp);
});
