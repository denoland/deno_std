// Copyright 2018-2024 the Deno authors. All rights reserved. MIT license.

import { assertEquals } from "../assert/assert_equals.ts";
import { assertThrows } from "../assert/assert_throws.ts";
import { parse } from "./parse.ts";

Deno.test("parse() handles options", async (t) => {
  await t.step("name", () => {
    const expected = { options: { foo: true }, arguments: {} };
    const actual = parse(["--foo"], { options: [{ name: "foo" }] });
    assertEquals(actual, expected);
  });
  await t.step("multiple names", () => {
    const expected = {
      options: { foo: true, bar: true },
      arguments: {},
    };
    const actual = parse(["--foo", "--bar"], {
      options: [
        { name: "foo" },
        { name: "bar" },
      ],
    });
    assertEquals(actual, expected);
  });
  await t.step("multiple same names", () => {
    const expected = { options: { foo: true }, arguments: {} };
    const actual = parse(["--foo", "--foo"], {
      options: [
        { name: "foo" },
      ],
    });
    assertEquals(actual, expected);
  });
  await t.step("alias", () => {
    const expected = { options: { foo: true }, arguments: {} };
    const actual = parse(["-f"], { options: [{ name: "foo", alias: "f" }] });
    assertEquals(actual, expected);
  });
  await t.step("multiple aliases", () => {
    const expected = {
      options: { foo: true, bar: true },
      arguments: {},
    };
    const actual = parse(["-f", "-b"], {
      options: [
        { name: "foo", alias: "f" },
        { name: "bar", alias: "b" },
      ],
    });
    assertEquals(actual, expected);
  });
  await t.step("multiple same aliases", () => {
    const expected = { options: { foo: true }, arguments: {} };
    const actual = parse(["-f", "-f"], {
      options: [
        { name: "foo", alias: "f" },
      ],
    });
    assertEquals(actual, expected);
  });
  await t.step("multiple combined aliases", () => {
    const expected = { options: { verbose: 3 }, arguments: {} };
    const actual = parse(["-vvv"], {
      options: [
        {
          name: "verbose",
          alias: "v",
          default: 0,
          fn: (value) => value += 1,
        },
      ],
    });
    assertEquals(actual, expected);
  });
  await t.step("multiple combined aliases with value", () => {
    const expected = { options: { verbose: 3 }, arguments: {} };
    const actual = parse(["-v", "3"], {
      options: [
        {
          name: "verbose",
          alias: "v",
          type: Number,
          default: 0,
          value: { name: "VALUE" },
        },
      ],
    });
    assertEquals(actual, expected);
  });
  await t.step("name and alias", () => {
    const expected = {
      options: { foo: true, bar: true },
      arguments: {},
    };
    const actual = parse(["--foo", "-b"], {
      options: [
        { name: "foo", alias: "f" },
        { name: "bar", alias: "b" },
      ],
    });
    assertEquals(actual, expected);
  });
  await t.step("name and same alias", () => {
    const expected = { options: { foo: true }, arguments: {} };
    const actual = parse(["--foo", "-f"], {
      options: [
        { name: "foo", alias: "f" },
      ],
    });
    assertEquals(actual, expected);
  });
  await t.step("default value", () => {
    const expected = { options: { foo: "foo" }, arguments: {} };
    const actual = parse(["--foo"], {
      options: [{ name: "foo", default: "foo" }],
    });
    assertEquals(actual, expected);
  });
  await t.step("mismatching type", () => {
    assertThrows(() => {
      parse(["--foo"], {
        options: [{
          name: "foo",
          type: (Boolean as unknown as StringConstructor),
          default: "foo",
        }],
      });
    });
  });
  await t.step("name with value property", () => {
    const expected = { options: { foo: "bar" }, arguments: {} };
    const actual = parse(["--foo", "bar"], {
      options: [{ name: "foo", value: { name: "VALUE" } }],
    });
    assertEquals(actual, expected);
  });
  await t.step("name without value property but present value", () => {
    assertThrows(() => {
      parse(["--foo=bar"], { options: [{ name: "foo" }] });
    });
  });
  await t.step("name with multiple values", () => {
    const expected = { options: { foo: ["bar", "baz"] }, arguments: {} };
    const actual = parse(["--foo", "bar", "baz"], {
      options: [{ name: "foo", value: { name: "VALUE", multiple: true } }],
    });
    assertEquals(actual, expected);
  });
  await t.step("alias with value", () => {
    const expected = { options: { foo: "bar" }, arguments: {} };
    const actual = parse(["-f", "bar"], {
      options: [{ name: "foo", alias: "f", value: { name: "VALUE" } }],
    });
    assertEquals(actual, expected);
  });
  await t.step("alias with multiple values", () => {
    const expected = { options: { foo: ["bar", "baz"] }, arguments: {} };
    const actual = parse(["-f", "bar", "baz"], {
      options: [{
        name: "foo",
        alias: "f",
        value: { name: "VALUE", multiple: true },
      }],
    });
    assertEquals(actual, expected);
  });
  await t.step("name with optional value", () => {
    const expected = { options: { foo: "bar" }, arguments: {} };
    const actual = parse(["--foo", "bar"], {
      options: [{
        name: "foo",
        value: { name: "VALUE", optional: true },
      }],
    });
    assertEquals(actual, expected);
  });
  await t.step("name with missing optional value", () => {
    const expected = { options: { foo: true }, arguments: {} };
    const actual = parse(["--foo"], {
      options: [{
        name: "foo",
        value: { name: "VALUE", optional: true },
      }],
    });
    assertEquals(actual, expected);
  });
  await t.step("name with equals optional value", () => {
    const expected = { options: { foo: "bar" }, arguments: {} };
    const actual = parse(["--foo=bar"], {
      options: [{
        name: "foo",
        value: { name: "VALUE", requireEquals: true, optional: true },
      }],
    });
    assertEquals(actual, expected);
  });
  await t.step("name with equals missing optional value", () => {
    const expected = { options: { foo: true }, arguments: {} };
    const actual = parse(["--foo"], {
      options: [{
        name: "foo",
        value: { name: "VALUE", requireEquals: true, optional: true },
      }],
    });
    assertEquals(actual, expected);
  });
  await t.step("throws on missing value with requireEquals", () => {
    assertThrows(() => {
      parse(["--foo=bar"], {
        options: [
          { name: "foo" },
        ],
      });
    });
  });
  await t.step("throws on missing equals with requireEquals", () => {
    assertThrows(() => {
      parse(["--foo", "value"], {
        options: [{
          name: "foo",
          value: { name: "VALUE", requireEquals: true },
        }],
      });
    });
  });
  await t.step("throws on missing value", () => {
    assertThrows(() => {
      parse(["--foo", "bar"], {
        options: [
          { name: "foo" },
        ],
      });
    });
  });
  await t.step("overrides on multiple values", () => {
    const expected = { options: { foo: "baz" }, arguments: {} };
    const actual = parse(["--foo=bar", "--foo", "baz"], {
      options: [
        { name: "foo", value: { name: "VALUE" } },
      ],
    });
    assertEquals(actual, expected);
  });
  await t.step("negatable", () => {
    const expected = { options: { foo: false }, arguments: {} };
    const actual = parse(["--no-foo"], {
      options: [{ name: "foo", negatable: true }],
    });
    assertEquals(actual, expected);
  });
  await t.step("name with equals value", () => {
    const expected = { options: { foo: "bar" }, arguments: {} };
    const actual = parse(["--foo=bar"], {
      options: [{ name: "foo", value: { name: "VALUE" } }],
    });
    assertEquals(actual, expected);
  });
  await t.step("alias with equals value", () => {
    const expected = { options: { foo: "bar" }, arguments: {} };
    const actual = parse(["-f=bar"], {
      options: [{ name: "foo", alias: "f", value: { name: "VALUE" } }],
    });
    assertEquals(actual, expected);
  });
  await t.step("name with equals value with requireEquals", () => {
    const expected = { options: { foo: "bar" }, arguments: {} };
    const actual = parse(["--foo=bar"], {
      options: [{ name: "foo", value: { name: "VALUE", requireEquals: true } }],
    });
    assertEquals(actual, expected);
  });
  await t.step("fn() is called for name option", () => {
    const expected = { options: { foo: "changed" }, arguments: {} };
    const actual = parse(["--foo=bar"], {
      options: [
        {
          name: "foo",
          value: { name: "VALUE" },
          fn: () => "changed",
        },
      ],
    });
    assertEquals(actual, expected);
  });
  await t.step("fn() is called for alias option", () => {
    const expected = { options: { foo: "changed" }, arguments: {} };
    const actual = parse(["-f=bar"], {
      options: [
        {
          name: "foo",
          alias: "f",
          type: String,
          value: { name: "VALUE" },
          fn: () => "changed",
        },
      ],
    });
    assertEquals(actual, expected);
  });

  await t.step("string type value", () => {
    const expected = { options: { foo: "1" }, arguments: {} };
    const actual = parse(["--foo=1"], {
      options: [
        { name: "foo", type: String, value: { name: "VALUE" } },
      ],
    });
    assertEquals(actual, expected);
  });
  await t.step("throws on type string with non-string default value", () => {
    assertThrows(() => {
      parse(["--foo"], {
        options: [
          { name: "foo", type: String, default: true as unknown as string },
        ],
      });
    });
  });

  await t.step("number type value", () => {
    const expected = { options: { foo: 1 }, arguments: {} };
    const actual = parse(["--foo=1"], {
      options: [
        { name: "foo", type: Number, value: { name: "VALUE" } },
      ],
    });
    assertEquals(actual, expected);
  });
  await t.step("throws on type number with non-number value", () => {
    assertThrows(() => {
      parse(["--foo=bar"], {
        options: [
          { name: "foo", type: Number, value: { name: "VALUE" } },
        ],
      });
    });
  });
  await t.step("throws on type number with non-number default value", () => {
    assertThrows(() => {
      parse(["--foo"], {
        options: [
          { name: "foo", type: Number, default: "fail" as unknown as number },
        ],
      });
    });
  });

  await t.step("boolean type value", () => {
    const expected = { options: { foo: true }, arguments: {} };
    const actual = parse(["--foo=true"], {
      options: [
        { name: "foo", type: Boolean, value: { name: "VALUE" } },
      ],
    });
    assertEquals(actual, expected);
  });
  await t.step("throws on type boolean with non-boolean value", () => {
    assertThrows(() => {
      parse(["--foo=bar"], {
        options: [
          { name: "foo", type: Boolean, value: { name: "VALUE" } },
        ],
      });
    });
  });
  await t.step("throws on type boolean with non-boolean default value", () => {
    assertThrows(() => {
      parse(["--foo"], {
        options: [
          { name: "foo", type: Boolean, default: "fail" as unknown as boolean },
        ],
      });
    });
  });

  await t.step("strip single quoted value", () => {
    const expected = { options: { foo: "bar" }, arguments: {} };
    const actual = parse(["--foo", "'bar'"], {
      options: [
        { name: "foo", value: { name: "VALUE" } },
      ],
    });
    assertEquals(actual, expected);
  });
  await t.step("do not strip single quotes in value", () => {
    const expected = { options: { foo: "bar'" }, arguments: {} };
    const actual = parse(["--foo", "bar'"], {
      options: [
        { name: "foo", value: { name: "VALUE" } },
      ],
    });
    assertEquals(actual, expected);
  });
  await t.step("strip double quoted value", () => {
    const expected = { options: { foo: "bar" }, arguments: {} };
    const actual = parse(["--foo", '"bar"'], {
      options: [
        { name: "foo", value: { name: "VALUE" } },
      ],
    });
    assertEquals(actual, expected);
  });
  await t.step("do not strip double quotes in value", () => {
    const expected = { options: { foo: '"bar' }, arguments: {} };
    const actual = parse(["--foo", '"bar'], {
      options: [
        { name: "foo", value: { name: "VALUE" } },
      ],
    });
    assertEquals(actual, expected);
  });
});

Deno.test("parse() handles arguments", async (t) => {
  await t.step("argument", () => {
    const expected = { options: {}, arguments: { VALUE: "foo" } };
    const result = parse(["foo"], {
      arguments: [
        { name: "VALUE" },
      ],
    });
    assertEquals(result, expected);
  });
  await t.step("argument before option", () => {
    const expected = { options: { bar: true }, arguments: { VALUE: "foo" } };
    const result = parse(["foo", "--bar"], {
      options: [
        { name: "bar" },
      ],
      arguments: [
        { name: "VALUE" },
      ],
    });
    assertEquals(result, expected);
  });
  await t.step("argument after option", () => {
    const expected = { options: { foo: true }, arguments: { VALUE: "bar" } };
    const result = parse(["--foo", "bar"], {
      options: [
        { name: "foo" },
      ],
      arguments: [
        { name: "VALUE" },
      ],
    });
    assertEquals(result, expected);
  });
  await t.step("argument between options", () => {
    const expected = {
      options: { bar: true, baz: true },
      arguments: { VALUE: "foo" },
    };
    const result = parse(["--bar", "foo", "--baz"], {
      options: [
        { name: "bar" },
        { name: "baz" },
      ],
      arguments: [
        { name: "VALUE" },
      ],
    });
    assertEquals(result, expected);
  });
  await t.step("argument after option with value", () => {
    const expected = {
      options: { foo: "bar" },
      arguments: { VALUE: "baz" },
    };
    const result = parse(["--foo", "bar", "baz"], {
      options: [
        { name: "foo", value: { name: "VALUE" } },
      ],
      arguments: [
        { name: "VALUE" },
      ],
    });
    assertEquals(result, expected);
  });
  await t.step("argument after option with multiple values", () => {
    assertThrows(() => {
      parse(["--foo", "bar", "baz"], {
        options: [
          { name: "foo", value: { name: "VALUE", multiple: true } },
        ],
        arguments: [
          { name: "VALUE" },
        ],
      });
    });
  });
  await t.step("optional argument after option with multiple values", () => {
    const expected = {
      options: { foo: ["bar", "baz"] },
      arguments: {},
    };
    const result = parse(["--foo", "bar", "baz"], {
      options: [
        { name: "foo", value: { name: "VALUE", multiple: true } },
      ],
      arguments: [
        { name: "VALUE", optional: true },
      ],
    });
    assertEquals(result, expected);
  });
  await t.step("optional argument after option with multiple values", () => {
    const expected = {
      options: { foo: ["bar", "baz"] },
      arguments: {},
    };
    const result = parse(["--foo", "bar", "baz"], {
      options: [
        { name: "foo", value: { name: "VALUE", multiple: true } },
      ],
      arguments: [
        { name: "VALUE", optional: true },
      ],
    });
    assertEquals(result, expected);
  });
  await t.step("multiple arguments", () => {
    const expected = {
      options: {},
      arguments: { VALUE: "foo", VALUE2: "bar" },
    };
    const result = parse(["foo", "bar"], {
      arguments: [
        { name: "VALUE" },
        { name: "VALUE2" },
      ],
    });
    assertEquals(result, expected);
  });
  await t.step("multiple different arguments", () => {
    const expected = {
      options: {},
      arguments: { VALUE: ["foo", "bar"] },
    };
    const result = parse(["foo", "bar"], {
      arguments: [
        { name: "VALUE", multiple: true },
      ],
    });

    assertEquals(result, expected);
  });
  await t.step("missing argument", () => {
    assertThrows(() => {
      parse([], {
        arguments: [{ name: "VALUE" }],
      });
    });
  });
  await t.step("optional argument", () => {
    const expected = {
      options: {},
      arguments: { VALUE: "foo" },
    };
    const result = parse(["foo"], {
      arguments: [
        { name: "VALUE", optional: true },
      ],
    });

    assertEquals(result, expected);
  });
  await t.step("missing optional argument", () => {
    const expected = {
      options: {},
      arguments: {},
    };
    const result = parse([], {
      arguments: [
        { name: "VALUE", optional: true },
      ],
    });
    assertEquals(result, expected);
  });
  await t.step("optional multiple argument", () => {
    const expected = {
      options: {},
      arguments: { VALUE: ["foo", "bar"] },
    };
    const result = parse(["foo", "bar"], {
      arguments: [
        { name: "VALUE", multiple: true, optional: true },
      ],
    });
    assertEquals(result, expected);
  });
  await t.step("missing optional multiple argument", () => {
    const expected = {
      options: {},
      arguments: {},
    };
    const result = parse([], {
      arguments: [
        { name: "VALUE", multiple: true, optional: true },
      ],
    });
    assertEquals(result, expected);
  });
  await t.step("fn() is called", () => {
    let called = false;
    parse(["foo"], {
      arguments: [
        {
          name: "run",
          fn: () => {
            called = true;
          },
        },
      ],
    });
    assertEquals(called, true);
  });
});

Deno.test("parse() handles commands", async (t) => {
  await t.step("fn() is called", () => {
    let called = false;
    parse(["run", "--foo"], {
      commands: [
        {
          name: "run",
          options: [
            { name: "foo" },
          ],
          fn: () => {
            called = true;
          },
        },
      ],
    });
    assertEquals(called, true);
  });
  await t.step("fn() nested commands are called", () => {
    let runCalled = false;
    let commandCalled = false;
    parse(["run", "command", "--foo"], {
      commands: [
        {
          name: "run",
          fn: () => runCalled = true,
          commands: [
            {
              name: "command",
              options: [
                { name: "foo" },
              ],
              fn: (result) => {
                commandCalled = true;
                assertEquals(result, { options: { foo: true }, arguments: {} });
              },
            },
          ],
        },
      ],
    });
    assertEquals(runCalled, true);
    assertEquals(commandCalled, true);
  });
  await t.step("fn() parameter", () => {
    const expected = { options: { foo: true }, arguments: {} };

    let called = false;
    const actual = parse(["--foo", "run", "--foo=bar"], {
      commands: [
        {
          name: "run",
          options: [
            { name: "foo", value: { name: "VALUE", requireEquals: true } },
          ],
          fn: (result) => {
            called = true;
            assertEquals(result, { options: { foo: "bar" }, arguments: {} });
          },
        },
      ],
      options: [
        { name: "foo" },
      ],
    });
    assertEquals(called, true);
    assertEquals(actual, expected);
  });
});

Deno.test("parse() handles arguments after --", async (t) => {
  await t.step("argument", () => {
    const expected = {
      options: { foo: true },
      arguments: { ["--"]: ["--foo"] },
    };
    const actual = parse(["--foo", "--", "--foo"], {
      options: [
        { name: "foo" },
      ],
    });
    assertEquals(actual, expected);
  });
  await t.step("multiple arguments", () => {
    const expected = {
      options: { foo: true },
      arguments: { BAR: "bar", ["--"]: ["--foo", "bar"] },
    };
    const actual = parse(["--foo", "bar", "--", "--foo", "bar"], {
      options: [
        { name: "foo" },
      ],
      arguments: [
        { name: "BAR" },
      ],
    });
    assertEquals(actual, expected);
  });
  await t.step("no arguments", () => {
    const expected = {
      options: {},
      arguments: { ["--"]: [] },
    };
    const actual = parse(["--"], {});
    assertEquals(actual, expected);
  });
});
