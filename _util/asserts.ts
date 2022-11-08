// Copyright 2018-2022 the Deno authors. All rights reserved. MIT license.
// This module is browser compatible.

import * as asserts from "../testing/asserts.ts";

export class DenoStdInternalError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "DenoStdInternalError";
  }
}

/** Make an assertion, if not `true`, then throw. */
export function assert(expr: unknown, msg = ""): asserts expr {
  try {
    asserts.assert(expr, msg);
  } catch (error) {
    throw new DenoStdInternalError(error as string);
  }
}

/**
 * Make an assertion that `actual` and `expected` are equal, deeply. If not
 * deeply equal, then throw.
 */
export function assertEquals<T>(actual: T, expected: T, msg?: string) {
  try {
    asserts.assertEquals(actual, expected, msg);
  } catch (error) {
    throw new DenoStdInternalError(error as string);
  }
}

/**
 * Make an assertion that actual includes expected. If not
 * then throw.
 */
export function assertStringIncludes(
  actual: string,
  expected: string,
  msg?: string,
) {
  try {
    asserts.assertStringIncludes(actual, expected, msg);
  } catch (error) {
    throw new DenoStdInternalError(error as string);
  }
}

/** Forcefully throws a failed assertion */
export function fail(msg?: string): never {
  try {
    asserts.fail(msg);
  } catch (error) {
    throw new DenoStdInternalError(error as string);
  }
}

/** Use this to assert unreachable code. */
export function unreachable(): never {
  try {
    asserts.unreachable();
  } catch (error) {
    throw new DenoStdInternalError(error as string);
  }
}
