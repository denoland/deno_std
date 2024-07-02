// Ported from js-yaml v3.13.1:
// https://github.com/nodeca/js-yaml/commit/665aadda42349dcae869f12040d9b10ef18d12da
// Copyright 2011-2015 by Vitaly Puzrin. All rights reserved. MIT license.
// Copyright 2018-2024 the Deno authors. All rights reserved. MIT license.

import { assertEquals, assertThrows } from "@std/assert";
import { stringify } from "./stringify.ts";
import { YamlError } from "./_error.ts";

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
  name: "stringify() serializes integers",
  fn() {
    assertEquals(stringify(42), "42\n");
    assertEquals(stringify(-42), "-42\n");

    // binary, octal, and hexadecimal can be specified in styles options
    assertEquals(
      stringify(42, { styles: { "!!int": "binary" } }),
      "0b101010\n",
    );
    assertEquals(
      stringify(42, { styles: { "!!int": "bin" } }),
      "0b101010\n",
    );
    assertEquals(
      stringify(42, { styles: { "!!int": 2 } }),
      "0b101010\n",
    );
    assertEquals(
      stringify(42, { styles: { "!!int": "octal" } }),
      "052\n",
    );
    assertEquals(
      stringify(42, { styles: { "!!int": "oct" } }),
      "052\n",
    );
    assertEquals(
      stringify(42, { styles: { "!!int": 8 } }),
      "052\n",
    );
    assertEquals(
      stringify(42, { styles: { "!!int": "hexadecimal" } }),
      "0x2A\n",
    );
    assertEquals(
      stringify(42, { styles: { "!!int": "hex" } }),
      "0x2A\n",
    );
    assertEquals(
      stringify(42, { styles: { "!!int": 16 } }),
      "0x2A\n",
    );
  },
});

Deno.test({
  name: "stringify() serializes boolean values",
  fn() {
    assertEquals(stringify([true, false]), "- true\n- false\n");

    // casing can be controlled with styles options
    assertEquals(
      stringify([true, false], { styles: { "!!bool": "camelcase" } }),
      "- True\n- False\n",
    );
    assertEquals(
      stringify([true, false], { styles: { "!!bool": "uppercase" } }),
      "- TRUE\n- FALSE\n",
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
    const object = { undefined: undefined };
    assertThrows(
      () => stringify(object),
      YamlError,
      "unacceptable kind of an object to dump",
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
  name: "stringify() handles float types",
  fn() {
    const floats = [
      4.1,
      -1.473,
      6.82e-5,
      6.82e-12,
      5e-12,
      0,
      -0,
    ];
    assertEquals(
      stringify(floats),
      `- 4.1
- -1.473
- 0.0000682
- 6.82e-12
- 5.e-12
- 0
- -0.0
`,
    );
    const infNaN = [Infinity, -Infinity, NaN];
    assertEquals(
      stringify(infNaN),
      `- .inf
- -.inf
- .nan
`,
    );
    assertEquals(
      stringify(infNaN, { styles: { "tag:yaml.org,2002:float": "uppercase" } }),
      `- .INF
- -.INF
- .NAN
`,
    );
    assertEquals(
      stringify(infNaN, { styles: { "tag:yaml.org,2002:float": "camelcase" } }),
      `- .Inf
- -.Inf
- .NaN
`,
    );
  },
});

Deno.test({
  name: "stringify() encode string with special characters",
  fn() {
    assertEquals(stringify("\x03"), `"\\x03"\n`);
    assertEquals(stringify("\x08"), `"\\b"\n`);
    assertEquals(stringify("\uffff"), `"\\uFFFF"\n`);
    assertEquals(stringify("🐱"), `"\\U0001F431"\n`);
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
