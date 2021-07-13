// Copyright 2018-2021 the Deno authors. All rights reserved. MIT license.
import { diff, diffstr } from "./_diff.ts";
import { assertEquals } from "../testing/asserts.ts";

Deno.test({
  name: "empty",
  fn(): void {
    assertEquals(diff([], []), []);
  },
});

Deno.test({
  name: '"a" vs "b"',
  fn(): void {
    assertEquals(diff(["a"], ["b"]), [
      { type: "removed", value: "a" },
      { type: "added", value: "b" },
    ]);
  },
});

Deno.test({
  name: '"a" vs "a"',
  fn(): void {
    assertEquals(diff(["a"], ["a"]), [{ type: "common", value: "a" }]);
  },
});

Deno.test({
  name: '"a" vs ""',
  fn(): void {
    assertEquals(diff(["a"], []), [{ type: "removed", value: "a" }]);
  },
});

Deno.test({
  name: '"" vs "a"',
  fn(): void {
    assertEquals(diff([], ["a"]), [{ type: "added", value: "a" }]);
  },
});

Deno.test({
  name: '"a" vs "a, b"',
  fn(): void {
    assertEquals(diff(["a"], ["a", "b"]), [
      { type: "common", value: "a" },
      { type: "added", value: "b" },
    ]);
  },
});

Deno.test({
  name: '"strength" vs "string"',
  fn(): void {
    assertEquals(diff(Array.from("strength"), Array.from("string")), [
      { type: "common", value: "s" },
      { type: "common", value: "t" },
      { type: "common", value: "r" },
      { type: "removed", value: "e" },
      { type: "added", value: "i" },
      { type: "common", value: "n" },
      { type: "common", value: "g" },
      { type: "removed", value: "t" },
      { type: "removed", value: "h" },
    ]);
  },
});

Deno.test({
  name: '"strength" vs ""',
  fn(): void {
    assertEquals(diff(Array.from("strength"), Array.from("")), [
      { type: "removed", value: "s" },
      { type: "removed", value: "t" },
      { type: "removed", value: "r" },
      { type: "removed", value: "e" },
      { type: "removed", value: "n" },
      { type: "removed", value: "g" },
      { type: "removed", value: "t" },
      { type: "removed", value: "h" },
    ]);
  },
});

Deno.test({
  name: '"" vs "strength"',
  fn(): void {
    assertEquals(diff(Array.from(""), Array.from("strength")), [
      { type: "added", value: "s" },
      { type: "added", value: "t" },
      { type: "added", value: "r" },
      { type: "added", value: "e" },
      { type: "added", value: "n" },
      { type: "added", value: "g" },
      { type: "added", value: "t" },
      { type: "added", value: "h" },
    ]);
  },
});

Deno.test({
  name: '"abc", "c" vs "abc", "bcd", "c"',
  fn(): void {
    assertEquals(diff(["abc", "c"], ["abc", "bcd", "c"]), [
      { type: "common", value: "abc" },
      { type: "added", value: "bcd" },
      { type: "common", value: "c" },
    ]);
  },
});

Deno.test({
  name: '"a b c d" vs "a b x d e" (diffstr)',
  fn(): void {
    const diffResult = diffstr(
      [..."abcd"].join("\n"),
      [..."abxde"].join("\n"),
    );
    assertEquals(diffResult, [
      { type: "common", value: "a\n" },
      { type: "common", value: "b\n" },
      { type: "added", value: "x\n" },
      {
        type: "removed",
        value: "c\n",
        details: [{ type: "removed", value: "c" }, {
          type: "common",
          value: "\n",
        }],
      },
      { type: "common", value: "d\n" },
      {
        type: "added",
        value: "e\n",
        details: [
          {
            type: "added",
            value: "e",
          },
          {
            type: "common",
            value: "\n",
          },
        ],
      },
    ]);
  },
});

Deno.test({
  name: `"3.14" vs "2.71" (diffstr)`,
  fn(): void {
    const diffResult = diffstr("3.14", "2.71");
    assertEquals(diffResult, [
      {
        type: "removed",
        value: "3.14\n",
        details: [
          {
            type: "removed",
            value: "3",
          },
          {
            type: "common",
            value: ".",
          },
          {
            type: "removed",
            value: "14",
          },
          {
            type: "common",
            value: "\n",
          },
        ],
      },
      {
        type: "added",
        value: "2.71\n",
        details: [
          {
            type: "added",
            value: "2",
          },
          {
            type: "common",
            value: ".",
          },
          {
            type: "added",
            value: "71",
          },
          {
            type: "common",
            value: "\n",
          },
        ],
      },
    ]);
  },
});

Deno.test({
  name: `single line "a b" vs "c d" (diffstr)`,
  fn(): void {
    const diffResult = diffstr("a b", "c d");
    assertEquals(diffResult, [
      {
        type: "removed",
        value: "a b\n",
        details: [
          { type: "removed", value: "a" },
          { type: "removed", value: " " },
          { type: "removed", value: "b" },
          { type: "common", value: "\n" },
        ],
      },
      {
        type: "added",
        value: "c d\n",
        details: [
          { type: "added", value: "c" },
          { type: "added", value: "d" },
          { type: "common", value: "\n" },
        ],
      },
    ]);
  },
});
