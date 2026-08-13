// Copyright 2018-2026 the Deno authors. MIT license.
// deno-lint-ignore-file no-explicit-any

export interface MatcherContext {
  value: unknown;
  isNot: boolean;
  equal: (a: unknown, b: unknown, options?: EqualOptions) => boolean;
  customTesters: Tester[];
  customMessage: string | undefined;
}

export type Matcher = (
  context: MatcherContext,
  ...args: any[]
) => MatchResult | ExtendMatchResult | Promise<ExtendMatchResult>;

export type Matchers = {
  [key: string]: Matcher;
};
export type MatchResult = void | Promise<void> | boolean;
export type ExtendMatchResult = {
  message: () => string;
  pass: boolean;
};

/** A constructor that accepts any args and returns any value */
export type AnyConstructor = new (...args: any[]) => any;

export type Tester = (a: any, b: any, customTesters: Tester[]) => void;

/** converts all the methods in an interface to be async functions */
export type Async<T> = {
  [K in keyof T]: T[K] extends (...args: any[]) => unknown
    ? (...args: Parameters<T[K]>) => Promise<ReturnType<T[K]>>
    : T[K];
};

/**
 * The Expected interface defines the available assertion methods.
 */
export interface Expected<IsAsync = false> {
  /**
   * Asserts that the function was called with the specified arguments.
   *
   * @example Usage
   * ```ts
   * import { expect, fn } from "@std/expect";
   *
   * const mock = fn();
   * mock("foo", 42);
   * mock("bar", 43)
   *
   * expect(mock).lastCalledWith("bar", 43);
   * expect(mock).not.lastCalledWith("foo", 42);
   * ```
   *
   * @param expected The expected arguments.
   */
  lastCalledWith(...expected: unknown[]): void;

  /**
   * Asserts that the function returned the specified value.
   *
   * @example Usage
   * ```ts
   * import { expect, fn } from "@std/expect";
   *
   * const mock = fn((str: string, num: number) => [str, num]);
   * mock("foo", 42);
   * mock("bar", 43);
   *
   * expect(mock).lastReturnedWith(["bar", 43]);
   * expect(mock).not.lastReturnedWith(["foo", 42]);
   *
   * @param expected The expected return value.
   */
  lastReturnedWith(expected: unknown): void;

  /**
   * Asserts that the function was called with the specified arguments at the specified call index.
   *
   * @example Usage
   * ```ts
   * import { expect, fn } from "@std/expect";
   *
   * const mock = fn();
   * mock("foo", 42);
   * mock("bar", 43);
   * mock("baz", 44);
   *
   * expect(mock).nthCalledWith(1, "foo", 42);
   * expect(mock).nthCalledWith(2, "bar", 43);
   * expect(mock).nthCalledWith(3, "baz", 44);
   * ```
   * @param nth The call index.
   * @param expected The expected arguments.
   */
  nthCalledWith(nth: number, ...expected: unknown[]): void;

  /**
   * Asserts that the function returned the specified value at the specified call index.
   *
   * @example Usage
   * ```ts
   * import { expect, fn } from "@std/expect";
   *
   * const mock = fn((str: string, num: number) => [str, num]);
   * mock("foo", 42);
   * mock("bar", 43);
   * mock("baz", 44);
   *
   * expect(mock).nthReturnedWith(1, ["foo", 42]);
   * expect(mock).nthReturnedWith(2, ["bar", 43]);
   * expect(mock).nthReturnedWith(3, ["baz", 44]);
   * ```
   *
   * @param nth The call index.
   * @param expected The expected return value.
   */
  nthReturnedWith(nth: number, expected: unknown): void;

  /**
   * Asserts that the function was called at least once.
   *
   * @example Usage
   * ```ts
   * import { expect, fn } from "@std/expect";
   *
   * const mock = fn();
   * const mock2 = fn();
   * mock();
   *
   * expect(mock).toBeCalled();
   * expect(mock2).not.toBeCalled();
   * ```
   */
  toBeCalled(): void;

  /**
   * Asserts that the function was called the specified number of times.
   *
   * @example Usage
   * ```ts
   * import { expect, fn } from "@std/expect";
   *
   * const mock = fn();
   * mock();
   * mock();
   *
   * expect(mock).not.toBeCalledTimes(1);
   * expect(mock).toBeCalledTimes(2);
   * expect(mock).not.toBeCalledTimes(3);
   * ```
   *
   * @param expected The expected number of times.
   */
  toBeCalledTimes(expected: number): void;

  /**
   * Asserts that the function was called with the specified arguments.
   *
   * @example Usage
   * ```ts
   * import { expect, fn } from "@std/expect";
   *
   * const mock = fn();
   * mock("foo", 42);
   * mock("bar", 43);
   *
   * expect(mock).toBeCalledWith("foo", 42);
   * expect(mock).toBeCalledWith("bar", 43);
   * expect(mock).not.toBeCalledWith("baz", 44);
   * ```
   *
   * @param expected The expected arguments.
   */
  toBeCalledWith(...expected: unknown[]): void;

  /**
   * Asserts that a given numerical value is approximately equal to an
   * expected number within a certain margin of error
   * (tolerance). Useful when comparing floating-point numbers, which
   * may be represented internally with precision errors.
   *
   * @example Usage
   * ```ts
   * import { expect } from "@std/expect";
   *
   * expect(0.2 + 0.1).toBeCloseTo(0.3);
   * expect(0.2 + 0.1).toBeCloseTo(0.3, 15);
   * expect(0.2 + 0.1).not.toBeCloseTo(0.3, 16);
   * ```
   *
   * @param candidate The candidate number.
   * @param tolerance The number of significant decimal digits to
   *   consider when comparing the values (optional, default 2).
   */
  toBeCloseTo(candidate: number, tolerance?: number): void;

  /**
   * Asserts that the value is defined.
   *
   * @example Usage
   * ```ts
   * import { expect } from "@std/expect";
   *
   * expect(null).toBeDefined();
   * expect(undefined).not.toBeDefined();
   * ```
   */
  toBeDefined(): void;

  /**
   * Asserts that the value is falsy.
   *
   * @example Usage
   * ```ts
   * import { expect } from "@std/expect";
   *
   * expect(null).toBeFalsy();
   * expect(undefined).toBeFalsy();
   * expect(0).toBeFalsy();
   * expect("").toBeFalsy();
   * expect(false).toBeFalsy();
   * expect(NaN).toBeFalsy();
   *
   * expect(1).not.toBeFalsy();
   * expect("foo").not.toBeFalsy();
   * expect([]).not.toBeFalsy();
   * ```
   */
  toBeFalsy(): void;

  /**
   * Asserts that the value is greater than the specified number.
   *
   * @example Usage
   * ```ts
   * import { expect } from "@std/expect";
   *
   * expect(2).toBeGreaterThan(1);
   * expect(2).not.toBeGreaterThan(2);
   * expect(2).not.toBeGreaterThan(3);
   * ```
   *
   * @param expected The expected number.
   */
  toBeGreaterThan(expected: number): void;

  /**
   * Asserts that the value is greater than or equal to the specified number.
   *
   * @example Usage
   * ```ts
   * import { expect } from "@std/expect";
   *
   * expect(2).toBeGreaterThanOrEqual(1);
   * expect(2).toBeGreaterThanOrEqual(2);
   * expect(2).not.toBeGreaterThanOrEqual(3);
   * ```
   *
   * @param expected The expected number.
   */
  toBeGreaterThanOrEqual(expected: number): void;

  /**
   * Asserts that the value is an instance of the specified constructor.
   *
   * @example Usage
   * ```ts
   * import { expect } from "@std/expect";
   *
   * expect(new Error()).toBeInstanceOf(Error);
   * expect(new Error()).not.toBeInstanceOf(TypeError);
   * ```
   *
   * @param expected The expected constructor.
   */
  toBeInstanceOf<T extends AnyConstructor>(expected: T): void;

  /**
   * Asserts that the value is less than the specified number.
   *
   * @example Usage
   * ```ts
   * import { expect } from "@std/expect";
   *
   * expect(1).toBeLessThan(2);
   * expect(1).not.toBeLessThan(1);
   * expect(1).not.toBeLessThan(0);
   * ```
   *
   * @param expected The expected number.
   */
  toBeLessThan(expected: number): void;

  /**
   * Asserts that the value is less than or equal to the specified number.
   *
   * @example Usage
   * ```ts
   * import { expect } from "@std/expect";
   *
   * expect(1).toBeLessThanOrEqual(2);
   * expect(1).toBeLessThanOrEqual(1);
   * expect(1).not.toBeLessThanOrEqual(0);
   * ```
   *
   * @param expected The expected number.
   */
  toBeLessThanOrEqual(expected: number): void;

  /**
   * Asserts that the value is NaN.
   *
   * @example Usage
   * ```ts
   * import { expect } from "@std/expect";
   *
   * expect(NaN).toBeNaN();
   * expect(1).not.toBeNaN();
   * expect(undefined).toBeNaN();
   * expect(null).not.toBeNaN();
   * ```
   */
  toBeNaN(): void;

  /**
   * Asserts that the value is null.
   *
   * @example Usage
   * ```ts
   * import { expect } from "@std/expect";
   *
   * expect(null).toBeNull();
   * expect(undefined).not.toBeNull();
   * ```
   */
  toBeNull(): void;

  /**
   * Asserts that the value is truthy.
   *
   * @example Usage
   * ```ts
   * import { expect } from "@std/expect";
   *
   * expect(1).toBeTruthy();
   * expect("foo").toBeTruthy();
   * expect([]).toBeTruthy();
   * expect({}).toBeTruthy();
   * expect(true).toBeTruthy();
   *
   * expect(0).not.toBeTruthy();
   * expect("").not.toBeTruthy();
   * expect(null).not.toBeTruthy();
   * expect(undefined).not.toBeTruthy();
   * expect(false).not.toBeTruthy();
   * expect(NaN).not.toBeTruthy();
   * ```
   */
  toBeTruthy(): void;

  /**
   * Asserts that the value is undefined.
   *
   * @example Usage
   * ```ts
   * import { expect } from "@std/expect";
   *
   * expect(undefined).toBeUndefined();
   * expect(null).not.toBeUndefined();
   * ```
   */
  toBeUndefined(): void;

  /**
   * Asserts that the value is equal to the specified value.
   * @param expected The expected value.
   *
   * @example Usage
   * ```ts
   * import { expect } from "@std/expect";
   *
   * expect(42).toBe(42);
   * expect("foo").toBe("foo");
   *
   * const obj = {};
   * expect(obj).toBe(obj);
   * expect(obj).not.toBe({});
   * ```
   */
  toBe(expected: unknown): void;

  /**
   * Asserts that the value contains the specified value (deep equality).
   *
   * @example Usage
   * ```ts
   * import { expect } from "@std/expect";
   *
   * expect([1, 2, 3]).toContainEqual(2);
   * expect([1, 2, 3]).not.toContainEqual(4);
   *
   * expect([{ foo: 42 }, { bar: 43 }]).toContainEqual({ bar: 43 });
   * expect([{ foo: 42 }, { bar: 43 }]).not.toContainEqual({ baz: 44 });
   * ```
   *
   * @param expected The expected value.
   */
  toContainEqual(expected: unknown): void;

  /**
   * Asserts that the value contains the specified value (shallow equality).
   *
   * @example Usage
   * ```ts
   * import { expect } from "@std/expect";
   *
   * expect([1, 2, 3]).toContain(2);
   * expect([1, 2, 3]).not.toContain(4);
   *
   * const item0 = { foo: 42 };
   * const item1 = { bar: 43 };
   * const items = [item0, item1];
   * expect(items).toContain(item1);
   * expect(items).not.toContain({ foo: 42 });
   * ```
   *
   * @param expected The expected value.
   */
  toContain(expected: unknown): void;

  /**
   * Asserts that the value is equal to the specified value (deep equality).
   *
   * @example Usage
   * ```ts
   * import { expect } from "@std/expect";
   *
   * expect(42).toEqual(42);
   * expect({ foo: 42 }).toEqual({ foo: 42 });
   * expect([1, 2, 3]).toEqual([1, 2, 3]);
   * ```
   *
   * @param expected The expected value.
   */
  toEqual(expected: unknown): void;

  /**
   * Asserts that the function was called the specified number of times.
   *
   * @example Usage
   * ```ts
   * import { expect, fn } from "@std/expect";
   *
   * const mock = fn();
   * mock();
   * mock();
   *
   * expect(mock).not.toHaveBeenCalledTimes(1);
   * expect(mock).toHaveBeenCalledTimes(2);
   * expect(mock).not.toHaveBeenCalledTimes(3);
   * ```
   * @param expected The expected number of times.
   */
  toHaveBeenCalledTimes(expected: number): void;

  /**
   * Asserts that the function was called with the specified arguments.
   *
   * @example Usage
   * ```ts
   * import { expect, fn } from "@std/expect";
   *
   * const mock = fn();
   * mock("foo", 42);
   * mock("bar", 43);
   *
   * expect(mock).toHaveBeenCalledWith("foo", 42);
   * expect(mock).toHaveBeenCalledWith("bar", 43);
   * expect(mock).not.toHaveBeenCalledWith("baz", 44);
   * ```
   * @param expected The expected arguments.
   */
  toHaveBeenCalledWith(...expected: unknown[]): void;

  /**
   * Asserts that the function was called at least once.
   *
   * @example Usage
   * ```ts
   * import { expect, fn } from "@std/expect";
   *
   * const mock = fn();
   * const mock2 = fn();
   *
   * mock();
   *
   * expect(mock).toHaveBeenCalled();
   * expect(mock2).not.toHaveBeenCalled();
   * ```
   */
  toHaveBeenCalled(): void;

  /**
   * Asserts that the function was last called with the specified arguments.
   *
   * @example Usage
   * ```ts
   * import { expect, fn } from "@std/expect";
   *
   * const mock = fn();
   * mock("foo", 42);
   * mock("bar", 43);
   *
   * expect(mock).toHaveBeenLastCalledWith("bar", 43);
   * expect(mock).not.toHaveBeenLastCalledWith("foo", 42);
   * ```
   *
   * @param expected The expected arguments.
   */
  toHaveBeenLastCalledWith(...expected: unknown[]): void;

  /**
   * Asserts that the function was called with the specified arguments at the specified call index.
   *
   * @example Usage
   * ```ts
   * import { expect, fn } from "@std/expect";
   *
   * const mock = fn();
   * mock("foo", 42);
   * mock("bar", 43);
   * mock("baz", 44);
   *
   * expect(mock).toHaveBeenNthCalledWith(1, "foo", 42);
   * expect(mock).toHaveBeenNthCalledWith(2, "bar", 43);
   * expect(mock).toHaveBeenNthCalledWith(3, "baz", 44);
   * ```
   *
   * @param nth The call index.
   * @param expected The expected arguments.
   */
  toHaveBeenNthCalledWith(nth: number, ...expected: unknown[]): void;

  /**
   * Asserts that the value has the specified length.
   *
   * @example Usage
   * ```ts
   * import { expect } from "@std/expect";
   *
   * expect([1, 2, 3]).toHaveLength(3);
   * expect("foo").toHaveLength(3);
   * expect([]).toHaveLength(0);
   * ```
   *
   * @param expected The expected length.
   */
  toHaveLength(expected: number): void;

  /**
   * Asserts that the function last returned the specified value.
   *
   * @example Usage
   * ```ts
   * import { expect, fn } from "@std/expect";
   *
   * const mock = fn((str: string, num: number) => [str, num]);
   * mock("foo", 42);
   * mock("bar", 43);
   *
   * expect(mock).toHaveLastReturnedWith(["bar", 43]);
   * expect(mock).not.toHaveLastReturnedWith(["foo", 42]);
   * ```
   *
   * @param expected The expected return value.
   */
  toHaveLastReturnedWith(expected: unknown): void;

  /**
   * Asserts that the function returned the specified value at the specified call index.
   *
   * @example Usage
   * ```ts
   * import { expect, fn } from "@std/expect";
   *
   * const mock = fn((str: string, num: number) => [str, num]);
   * mock("foo", 42);
   * mock("bar", 43);
   * mock("baz", 44);
   *
   * expect(mock).toHaveNthReturnedWith(1, ["foo", 42]);
   * expect(mock).toHaveNthReturnedWith(2, ["bar", 43]);
   * expect(mock).toHaveNthReturnedWith(3, ["baz", 44]);
   * ```
   *
   * @param nth The call index.
   * @param expected The expected return value.
   */
  toHaveNthReturnedWith(nth: number, expected: unknown): void;

  /**
   * Asserts that the value has the specified property with an optional value.
   *
   * @example Usage
   * ```ts
   * import { expect } from "@std/expect";
   *
   * expect({ foo: 42 }).toHaveProperty("foo");
   * expect({ foo: 42 }).toHaveProperty("foo", 42);
   * expect({ foo: 42 }).not.toHaveProperty("bar");
   * ```
   *
   * @param propName The property name or an array of property names.
   * @param value The expected value (optional).
   */
  toHaveProperty(propName: string | string[], value?: unknown): void;

  /**
   * Asserts that the function returned the specified number of times.
   *
   * @example Usage
   * ```ts
   * import { expect, fn } from "@std/expect";
   *
   * const mock = fn();
   * mock();
   * mock();
   *
   * expect(mock).toHaveReturnedTimes(2);
   * expect(mock).not.toHaveReturnedTimes(3);
   * ```
   *
   * @param expected The expected number of times.
   */
  toHaveReturnedTimes(expected: number): void;

  /**
   * Asserts that the function returned the specified value.
   *
   * @example Usage
   * ```ts
   * import { expect, fn } from "@std/expect";
   *
   * const mockFn = fn((x: number) => ({ foo: x + 1 }));
   *
   * mockFn(5);
   * mockFn(6);
   *
   * expect(mockFn).toHaveReturnedWith({ foo: 7 });
   * expect(mockFn).not.toHaveReturnedWith({ foo: 5 });
   * ```
   *
   * @param expected The expected return value.
   */
  toHaveReturnedWith(expected: unknown): void;

  /**
   * Asserts that the function returned.
   *
   * @example Usage
   * ```ts
   * import { expect, fn } from "@std/expect";
   *
   * const mock = fn();
   *
   * expect(mock).not.toHaveReturned();
   *
   * mock();
   *
   * expect(mock).toHaveReturned();
   * ```
   */
  toHaveReturned(): void;

  /**
   * Asserts that the value matches the specified regular expression.
   *
   * @example Usage
   * ```ts
   * import { expect } from "@std/expect";
   *
   * expect("foo").toMatch(/^foo$/);
   * expect("bar").not.toMatch(/^foo$/);
   * ```
   *
   * @param expected The expected regular expression.
   */
  toMatch(expected: RegExp): void;

  /**
   * Asserts that the value matches the specified object (deep equality).
   *
   * @example Usage
   * ```ts
   * import { expect } from "@std/expect";
   *
   * expect({ foo: 42 }).toMatchObject({ foo: 42 });
   * expect({ foo: 42 }).not.toMatchObject({ foo: 43 });
   * ```
   *
   * @param expected The expected object or array of objects.
   */
  toMatchObject(
    expected: Record<PropertyKey, unknown> | Record<PropertyKey, unknown>[],
  ): void;

  /**
   * Asserts that the value matches the most recent snapshot. If no snapshot
   * exists, one will be created when running in update mode (`-- --update`).
   *
   * Requires `expect.setState({ currentTestName: "..." })` to be called before use.
   * The test file path is auto-detected from the call stack.
   *
   * @example Usage
   * ```ts ignore
   * import { expect } from "@std/expect";
   *
   * Deno.test("snapshot test", () => {
   *   expect.setState({ currentTestName: "snapshot test", testPath: import.meta.url });
   *   expect({ foo: 42 }).toMatchSnapshot();
   * });
   * ```
   *
   * @param hint An optional hint string appended to the snapshot name.
   */
  toMatchSnapshot(hint?: string): void;
  /**
   * Asserts that the value matches the most recent snapshot, using property
   * matchers to handle dynamic values like timestamps or IDs.
   *
   * @example Usage
   * ```ts ignore
   * import { expect } from "@std/expect";
   *
   * Deno.test("snapshot with matchers", () => {
   *   expect.setState({ currentTestName: "snapshot with matchers", testPath: import.meta.url });
   *   expect({ id: 1, name: "Alice" }).toMatchSnapshot({
   *     id: expect.any(Number),
   *   });
   * });
   * ```
   *
   * @param propertyMatchers An object of asymmetric matchers for dynamic values.
   * @param hint An optional hint string appended to the snapshot name.
   */
  toMatchSnapshot(
    propertyMatchers: Record<string, unknown>,
    hint?: string,
  ): void;

  /**
   * Asserts that the value matches the inline snapshot string. If no snapshot
   * is provided or the value differs, the source file will be updated when
   * running in update mode (`-- --update`).
   *
   * @example Usage
   * ```ts
   * import { expect } from "@std/expect";
   *
   * Deno.test("inline snapshot", () => {
   *   expect({ foo: 42 }).toMatchInlineSnapshot(`
   * {
   *   foo: 42,
   * }
   * `);
   * });
   * ```
   *
   * @param inlineSnapshot The expected inline snapshot string.
   */
  toMatchInlineSnapshot(inlineSnapshot?: string): void;
  /**
   * Asserts that the value matches the inline snapshot string, using property
   * matchers to handle dynamic values like timestamps or IDs.
   *
   * @example Usage
   * ```ts ignore
   * import { expect } from "@std/expect";
   *
   * Deno.test("inline snapshot with matchers", () => {
   *   expect({ id: 1, name: "Alice" }).toMatchInlineSnapshot({
   *     id: expect.any(Number),
   *   }, `
   * {
   *   id: Any<Number>,
   *   name: "Alice",
   * }
   * `);
   * });
   * ```
   *
   * @param propertyMatchers An object of asymmetric matchers for dynamic values.
   * @param inlineSnapshot The expected inline snapshot string.
   */
  toMatchInlineSnapshot(
    propertyMatchers: Record<string, unknown>,
    inlineSnapshot?: string,
  ): void;

  /**
   * Asserts that the function returned.
   *
   * @example Usage
   * ```ts
   * import { expect, fn } from "@std/expect";
   *
   * const mock = fn();
   *
   * expect(mock).not.toReturn();
   *
   * mock();
   *
   * expect(mock).toReturn();
   */
  toReturn(): void;

  /**
   * Asserts that the function returns the specified number of times.
   *
   * @example Usage
   * ```ts
   * import { expect, fn } from "@std/expect";
   *
   * const mock = fn();
   * mock();
   * mock();
   *
   * expect(mock).not.toReturnTimes(1);
   * expect(mock).toReturnTimes(2);
   * expect(mock).not.toReturnTimes(3);
   * ```
   *
   * @param expected The expected number of times.
   */
  toReturnTimes(expected: number): void;

  // TODO(iuioiua): Add `.not.toReturnWith` to the documentation.
  /**
   * Asserts that the function returns the specified value.
   *
   * @example Usage
   * ```ts
   * import { expect, fn } from "@std/expect";
   *
   * const mock = fn(() => 42);
   *
   * // expect(mock).toReturnWith(42);
   * expect(mock).not.toReturnWith(43);
   * ```
   *
   * @param expected The expected return value.
   */
  toReturnWith(expected: unknown): void;

  /**
   * Asserts that the value is strictly equal to the specified value.
   *
   * @example Usage
   * ```ts
   * import { expect } from "@std/expect";
   *
   * expect(42).toStrictEqual(42);
   * expect("foo").toStrictEqual("foo");
   *
   * const obj = {};
   * expect(obj).toStrictEqual(obj);
   *
   * class LaCroix {
   *   flavor: string;
   *
   *   constructor(flavor: string) {
   *     this.flavor = flavor;
   *   }
   * }
   * expect(new LaCroix("lemon")).not.toStrictEqual({ flavor: "lemon" });
   * ```
   *
   * @param candidate The candidate value.
   */
  toStrictEqual(candidate: unknown): void;

  /**
   * Asserts that the function throws an error.
   *
   * @example Usage
   * ```ts
   * import { expect } from "@std/expect";
   *
   * const fn = () => { throw new TypeError("foo") };
   * const fn2 = () => {};
   *
   * expect(fn).toThrow();
   * expect(fn2).not.toThrow();
   *
   * expect(fn).toThrow(TypeError);
   * expect(fn).toThrow("foo");
   * expect(fn).toThrow(/foo/);
   *
   * expect(fn).not.toThrow(SyntaxError);
   * expect(fn).not.toThrow("bar");
   * expect(fn).not.toThrow(/bar/);
   * ```
   * @param expected The expected error message, regular expression, or error constructor.
   */
  toThrow<E extends Error = Error>(
    expected?: string | RegExp | E | (new (...args: any[]) => E),
  ): void;

  /**
   * The negation object that allows chaining negated assertions.
   */
  not: IsAsync extends true ? Async<Expected<true>> : Expected<false>;

  /**
   * The object that allows chaining assertions with async functions that are expected to resolve to a value.
   */
  resolves: Async<Expected<true>>;

  /**
   * The object that allows chaining assertions with async functions that are expected to throw an error.
   */
  rejects: Async<Expected<true>>;

  /**
   * Additional custom assertion methods can be added here.
   */
  [name: string]: unknown;
}

export type MatcherKey = keyof Omit<Expected, "not" | "resolves" | "rejects">;

export type EqualOptions = {
  customTesters?: Tester[];
  msg?: string;
  formatter?: (value: unknown) => string;
  strictCheck?: boolean;
};

export interface EqualOptionUtil extends MatcherContext {
  strictCheck?: boolean;
}

export interface Colors {
  comment: { close: string; open: string };
  content: { close: string; open: string };
  prop: { close: string; open: string };
  tag: { close: string; open: string };
  value: { close: string; open: string };
}
type Indent = (arg0: string) => string;
type Print = (arg0: unknown) => string;

export type Refs = Array<unknown>;

export type CompareKeys = ((a: string, b: string) => number) | null | undefined;

export interface Config {
  callToJSON: boolean;
  compareKeys: CompareKeys;
  colors: Colors;
  escapeRegex: boolean;
  escapeString: boolean;
  indent: string;
  maxDepth: number;
  maxWidth: number;
  min: boolean;
  printBasicPrototype: boolean;
  printFunctionName: boolean;
  spacingInner: string;
  spacingOuter: string;
}

export type Printer = (
  val: unknown,
  config: Config,
  indentation: string,
  depth: number,
  refs: Refs,
  hasCalledToJSON?: boolean,
) => string;

interface PluginOptions {
  edgeSpacing: string;
  min: boolean;
  spacing: string;
}

type Test = (arg0: any) => boolean;

export interface NewSnapshotPlugin {
  serialize: (
    val: any,
    config: Config,
    indentation: string,
    depth: number,
    refs: Refs,
    printer: Printer,
  ) => string;
  test: Test;
}

export interface OldSnapshotPlugin {
  print: (
    val: unknown,
    print: Print,
    indent: Indent,
    options: PluginOptions,
    colors: Colors,
  ) => string;
  test: Test;
}

export type SnapshotPlugin = NewSnapshotPlugin | OldSnapshotPlugin;
