// Copyright 2018-2024 the Deno authors. All rights reserved. MIT license.

import { assertEquals } from "../../assert/mod.ts";
import { describe, it } from "../bdd.ts";

const onlyTests = describe.only("Only");

const anonTests = describe("Anon");

const suiteOnlyTests = describe({ name: "Suite", suite: onlyTests });

/**
 * Normal - this case already works properly without any change
 * Fixed - this case has been fixed in this PR
 * Bugged - this case still doesn't run after the fix
 */

describe(onlyTests, "describe 1.1", () => {
  /**
   * Should run
   * Fixed
   */
  it("it 1.1", () => {
    assertEquals(0, 0);
  });
});

/**
 * Should run
 * Normal
 */
it(onlyTests, "it 4.1", () => {
  assertEquals(0, 0);
});

/**
 * Should run
 * Fixed
 */
it(suiteOnlyTests, "it 4.2", () => {
  assertEquals(0, 0);
});

/**
 * Should not run
 * Normal
 */
it(anonTests, "it 4.3", () => {
  assertEquals(0, 0);
});

/**
 * Should not run
 * Normal
 */
it("it 4.4", () => {
  assertEquals(0, 0);
});

describe("describe 1.2", () => {
  /**
   * Should run
   * Normal
   */
  it(onlyTests, "it 1.2.1", () => {
    assertEquals(0, 0);
  });
  /**
   * Should not run
   * Normal
   */
  it(anonTests, "it 1.2.2", () => {
    assertEquals(0, 0);
  });
  /**
   * Should run
   * Fixed
   */
  it(suiteOnlyTests, "it 1.2.3", () => {
    assertEquals(0, 0);
  });
  /**
   * Should not run
   * Normal
   */
  it("it 1.2.4", () => {
    assertEquals(0, 0);
  });
});

describe(onlyTests, "outer 2.1", () => {
  describe("inner 2.1", () => {
    /**
     * Should run
     * Bugged
     */
    it("it 2.1", () => {
      assertEquals(0, 0);
    });
  });
});

describe("outer 2.2", () => {
  describe(onlyTests, "inner 2.2.1", () => {
    /**
     * Should run
     * Fixed
     */
    it("it 2.2.1", () => {
      assertEquals(0, 0);
    });
  });
  describe("inner 2.2.2", () => {
    /**
     * Should not run
     * Normal
     */
    it("it 2.2.2", () => {
      assertEquals(0, 0);
    });
  });
});

describe("outer 2.3", () => {
  describe("inner 2.3", () => {
    /**
     * Should run
     * Normal
     */
    it(onlyTests, "it 2.3.1", () => {
      assertEquals(0, 0);
    });
    /**
     * Should not run
     * Normal
     */
    it("it 2.3.2", () => {
      assertEquals(0, 0);
    });
  });
});

describe(suiteOnlyTests, "describe 3.1", () => {
  /**
   * Should run
   * Fixed
   */
  it("it 3.1", () => {
    assertEquals(0, 0);
  });
});

describe("describe 3.2", () => {
  /**
   * Should run
   * Fixed
   */
  it(suiteOnlyTests, "it 3.2", () => {
    assertEquals(0, 0);
  });
});

describe("describe 6.1", () => {
  /**
   * Should not run
   * Normal
   */
  it(anonTests, "it 6.1", () => {
    assertEquals(0, 0);
  });
});

describe(anonTests, "describe 6.2", () => {
  /**
   * Should not run
   * Normal
   */
  it("it 6.2", () => {
    assertEquals(0, 0);
  });
});

describe(onlyTests, "describe 7.1", () => {
  /**
   * Should run
   * Bugged
   */
  it(anonTests, "it 7.1", () => {
    assertEquals(0, 0);
  });
});

describe(anonTests, "describe 7.2", () => {
  /**
   * Should run
   * Normal
   */
  it(onlyTests, "it 7.2", () => {
    assertEquals(0, 0);
  });
});

describe(suiteOnlyTests, "describe 8.1", () => {
  /**
   * Should run
   * Bugged
   */
  it(anonTests, "it 8.1", () => {
    assertEquals(0, 0);
  });
});

describe(anonTests, "describe 8.2", () => {
  /**
   * Should run
   * Fixed
   */
  it(suiteOnlyTests, "it 8.2", () => {
    assertEquals(0, 0);
  });
});
