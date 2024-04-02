// Copyright 2018-2024 the Deno authors. All rights reserved. MIT license.

import { expect } from "./expect.ts";

Deno.test("expect.stringContaining() with strings", () => {
  expect("https://deno.com/").toEqual(expect.stringContaining("deno"));
  expect("function").toEqual(expect.stringContaining("func"));

  expect("Hello, World").not.toEqual(expect.stringContaining("hello"));
  expect("foobar").not.toEqual(expect.stringContaining("bazz"));
});

Deno.test("expect.stringContaining() with other types", () => {
  expect(123).not.toEqual(expect.stringContaining("1"));
  expect(true).not.toEqual(expect.stringContaining("true"));
  expect(["foo", "bar"]).not.toEqual(expect.stringContaining("foo"));
  expect({ foo: "bar" }).not.toEqual(expect.stringContaining(`{ foo: "bar" }`));
});
