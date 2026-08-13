// Copyright 2018-2026 the Deno authors. MIT license.

import { expect } from "./expect.ts";
import type { Async, Expected, MatcherContext, Tester } from "./_types.ts";
import { AssertionError, assertRejects, assertThrows } from "@std/assert";

declare module "./_types.ts" {
  interface Expected {
    toEqualBook: (expected: unknown) => ExtendMatchResult;
    toBeResolved: () => Promise<ExtendMatchResult>;
  }
}

class Author {
  name: string;

  constructor(name: string) {
    this.name = name;
  }
}

class Book {
  name: string;
  authors: Array<Author>;

  constructor(name: string, authors: Array<Author>) {
    this.name = name;
    this.authors = authors;
  }
}

function areAuthorsEqual(a: unknown, b: unknown) {
  const isAAuthor = a instanceof Author;
  const isBAuthor = b instanceof Author;

  if (isAAuthor && isBAuthor) {
    return a.name === b.name;
  } else if (isAAuthor === isBAuthor) {
    return undefined;
  } else {
    return false;
  }
}

const areBooksEqual: Tester = function (
  this: MatcherContext,
  a: unknown,
  b: unknown,
  customTesters: Tester[],
) {
  const isABook = a instanceof Book;
  const isBBook = b instanceof Book;

  if (isABook && isBBook) {
    return (a.name === b.name &&
      this.equal(a.authors, b.authors, { customTesters: customTesters }));
  } else if (isABook === isBBook) {
    return undefined;
  } else {
    return false;
  }
};

expect.addEqualityTesters([
  areAuthorsEqual,
  areBooksEqual,
]);

expect.extend({
  toEqualBook(context, expected) {
    const actual = context.value as Book;
    const result = context.equal(expected, actual, {
      customTesters: context.customTesters,
    });

    return {
      message: () =>
        `Expected Book object: ${expected.name}. Actual Book object: ${actual.name}`,
      pass: result,
    };
  },
  async toBeResolved(context) {
    if (!(context.value instanceof Promise)) {
      throw new TypeError("Expected value to be a promise");
    }
    const test = new Promise<void>((resolve) => setTimeout(resolve, 0));
    const status = await Promise.race([
      context.value.then(() => "resolved"),
      test.then(() => "pending"),
    ]);
    await test;
    return {
      message: () =>
        `Expected promise to be ${
          { pending: "resolved", resolved: "pending" }[status]
        } (got ${status})`,
      pass: status === "resolved",
    };
  },
});

Deno.test("expect.extend() api test case", () => {
  const book1a = new Book("Book 1", [
    new Author("Author 1"),
    new Author("Author 2"),
  ]);
  const book1b = new Book("Book 1", [
    new Author("Author 1"),
    new Author("Author 2"),
  ]);
  const book2 = new Book("Book 2", [
    new Author("Author 1"),
    new Author("Author 2"),
  ]);

  expect(book1a).toEqualBook(book1b);
  expect(book1a).not.toEqualBook(book2);
  expect(book1a).not.toEqualBook(1);
  expect(book1a).not.toEqualBook(null);

  assertThrows(
    () => expect(book1a).toEqualBook(book2),
    AssertionError,
    "Expected Book object: Book 2. Actual Book object: Book 1",
  );
  assertThrows(
    () => expect(book1a).not.toEqualBook(book1b),
    AssertionError,
    "Expected Book object: Book 1. Actual Book object: Book 1",
  );
});

Deno.test("expect.extend() example is valid", async () => {
  // Extends the `Expected` interface with your new matchers signatures
  interface ExtendedExpected<IsAsync = false> extends Expected<IsAsync> {
    // Matcher that asserts value is a dinosaur
    toBeDinosaur: (options?: { includeTrexs?: boolean }) => unknown;

    // NOTE: You also need to overrides the following typings to allow modifiers to correctly infer typing
    not: IsAsync extends true ? Async<ExtendedExpected<true>>
      : ExtendedExpected<false>;
    resolves: Async<ExtendedExpected<true>>;
    rejects: Async<ExtendedExpected<true>>;
  }

  // Call `expect.extend()` with your new matchers definitions
  expect.extend({
    toBeDinosaur(context, options) {
      const dino = `${context.value}`;
      const allowed = ["🦕"];
      if (options?.includeTrexs) {
        allowed.push("🦖");
      }
      const pass = allowed.includes(dino);
      if (context.isNot) {
        // Note: when `context.isNot` is set, the test is considered successful when `pass` is false
        return {
          message: () => `Expected "${dino}" to NOT be a dinosaur`,
          pass,
        };
      }
      return { message: () => `Expected "${dino}" to be a dinosaur`, pass };
    },
  });

  // Alias expect to avoid having to pass the generic typing argument each time
  // This is probably what you want to export and reuse across your tests
  const myexpect = expect<ExtendedExpected>;

  // Perform some tests
  myexpect("🦕").toBeDinosaur();
  myexpect("🦧").not.toBeDinosaur();
  await myexpect(Promise.resolve("🦕")).resolves.toBeDinosaur();
  await myexpect(Promise.resolve("🦧")).resolves.not.toBeDinosaur();

  // Regular matchers will still be available
  myexpect("foo").not.toBeNull();
  myexpect.anything;
});

Deno.test("expect.extend() api test case", async () => {
  const { promise, resolve } = Promise.withResolvers<void>();
  await expect(promise).not.toBeResolved();
  await assertRejects(
    () => expect(promise).toBeResolved(),
    AssertionError,
    "Expected promise to be resolved (got pending)",
  );
  resolve();
  await expect(promise).toBeResolved();
  await assertRejects(
    () => expect(promise).not.toBeResolved(),
    AssertionError,
    "Expected promise to be pending (got resolved)",
  );
});
