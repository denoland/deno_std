// Copyright 2018-2026 the Deno authors. MIT license.
import { assertEquals } from "@std/assert/equals";
import { assertThrows } from "@std/assert/throws";
import { truncate } from "./truncate.ts";

Deno.test("truncate() returns empty string when maxLength is zero", () => {
  assertEquals(truncate("hello", 0), "");
});

Deno.test("truncate() returns string unchanged when within maxLength", () => {
  assertEquals(truncate("hello", 10), "hello");
  assertEquals(truncate("hello", 5), "hello");
});

Deno.test("truncate() returns empty string unchanged", () => {
  assertEquals(truncate("", 5), "");
  assertEquals(truncate("", 0), "");
});

Deno.test("truncate() truncates at end by default", () => {
  const result = truncate("Hello, world!", 8);
  assertEquals(result, "Hello, \u2026");
  assertEquals(result.length, 8);
});

Deno.test("truncate() truncates at end with custom suffix", () => {
  assertEquals(
    truncate("Hello, world!", 10, { suffix: "\u2192" }),
    "Hello, wo\u2192",
  );
});

Deno.test("truncate() truncates at end with empty suffix", () => {
  assertEquals(truncate("Hello, world!", 5, { suffix: "" }), "Hello");
});

Deno.test("truncate() truncates at end with multi-character suffix", () => {
  const result = truncate("Hello, world!", 10, { suffix: "..." });
  assertEquals(result, "Hello, ...");
  assertEquals(result.length, 10);
});

Deno.test("truncate() returns sliced suffix when maxLength <= suffix length", () => {
  assertEquals(truncate("Hello, world!", 1), "\u2026");
  assertEquals(truncate("Hello, world!", 1, { suffix: "..." }), ".");
  assertEquals(truncate("Hello, world!", 2, { suffix: "..." }), "..");
});

Deno.test("truncate() truncates at start", () => {
  const result = truncate("abcdefghij", 6, { position: "start" });
  assertEquals(result, "\u2026fghij");
  assertEquals(result.length, 6);
});

Deno.test("truncate() truncates in middle with odd budget", () => {
  // budget = 5, leftLen = 2, rightLen = 3
  const result = truncate("abcdefghij", 6, { position: "middle" });
  assertEquals(result, "ab\u2026hij");
  assertEquals(result.length, 6);
});

Deno.test("truncate() truncates in middle with even budget", () => {
  // budget = 6, leftLen = 3, rightLen = 3
  const result = truncate("abcdefghij", 7, { position: "middle" });
  assertEquals(result, "abc\u2026hij");
  assertEquals(result.length, 7);
});

Deno.test("truncate() middle truncation with budget of 1 keeps only right side", () => {
  // budget = 1, leftLen = 0, rightLen = 1
  const result = truncate("hello world", 2, { position: "middle" });
  assertEquals(result, "\u2026d");
  assertEquals(result.length, 2);
});

Deno.test("truncate() does not split surrogate pairs at end", () => {
  // "A🦕B" = A(1) + 🦕(2 surrogates) + B(1) = 4 code units
  // budget = 2 lands on low surrogate; adjustSplitBack backs up → "A…"
  const result = truncate("A\uD83E\uDD95B", 3);
  assertEquals(result, "A\u2026");
  assertEquals(result.length, 2);
});

Deno.test("truncate() does not split surrogate pairs at start", () => {
  // slice start lands on low surrogate; adjustSplitForward advances → "…B"
  const result = truncate("A\uD83E\uDD95B", 3, { position: "start" });
  assertEquals(result, "\u2026B");
  assertEquals(result.length, 2);
});

Deno.test("truncate() does not split surrogate pairs in middle", () => {
  // "A🦕🦕B" = 6 code units, maxLength=5, budget=4, leftLen=2, rightLen=2
  // left slice(0,2) lands on low surrogate → backs up to 1 → "A"
  // right slice(4) lands on low surrogate → advances to 5 → "B"
  const result = truncate("A\uD83E\uDD95\uD83E\uDD95B", 5, {
    position: "middle",
  });
  assertEquals(result, "A\u2026B");
  assertEquals(result.length, 3);
});

Deno.test("truncate() does not produce orphan surrogates when slicing suffix", () => {
  // 🦕 is 2 code units; slicing to 1 would orphan → adjustSplitBack backs up to 0
  assertEquals(truncate("hello", 1, { suffix: "\uD83E\uDD95" }), "");
  // 🦕🎉 = 4 code units; maxLength=2 slices to 2 → keeps first pair
  assertEquals(
    truncate("hello", 2, { suffix: "\uD83E\uDD95\uD83C\uDF89" }),
    "\uD83E\uDD95",
  );
});

Deno.test("truncate() throws RangeError for non-integer maxLength", () => {
  assertThrows(() => truncate("hello", NaN), RangeError);
  assertThrows(() => truncate("hello", Infinity), RangeError);
  assertThrows(() => truncate("hello", -Infinity), RangeError);
  assertThrows(() => truncate("hello", 3.7), RangeError);
});

Deno.test("truncate() throws RangeError for negative maxLength", () => {
  assertThrows(() => truncate("hello", -1), RangeError);
  assertThrows(() => truncate("hello", -5), RangeError);
});

Deno.test("truncate() throws TypeError for invalid position", () => {
  assertThrows(
    () =>
      truncate("hello", 3, {
        position: "top" as "end",
      }),
    TypeError,
  );
});
