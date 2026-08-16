// Ported from js-yaml v3.13.1:
// https://github.com/nodeca/js-yaml/commit/665aadda42349dcae869f12040d9b10ef18d12da
// Copyright 2011-2015 by Vitaly Puzrin. All rights reserved. MIT license.
// Copyright 2018-2026 the Deno authors. MIT license.

import { assertEquals, assertThrows } from "@std/assert";
import { stringify } from "./stringify.ts";
import {
  type ImplicitType,
  stringify as unstableStringify,
} from "./unstable_stringify.ts";
import { parse as unstableParse } from "./unstable_parse.ts";
import { compare, parse } from "@std/semver";

Deno.test({
  name: "stringify()",
  fn() {
    const FIXTURE = {
      foo: {
        bar: true,
        test: [
          "a",
          "b",
          {
            a: false,
          },
          {
            a: false,
          },
        ],
      },
      test: "foobar",
      binary: new Uint8Array([72, 101, 108, 108, 111]),
    };

    const ASSERTS = `foo:
  bar: true
  test:
    - a
    - b
    - a: false
    - a: false
test: foobar
binary: !<tag:yaml.org,2002:binary> SGVsbG8=
`;

    assertEquals(stringify(FIXTURE), ASSERTS);
  },
});

Deno.test({
  name: "arrays can be stringified directly",
  fn() {
    const array = [1, 2, 3];

    const expected = "- 1\n- 2\n- 3\n";

    assertEquals(stringify(array), expected);
  },
});

Deno.test({
  name: "strings can be stringified directly",
  fn() {
    const string = "Hello world";

    const expected = "Hello world\n";

    assertEquals(stringify(string), expected);
  },
});

Deno.test({
  name: "numbers can be stringified directly",
  fn() {
    const number = 1.01;

    const expected = "1.01\n";

    assertEquals(stringify(number), expected);
  },
});

Deno.test({
  name: "stringify() handles integers",
  fn() {
    assertEquals(stringify(42), "42\n");
    assertEquals(stringify(-42), "-42\n");

    assertEquals(stringify(new Number(42)), "42\n");
    assertEquals(stringify(new Number(-42)), "-42\n");
  },
});
Deno.test({
  name: "stringify() handles integers with styles option",
  fn() {
    // binary, octal, and hexadecimal can be specified in styles options
    assertEquals(
      stringify(42, { styles: { "!!int": "binary" } }),
      "0b101010\n",
    );
    assertEquals(
      stringify(-42, { styles: { "!!int": "binary" } }),
      "-0b101010\n",
    );
    assertEquals(
      stringify(new Number(42), { styles: { "!!int": "binary" } }),
      "0b101010\n",
    );
    assertEquals(
      stringify(42, { styles: { "!!int": "octal" } }),
      "052\n",
    );
    assertEquals(
      stringify(-42, { styles: { "!!int": "octal" } }),
      "-052\n",
    );
    assertEquals(
      stringify(new Number(42), { styles: { "!!int": "octal" } }),
      "052\n",
    );
    assertEquals(
      stringify(42, { styles: { "!!int": "hexadecimal" } }),
      "0x2A\n",
    );
    assertEquals(
      stringify(-42, { styles: { "!!int": "hexadecimal" } }),
      "-0x2A\n",
    );
    assertEquals(
      stringify(new Number(42), { styles: { "!!int": "hexadecimal" } }),
      "0x2A\n",
    );
    assertThrows(
      () => stringify(42, { styles: { "!!int": "camelcase" } }),
      TypeError,
      '!<tag:yaml.org,2002:int> tag resolver accepts not "camelcase" style',
    );
  },
});

Deno.test({
  name: "stringify() handles boolean values",
  fn() {
    assertEquals(stringify(true), "true\n");
    assertEquals(stringify(false), "false\n");

    assertEquals(stringify(new Boolean(true)), "true\n");
    assertEquals(stringify(new Boolean(false)), "false\n");
  },
});
Deno.test({
  name: "stringify() handles boolean with styles option",
  fn() {
    assertEquals(
      stringify(true, { styles: { "!!bool": "camelcase" } }),
      "True\n",
    );
    assertEquals(
      stringify(false, { styles: { "!!bool": "camelcase" } }),
      "False\n",
    );
    assertEquals(
      stringify(new Boolean(true), { styles: { "!!bool": "camelcase" } }),
      "True\n",
    );
    assertEquals(
      stringify(true, { styles: { "!!bool": "uppercase" } }),
      "TRUE\n",
    );
    assertEquals(
      stringify(false, { styles: { "!!bool": "uppercase" } }),
      "FALSE\n",
    );
    assertEquals(
      stringify(new Boolean(true), { styles: { "!!bool": "uppercase" } }),
      "TRUE\n",
    );
    assertThrows(
      () => stringify(true, { styles: { "!!bool": "octal" } }),
      TypeError,
      '!<tag:yaml.org,2002:bool> tag resolver accepts not "octal" style',
    );
    assertThrows(
      () => stringify(false, { styles: { "!!bool": "octal" } }),
      TypeError,
      '!<tag:yaml.org,2002:bool> tag resolver accepts not "octal" style',
    );
  },
});

Deno.test({
  name: "stringify() serializes Uint8Array as !!binary",
  fn() {
    assertEquals(
      stringify(new Uint8Array([1])),
      "!<tag:yaml.org,2002:binary> AQ==\n",
    );
    assertEquals(
      stringify(new Uint8Array([1, 2])),
      "!<tag:yaml.org,2002:binary> AQI=\n",
    );
    assertEquals(
      stringify(new Uint8Array([1, 2, 3])),
      "!<tag:yaml.org,2002:binary> AQID\n",
    );
    assertEquals(
      stringify(new Uint8Array(Array(50).keys())),
      "!<tag:yaml.org,2002:binary> AAECAwQFBgcICQoLDA0ODxAREhMUFRYXGBkaGxwdHh8gISIjJCUmJygpKissLS4vMDE=\n",
    );
  },
});

Deno.test({
  name: "stringify() throws with `!!js/*` yaml types with default schemas",
  fn() {
    assertThrows(
      () => stringify(undefined),
      TypeError,
      "Cannot stringify undefined",
    );
    assertThrows(
      () => stringify(() => {}),
      TypeError,
      "Cannot stringify function",
    );
  },
});

Deno.test({
  name: "stringify() handles `!!js/*` yaml types with extended schema",
  fn() {
    const object = {
      regexp: {
        simple: /foobar/,
        modifiers: /foobar/im,
      },
      undefined: undefined,
    };

    const expected = `regexp:
  simple: !<tag:yaml.org,2002:js/regexp> /foobar/
  modifiers: !<tag:yaml.org,2002:js/regexp> /foobar/im
undefined: !<tag:yaml.org,2002:js/undefined> ''
`;

    assertEquals(stringify(object, { schema: "extended" }), expected);
  },
});

Deno.test({
  name:
    "stringify() throws with `!!js/function` yaml types with extended schema",
  fn() {
    const func = function foobar() {
      return "hello world!";
    };

    assertThrows(
      () => stringify({ function: func }, { schema: "extended" }),
    );
  },
});

Deno.test({
  name:
    "stringify() ignores `!!js/*` yaml types when skipInvalid option is true",
  fn() {
    assertEquals(
      stringify({ undefined: undefined }, { skipInvalid: true }),
      "{}\n",
    );
    assertEquals(
      stringify({
        foobar() {
          return "hello world!";
        },
      }, { skipInvalid: true }),
      "{}\n",
    );
  },
});

Deno.test({
  name: "stringify() handles float values",
  fn() {
    assertEquals(stringify(4.1), `4.1\n`);
    assertEquals(stringify(-1.473), `-1.473\n`);
    assertEquals(stringify(6.82e-5), `0.0000682\n`);
    assertEquals(stringify(6.82e-12), `6.82e-12\n`);
    assertEquals(stringify(5e-12), `5.e-12\n`);
    assertEquals(stringify(0.0), `0\n`);
    assertEquals(stringify(-0), `-0.0\n`);
    assertEquals(stringify(new Number(1.234)), `1.234\n`);
    assertEquals(stringify(new Number(-1.234)), `-1.234\n`);

    assertEquals(stringify(Infinity), `.inf\n`);
    assertEquals(stringify(-Infinity), `-.inf\n`);
    assertEquals(stringify(NaN), `.nan\n`);
  },
});
Deno.test({
  name: "stringify() handles float values with styles option",
  fn() {
    assertEquals(
      stringify(Infinity, {
        styles: { "tag:yaml.org,2002:float": "uppercase" },
      }),
      `.INF\n`,
    );
    assertEquals(
      stringify(-Infinity, {
        styles: { "tag:yaml.org,2002:float": "uppercase" },
      }),
      `-.INF\n`,
    );
    assertEquals(
      stringify(NaN, { styles: { "tag:yaml.org,2002:float": "uppercase" } }),
      `.NAN\n`,
    );
    assertEquals(
      stringify(Infinity, {
        styles: { "tag:yaml.org,2002:float": "camelcase" },
      }),
      `.Inf\n`,
    );
    assertEquals(
      stringify(-Infinity, {
        styles: { "tag:yaml.org,2002:float": "camelcase" },
      }),
      `-.Inf\n`,
    );
    assertEquals(
      stringify(NaN, { styles: { "tag:yaml.org,2002:float": "camelcase" } }),
      `.NaN\n`,
    );
  },
});

Deno.test({
  name: "stringify() encode string with special characters",
  fn() {
    assertEquals(stringify("\x03"), `"\\x03"\n`);
    assertEquals(stringify("\x08"), `"\\b"\n`);
    assertEquals(stringify("\uffff"), `"\\uFFFF"\n`);
    // printable astral characters (e.g. emoji) are emitted literally
    assertEquals(stringify("🐱"), `🐱\n`);
    assertEquals(stringify("🎨 Check Format"), `🎨 Check Format\n`);
  },
});

Deno.test({
  name: "stringify() format Date objet into ISO string",
  fn() {
    assertEquals(
      stringify([new Date("2021-01-01T00:00:00.000Z")]),
      `- 2021-01-01T00:00:00.000Z\n`,
    );
  },
});

Deno.test({
  name: "stringify() works with useAnchors option",
  fn() {
    const obj = { foo: "bar" };
    assertEquals(
      stringify([obj, obj], { useAnchors: false }),
      `- foo: bar\n- foo: bar\n`,
    );
    assertEquals(
      stringify([obj, obj], { useAnchors: true }),
      `- &ref_0\n  foo: bar\n- *ref_0\n`,
    );
  },
});

Deno.test({
  name: "stringify() uses block scalar style for multiline strings",
  fn() {
    assertEquals(
      stringify("foo\nbar"),
      `|-
  foo
  bar
`,
    );
    assertEquals(
      stringify("foo  \nbar  "),
      `|-
  foo \x20
  bar \x20
`,
    );
  },
});

Deno.test({
  name: "stringify() uses folded scalar style for long strings",
  fn() {
    assertEquals(
      stringify(
        "Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat.\nDuis aute irure dolor in reprehenderit in voluptate velit esse cillum dolore eu fugiat nulla pariatur. Excepteur sint occaecat cupidatat non proident, sunt in culpa qui officia deserunt mollit anim id est laborum.",
      ),
      `>-
  Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor
  incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis
  nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat.

  Duis aute irure dolor in reprehenderit in voluptate velit esse cillum dolore
  eu fugiat nulla pariatur. Excepteur sint occaecat cupidatat non proident, sunt
  in culpa qui officia deserunt mollit anim id est laborum.
`,
    );
  },
});

Deno.test({
  name:
    "stringify() uses flow style for arrays and mappings when the nesting level exceeds flowLevel option value",
  fn() {
    assertEquals(
      stringify({ foo: ["bar", "baz"], bar: { hello: "world" } }, {
        flowLevel: 1,
      }),
      `foo: [bar, baz]
bar: {hello: world}
`,
    );

    const a = { foo: 42 };
    const b = [1, 2];
    const obj = { foo: [a, b], bar: { a, b } };
    assertEquals(
      stringify(obj, { flowLevel: 1 }),
      `foo: [&ref_0 {foo: 42}, &ref_1 [1, 2]]
bar: {a: *ref_0, b: *ref_1}
`,
    );
  },
});

Deno.test("stringify() handles indentation", () => {
  const object = {
    name: "John",
    age: 30,
    address: {
      street: "123 Main St",
      city: "Anytown",
      zip: 12345,
    },
    skills: ["JavaScript", "TypeScript", "Deno"],
  };

  const expected = `name: John
age: 30
address:
  street: 123 Main St
  city: Anytown
  zip: 12345
skills:
  - JavaScript
  - TypeScript
  - Deno
`;

  const actual = stringify(object);
  assertEquals(actual.trim(), expected.trim());
});

Deno.test("stringify() handles indentation with whitespace values", () => {
  const object = {
    name: "John",
    age: 30,
    address: {
      street: " 123 Main St ",
      city: "Anytown",
      zip: 12345,
    },
    skills: [" JavaScript ", "TypeScript", "Deno"],
  };

  const expected = `name: John
age: 30
address:
  street: ' 123 Main St '
  city: Anytown
  zip: 12345
skills:
  - ' JavaScript '
  - TypeScript
  - Deno
`;

  const actual = stringify(object);
  assertEquals(actual.trim(), expected.trim());
});

Deno.test("stringify() handles indentation with start newline values", () => {
  const object = {
    name: "John",
    age: 30,
    address: {
      street: "\n123 Main St",
      city: "Anytown",
      zip: 12345,
    },
    skills: ["\nJavaScript", "TypeScript", "Deno"],
  };

  const expected = `name: John
age: 30
address:
  street: |-\n\n    123 Main St
  city: Anytown
  zip: 12345
skills:
  - |-\n\n    JavaScript
  - TypeScript
  - Deno
`;

  const actual = stringify(object);
  assertEquals(actual.trim(), expected.trim());
});

Deno.test("stringify() handles indentation with trailing newline values", () => {
  const object = {
    name: "John",
    age: 30,
    address: {
      street: "123 Main St\n",
      city: "Anytown",
      zip: 12345,
    },
    skills: ["JavaScript\n", "TypeScript", "Deno"],
  };

  const expected = `name: John
age: 30
address:
  street: |\n    123 Main St
  city: Anytown
  zip: 12345
skills:
  - |\n    JavaScript
  - TypeScript
  - Deno
`;

  const actual = stringify(object);
  assertEquals(actual.trim(), expected.trim());
});

Deno.test(
  "stringify() changes indentation style for arrays when arrayIndent = false is specified",
  () => {
    const object = {
      name: "John",
      age: 30,
      address: {
        street: "123 Main St",
        city: "Anytown",
        zip: 12345,
      },
      skills: ["JavaScript", "TypeScript", "Deno"],
    };

    assertEquals(
      stringify(object, { arrayIndent: false }),
      `name: John
age: 30
address:
  street: 123 Main St
  city: Anytown
  zip: 12345
skills:
- JavaScript
- TypeScript
- Deno
`,
    );
  },
);

Deno.test("stringify() changes the key order when the sortKeys option is specified", () => {
  const object = {
    "1.0.0": null,
    "0.0.0-0": null,
    "0.0.0": null,
    "1.0.2": null,
    "1.0.10": null,
  };
  assertEquals(
    stringify(object),
    `1.0.0: null
0.0.0-0: null
0.0.0: null
1.0.2: null
1.0.10: null
`,
  );
  // When sortKeys is true, keys are sorted in ASCII char order
  assertEquals(
    stringify(object, { sortKeys: true }),
    `0.0.0: null
0.0.0-0: null
1.0.0: null
1.0.10: null
1.0.2: null
`,
  );
  // When sortKeys is a function, keys are sorted by the return value of the function
  assertEquals(
    stringify(object, { sortKeys: (a, b) => compare(parse(a), parse(b)) }),
    `0.0.0-0: null
0.0.0: null
1.0.0: null
1.0.2: null
1.0.10: null
`,
  );

  assertThrows(
    () => stringify(object, { sortKeys: "true" as unknown as boolean }),
    TypeError,
    '"sortKeys" must be a boolean or a function: received string',
  );
});

Deno.test("stringify() passes depth to sortKeys callback", () => {
  const input = { b: 1, a: 2, nested: { c: 3, d: 4 } };
  const sortKeys = (a: string, b: string, depth: number) =>
    depth === 0 ? a.localeCompare(b) : b.localeCompare(a);
  const expected = ["a: 2", "b: 1", "nested:", "  d: 4", "  c: 3", ""].join(
    "\n",
  );
  assertEquals(stringify(input, { sortKeys }), expected);
});

Deno.test("stringify() changes line wrap behavior based on lineWidth option", () => {
  const object = {
    message:
      "Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat. Duis aute irure dolor in reprehenderit in voluptate velit esse cillum dolore eu fugiat nulla pariatur. Excepteur sint occaecat cupidatat non proident, sunt in culpa qui officia deserunt mollit anim id est laborum.",
  };

  assertEquals(
    stringify(object, { lineWidth: 40 }),
    `message: >-
  Lorem ipsum dolor sit amet, consectetur
  adipiscing elit, sed do eiusmod tempor
  incididunt ut labore et dolore magna
  aliqua. Ut enim ad minim veniam, quis
  nostrud exercitation ullamco laboris
  nisi ut aliquip ex ea commodo consequat.
  Duis aute irure dolor in reprehenderit
  in voluptate velit esse cillum dolore eu
  fugiat nulla pariatur. Excepteur sint
  occaecat cupidatat non proident, sunt in
  culpa qui officia deserunt mollit anim
  id est laborum.
`,
  );
  // default lineWidth is 80
  assertEquals(
    stringify(object),
    `message: >-
  Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor
  incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis
  nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat.
  Duis aute irure dolor in reprehenderit in voluptate velit esse cillum dolore
  eu fugiat nulla pariatur. Excepteur sint occaecat cupidatat non proident, sunt
  in culpa qui officia deserunt mollit anim id est laborum.
`,
  );
  assertEquals(
    stringify(object, { lineWidth: 120 }),
    `message: >-
  Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna
  aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat.
  Duis aute irure dolor in reprehenderit in voluptate velit esse cillum dolore eu fugiat nulla pariatur. Excepteur sint
  occaecat cupidatat non proident, sunt in culpa qui officia deserunt mollit anim id est laborum.
`,
  );
  assertEquals(
    stringify(object, { lineWidth: Infinity }),
    "message: 'Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat. Duis aute irure dolor in reprehenderit in voluptate velit esse cillum dolore eu fugiat nulla pariatur. Excepteur sint occaecat cupidatat non proident, sunt in culpa qui officia deserunt mollit anim id est laborum.'\n",
  );
});

Deno.test("stringify() changes indentation with indent option", () => {
  const object = {
    name: "John",
    age: 30,
    address: {
      street: "123 Main St",
      city: "Anytown",
      zip: 12345,
    },
    skills: ["JavaScript", "TypeScript", "Deno"],
  };

  assertEquals(
    stringify(object, { indent: 4 }),
    `name: John
age: 30
address:
    street: 123 Main St
    city: Anytown
    zip: 12345
skills:
    - JavaScript
    - TypeScript
    - Deno
`,
  );

  assertEquals(
    stringify(object, { indent: 8 }),
    `name: John
age: 30
address:
        street: 123 Main St
        city: Anytown
        zip: 12345
skills:
        - JavaScript
        - TypeScript
        - Deno
`,
  );
});

Deno.test("stringify() handles nil", () => {
  assertEquals(stringify(null), "null\n");
  assertEquals(
    stringify(null, { styles: { "tag:yaml.org,2002:null": "lowercase" } }),
    "null\n",
  );
  assertEquals(
    stringify(null, { styles: { "tag:yaml.org,2002:null": "uppercase" } }),
    "NULL\n",
  );
  assertEquals(
    stringify(null, { styles: { "tag:yaml.org,2002:null": "camelcase" } }),
    "Null\n",
  );
});

Deno.test("stringify() handles sequence", () => {
  assertEquals(stringify([]), "[]\n");
  assertEquals(
    stringify(["Clark Evans", "Ingy döt Net", "Oren Ben-Kiki"]),
    `- Clark Evans
- Ingy döt Net
- Oren Ben-Kiki
`,
  );
});

Deno.test("stringify() handles mapping", () => {
  assertEquals(stringify({}), "{}\n");
  assertEquals(
    stringify({ Clark: "Evans", Ingy: "döt Net", Oren: "Ben-Kiki" }),
    `Clark: Evans
Ingy: döt Net
Oren: Ben-Kiki
`,
  );
});

Deno.test("stringify() handles string", () => {
  assertEquals(stringify("Hello World"), "Hello World\n");
  assertEquals(stringify(new String("Hello World")), "Hello World\n");
});

Deno.test("stringify() uses quotes around deprecated boolean notations when `compatMode: true`", () => {
  assertEquals(stringify("On", { compatMode: true }), "'On'\n");
  assertEquals(stringify("Off", { compatMode: true }), "'Off'\n");
  assertEquals(stringify("Yes", { compatMode: true }), "'Yes'\n");
  assertEquals(stringify("No", { compatMode: true }), "'No'\n");
});

Deno.test("stringify() handles undefined with skipInvalid option", () => {
  assertEquals(
    stringify(undefined, { skipInvalid: true }),
    "",
  );
});

Deno.test({
  name: "stringify() handles object with condenseFlow option",
  fn() {
    assertEquals(
      stringify({ foo: ["bar", "baz"], bar: { hello: "world" } }, {
        flowLevel: 1,
        condenseFlow: true,
      }),
      `foo: [bar,baz]\nbar: {"hello":world}\n`,
    );
  },
});

Deno.test("stringify() returns emtpy array on invalid entries", () => {
  assertEquals(
    stringify([undefined], { skipInvalid: true }),
    "[]\n",
  );
});

Deno.test("stringify() handles duplicate array references", () => {
  const a = ["foo"];
  assertEquals(
    stringify([a, a]),
    "- &ref_0\n  - foo\n- *ref_0\n",
  );
});

Deno.test({
  name:
    "stringify() handles undefined array entry with skipInvalid and flowLevel option",
  fn() {
    assertEquals(
      stringify({ foo: [undefined] }, {
        flowLevel: 1,
        skipInvalid: true,
      }),
      `foo: []\n`,
    );
  },
});

Deno.test({
  name:
    "stringify() handles undefined object entry with skipInvalid and flowLevel option",
  fn() {
    assertEquals(
      stringify({ foo: { bar: undefined } }, {
        flowLevel: 1,
        skipInvalid: true,
      }),
      `foo: {}\n`,
    );
  },
});

Deno.test({
  name:
    "stringify() handles undefined object entry with big key and skipInvalid and flowLevel option",
  fn() {
    const key = "a".repeat(1025);
    assertEquals(
      stringify({ [key]: { bar: undefined } }, {
        flowLevel: 1,
        skipInvalid: true,
      }),
      `? aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa\n: {}\n`,
    );
  },
});

Deno.test({
  name: "stringify() handles duplicate binary references",
  fn() {
    const a = new Uint8Array();
    assertEquals(
      stringify([a, a]),
      "- !<tag:yaml.org,2002:binary> AAAA\n- !<tag:yaml.org,2002:binary> AAAA\n",
    );
  },
});

Deno.test({
  name: "(unstable) stringify() handles quoteStyle",
  fn() {
    const object = { url: "https://example.com" };
    assertEquals(
      unstableStringify(object, { quoteStyle: '"' }),
      `url: "https://example.com"\n`,
    );
    assertEquals(
      unstableStringify(object, { quoteStyle: "'" }),
      `url: 'https://example.com'\n`,
    );
  },
});

Deno.test({
  name: "unstableStringify() handles custom types",
  fn() {
    const foo: ImplicitType = {
      tag: "tag:custom:smile",
      resolve: (data: string): boolean => data === "=)",
      construct: (): string => "🙂",
      predicate: (data: unknown): data is string => data === "🙂",
      kind: "scalar",
      represent: (): string => "=)",
    };

    assertEquals(
      unstableStringify({
        title: "🙂",
        tags: ["🙂", "bar"],
      }, { extraTypes: [foo] }),
      `title: =)
tags:
  - =)
  - bar
`,
    );
  },
});

Deno.test("unstableStringify() stringifies Maps as mappings in insertion order", () => {
  assertEquals(
    unstableStringify(
      new Map<unknown, unknown>([[3, "A3"], ["b", 2], [true, null]]),
    ),
    "3: A3\nb: 2\ntrue: null\n",
  );
  // `sortKeys` does not apply to Map entries: insertion order is the contract
  assertEquals(
    unstableStringify(new Map([["b", 1], ["a", 2]]), { sortKeys: true }),
    "b: 1\na: 2\n",
  );
  assertEquals(unstableStringify(new Map()), "{}\n");
  // Nested in plain objects and emitted in flow style when requested
  assertEquals(
    unstableStringify({ m: new Map([[1, "a"]]) }),
    "m:\n  1: a\n",
  );
  assertEquals(
    unstableStringify({ m: new Map([[1, "a"]]) }, { flowLevel: 0 }),
    "{m: {1: a}}\n",
  );
});

Deno.test("unstableStringify() stringifies complex Map keys in explicit key form", () => {
  assertEquals(
    unstableStringify(
      new Map<unknown, unknown>([
        [["a", "b"], 1],
        [new Map([["x", 1]]), "mk"],
      ]),
    ),
    "?\n  - a\n  - b\n: 1\n?\n  x: 1\n: mk\n",
  );
});

Deno.test("unstableStringify() stringifies Map keys in flow style", () => {
  assertEquals(
    unstableStringify(
      new Map<unknown, unknown>([[["a", "b"], 1], [3, "x"]]),
      { flowLevel: 0 },
    ),
    "{[a, b]: 1, 3: x}\n",
  );
  // `condenseFlow` quotes string keys only; quoting other keys would change
  // their parsed type
  assertEquals(
    unstableStringify(
      new Map<unknown, unknown>([[3, "a"], ["k", "v"]]),
      { flowLevel: 0, condenseFlow: true },
    ),
    '{3:a, "k":v}\n',
  );
});

Deno.test("unstableStringify() stringifies Sets as !!set mappings", () => {
  assertEquals(
    unstableStringify(new Set(["a", 2])),
    "!<tag:yaml.org,2002:set>\n? a\n: null\n? 2\n: null\n",
  );
  assertEquals(
    unstableStringify(new Set()),
    "!<tag:yaml.org,2002:set> {}\n",
  );
});

Deno.test("unstableStringify() anchors duplicate Maps and objects inside Maps", () => {
  const shared = new Map([["k", 1]]);
  assertEquals(
    unstableStringify({ x: shared, y: shared }),
    "x: &ref_0\n  k: 1\n'y': *ref_0\n",
  );
  // Duplicate detection walks Map keys as well as values
  const object = { v: 1 };
  assertEquals(
    unstableStringify(
      new Map<unknown, unknown>([[object, "first"], ["other", object]]),
    ),
    "? &ref_0\n  v: 1\n: first\nother: *ref_0\n",
  );
  // Anchors work in flow style too
  assertEquals(
    unstableStringify({ x: shared, y: shared }, { flowLevel: 0 }),
    "{x: &ref_0 {k: 1}, 'y': *ref_0}\n",
  );
});

Deno.test("unstableStringify() applies the skipInvalid doctrine to Map entries", () => {
  assertThrows(
    () => unstableStringify(new Map([["fn", () => {}]])),
    TypeError,
    "Cannot stringify function",
  );
  assertEquals(
    unstableStringify(new Map([["fn", () => {}]]), { skipInvalid: true }),
    "{}\n",
  );
  assertEquals(
    unstableStringify(
      new Map<unknown, unknown>([[() => {}, 1], ["ok", 2]]),
      { skipInvalid: true },
    ),
    "ok: 2\n",
  );
  // Invalid keys and values are skipped per pair in flow style too
  assertEquals(
    unstableStringify(
      new Map<unknown, unknown>([[() => {}, 1], ["k", () => {}], [1, "ok"]]),
      { skipInvalid: true, flowLevel: 0 },
    ),
    "{1: ok}\n",
  );
});

Deno.test("unstableStringify() puts Map keys over 1024 characters in explicit key form", () => {
  const longKey = "x".repeat(1025);
  assertEquals(
    unstableStringify(new Map([[longKey, 1]])),
    `? ${longKey}\n: 1\n`,
  );
  assertEquals(
    unstableStringify(new Map([[longKey, 1]]), { flowLevel: 0 }),
    `{? ${longKey}: 1}\n`,
  );
});

Deno.test("unstableStringify() round-trips Maps and Sets with unstableParse()", () => {
  const source = new Map<unknown, unknown>([
    [3, "A3"],
    ["3", "S3"],
    [["a", "b"], new Set([1, "two"])],
    [new Map([[true, null]]), [1, 2, 3]],
  ]);
  assertEquals(
    unstableParse(unstableStringify(source), { useMaps: true }),
    source,
  );
  // And starting from YAML text
  const yaml = `milestones:
  3: A3
  6: D4
  9: G3
`;
  assertEquals(
    unstableStringify(unstableParse(yaml, { useMaps: true })),
    yaml,
  );
});

Deno.test("stringify() still stringifies Maps as empty mappings", () => {
  // The stable stringify is unchanged in this mode; only the unstable one
  // understands Maps.
  assertEquals(stringify(new Map([["a", 1]])), "{}\n");
});
