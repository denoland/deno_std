// Copyright 2018-2024 the Deno authors. All rights reserved. MIT license.
// This module is browser compatible.

import { capitalizeWord, splitToWords } from "./_util.ts";

/**
 * Converts a string into camelCase.
 *
 * @example Usage
 * ```ts
 * import { toCamelCase } from "@std/text/case";
 * import { assertEquals } from "@std/assert/assert-equals";
 *
 * assertEquals(toCamelCase("deno is awesome"),"denoIsAwesome");
 * ```
 *
 * @param input The string that is going to be converted into camelCase
 * @returns The string as camelCase
 */
export function toCamelCase(input: string): string {
  input = input.trim();
  const [first = "", ...rest] = splitToWords(input);
  return [first.toLocaleLowerCase(), ...rest.map(capitalizeWord)].join("");
}

/**
 * Converts a string into kebab-case.
 *
 * @example Usage
 * ```ts
 * import { toKebabCase } from "@std/text/case";
 * import { assertEquals } from "@std/assert/assert-equals";
 *
 * assertEquals(toKebabCase("deno is awesome"), "deno-is-awesome");
 * ```
 *
 * @param input The string that is going to be converted into kebab-case
 * @returns The string as kebab-case
 */
export function toKebabCase(input: string): string {
  input = input.trim();
  return splitToWords(input).join("-").toLocaleLowerCase();
}

/**
 * Converts a string into PascalCase.
 *
 * @example Usage
 * ```ts
 * import { toPascalCase } from "@std/text/case";
 * import { assertEquals } from "@std/assert/assert-equals";
 *
 * assertEquals(toPascalCase("deno is awesome"), "DenoIsAwesome");
 * ```
 *
 * @param input The string that is going to be converted into PascalCase
 * @returns The string as PascalCase
 */
export function toPascalCase(input: string): string {
  input = input.trim();
  return splitToWords(input).map(capitalizeWord).join("");
}

/**
 * Converts a string into CONSTANT_CASE (also known as SCREAMING_SNAKE_CASE).
 *
 * @example Usage
 * ```ts
 * import { toConstantCase } from "@std/text/case";
 * import { assertEquals } from "@std/assert/assert-equals";
 *
 * assertEquals(toConstantCase("deno is awesome"), "DENO_IS_AWESOME");
 * ```
 *
 * @param input The string that is going to be converted into CONSTANT_CASE
 * @returns The string as CONSTANT_CASE
 */
export function toConstantCase(input: string): string {
  input = input.trim();
  return splitToWords(input).join("_").toLocaleUpperCase();
}

/**
 * Converts a string into snake_case.
 *
 * @example Usage
 * ```ts
 * import { toSnakeCase } from "@std/text/case";
 * import { assertEquals } from "@std/assert/assert-equals";
 *
 * assertEquals(toSnakeCase("deno is awesome"), "deno_is_awesome");
 * ```
 *
 * @param input The string that is going to be converted into snake_case
 * @returns The string as snake_case
 */
export function toSnakeCase(input: string): string {
  input = input.trim();
  return splitToWords(input).join("_").toLocaleLowerCase();
}
