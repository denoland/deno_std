// Copyright 2018-2021 the Deno authors. All rights reserved. MIT license.
import { Selector } from "./types.ts";
/**
 * Applies the given transformer to all valuesin the given record and returns a new record containing the resulting keys
 * associated to the last value that produced them.
 *
 * Example:
 *
 * ```typescript
 * const usersById = {
 *     'a5ec': { name: 'Mischa' },
 *     'de4f': { name: 'Kim' },
 * }
 * const namesById = mapValues(usersById, it => it.name)
 *
 * console.assert(namesById === {
 *     'a5ec': 'Mischa',
 *     'de4f': 'Kim',
 * }
 * ```
 */
export function mapValues<T, O>(
  _record: Record<string, T>,
  _transformer: Selector<T, O>,
): Record<string, O> {
  throw new Error("unimplemented");
}
