// Copyright 2018-2024 the Deno authors. All rights reserved. MIT license.

import { assertEquals } from "@std/assert/assert-equals";
import {
  toCamelCase,
  toConstantCase,
  toKebabCase,
  toPascalCase,
  toSnakeCase,
} from "./case.ts";

Deno.test("toCamelCase() handles an empty string", () => {
  assertEquals(toCamelCase(""), "");
});

Deno.test("toCamelCase() converts a single word", () => {
  const input = "shruberry";
  const expected = "shruberry";
  assertEquals(toCamelCase(input), expected);
});

Deno.test("toCamelCase() converts a sentence", () => {
  const input = "she turned me into a newt";
  const expected = "sheTurnedMeIntoANewt";
  assertEquals(toCamelCase(input), expected);
});

Deno.test("toCamelCase() converts multiple delimiters", () => {
  const result = toCamelCase("I am up-to-date!");
  const expected = "iAmUpToDate";
  assertEquals(result, expected);
});

Deno.test("toCamelCase() trims whitespace", () => {
  const result = toCamelCase(" deno Is AWESOME ");
  const expected = "denoIsAwesome";
  assertEquals(result, expected);
});

Deno.test("toKebabCase() handles an empty string", () => {
  assertEquals(toKebabCase(""), "");
});

Deno.test("toKebabCase() converts a single word", () => {
  const input = "shruberry";
  const expected = "shruberry";
  assertEquals(toKebabCase(input), expected);
});

Deno.test("toKebabCase() converts a sentence", () => {
  const input = "she turned me into a newt";
  const expected = "she-turned-me-into-a-newt";
  assertEquals(toKebabCase(input), expected);
});

Deno.test("toKebabCase() converts multiple delimiters", () => {
  const result = toKebabCase("I am up-to-date!");
  const expected = "i-am-up-to-date";
  assertEquals(result, expected);
});

Deno.test("toKebabCase() trims whitespace", () => {
  const result = toKebabCase(" deno Is AWESOME ");
  const expected = "deno-is-awesome";
  assertEquals(result, expected);
});

Deno.test("toPascalCase() handles empty string", () => {
  assertEquals(toPascalCase(""), "");
});

Deno.test("toPascalCase() converts a single word", () => {
  const input = "shruberry";
  const expected = "Shruberry";
  assertEquals(toPascalCase(input), expected);
});

Deno.test("toPascalCase() converts a sentence", () => {
  const input = "she turned me into a newt";
  const expected = "SheTurnedMeIntoANewt";
  assertEquals(toPascalCase(input), expected);
});

Deno.test("toPascalCase() converts multiple delimiters", () => {
  const result = toPascalCase("I am up-to-date!");
  const expected = "IAmUpToDate";
  assertEquals(result, expected);
});

Deno.test("toPascalCase() trims whitespace", () => {
  const result = toPascalCase(" deno Is AWESOME ");
  const expected = "DenoIsAwesome";
  assertEquals(result, expected);
});

Deno.test("toSnakeCase() handles an empty string", () => {
  assertEquals(toSnakeCase(""), "");
});

Deno.test("toSnakeCase() converts a single word", () => {
  const input = "shruberry";
  const expected = "shruberry";
  assertEquals(toSnakeCase(input), expected);
});

Deno.test("toSnakeCase() converts a sentence", () => {
  const input = "she turned me into a newt";
  const expected = "she_turned_me_into_a_newt";
  assertEquals(toSnakeCase(input), expected);
});

Deno.test("toSnakeCase() converts multiple delimiters", () => {
  const result = toSnakeCase("I am up-to-date!");
  const expected = "i_am_up_to_date";
  assertEquals(result, expected);
});

Deno.test("toSnakeCase() trims whitespace", () => {
  const result = toSnakeCase(" deno Is AWESOME ");
  const expected = "deno_is_awesome";
  assertEquals(result, expected);
});

Deno.test("toConstantCase() converts a single word", () => {
  const input = "shruberry";
  const expected = "SHRUBERRY";
  assertEquals(toConstantCase(input), expected);
});

Deno.test("toConstantCase() converts a sentence", () => {
  const input = "she turned me into a newt";
  const expected = "SHE_TURNED_ME_INTO_A_NEWT";
  assertEquals(toConstantCase(input), expected);
});

Deno.test("toConstantCase() converts multiple delimiters", () => {
  const result = toConstantCase("I am up-to-date!");
  const expected = "I_AM_UP_TO_DATE";
  assertEquals(result, expected);
});

Deno.test("toConstantCase() trims whitespace", () => {
  const result = toConstantCase(" deno Is AWESOME ");
  const expected = "DENO_IS_AWESOME";
  assertEquals(result, expected);
});
