// Copyright 2018-2024 the Deno authors. All rights reserved. MIT license.

import { escape, normalize, unescape } from "./entities.ts";
import { assertEquals } from "../assert/mod.ts";
import entityList from "./named_entity_list.json" with { type: "json" };

Deno.test("escape()", async (t) => {
  await t.step('escapes &<>"', () => {
    assertEquals(escape("&<>'\""), "&amp;&lt;&gt;&#39;&quot;");
  });
  await t.step("escapes ' to &#39; (not &apos;)", () => {
    assertEquals(escape("'"), "&#39;");
  });
  await t.step("doesn't escape non-breaking space", () => {
    assertEquals(escape("\xa0"), "\xa0");
  });
  await t.step(
    "doesn't escape other characters, even if they have named entities",
    () => {
      assertEquals(escape("þð"), "þð");
    },
  );
  await t.step(
    "doesn't escape non-ascii text by default",
    () => {
      assertEquals(escape("两只小蜜蜂 🐝🐝"), "两只小蜜蜂 🐝🐝");
    },
  );
  await t.step(
    "doesn't escape non-ascii text when `form` is `readability`",
    () => {
      assertEquals(
        escape("两只小蜜蜂 🐝🐝", { form: "readability" }),
        "两只小蜜蜂 🐝🐝",
      );
    },
  );
  await t.step(
    "escapes non-ascii text when `form` is `compatibility`",
    () => {
      assertEquals(
        escape("两只小蜜蜂 🐝🐝", { form: "compatibility" }),
        "&#x4e24;&#x53ea;&#x5c0f;&#x871c;&#x8702; &#x1f41d;&#x1f41d;",
      );
      assertEquals(escape("þð", { form: "compatibility" }), "&#xfe;&#xf0;");
    },
  );
  await t.step(
    "escapes control chars when `form` is `compatibility`",
    () => {
      assertEquals(escape("\x03", { form: "compatibility" }), "&#x3;");
    },
  );
  await t.step(
    "doesn't escape ASCII whitespace chars when `form` is `compatibility`",
    () => {
      assertEquals(escape(" \r\n\t", { form: "compatibility" }), " \r\n\t");
    },
  );
});

Deno.test("unescape()", async (t) => {
  await t.step("round-trips with escape", () => {
    const chars = "&<>'\"";
    assertEquals(unescape(escape(chars)), chars);
  });

  await t.step("named entities", async (t) => {
    await t.step("default options", async (t) => {
      await t.step("unescapes &apos; as alias for ' &#39;", () => {
        assertEquals(unescape("&apos;"), "'");
      });
      await t.step("unescapes &nbsp;", () => {
        assertEquals(unescape("&nbsp;"), "\xa0");
      });
      await t.step("doesn't unescape other named entities", () => {
        assertEquals(unescape("&thorn;&eth;"), "&thorn;&eth;");
      });
    });

    await t.step("full entity list", async (t) => {
      await t.step("unescapes arbitrary named entities", () => {
        assertEquals(unescape("&thorn;&eth;", { entityList }), "þð");
      });
      await t.step(
        "unescapes truncated named entity (no trailing semicolon) if it is listed",
        () => {
          assertEquals(unescape("&amp", { entityList }), "&");
        },
      );
      await t.step(
        "consumes full named entity even when a truncated version is specified",
        () => {
          assertEquals(unescape("&amp;", { entityList }), "&");
        },
      );
      await t.step(
        "doesn't unescape truncated named entity if it isn't listed",
        () => {
          assertEquals(
            unescape("&therefore; &therefore", { entityList }),
            "∴ &therefore",
          );
        },
      );
    });
  });

  await t.step("unescape() handles decimal", async (t) => {
    await t.step("unescapes decimal", () => {
      assertEquals(unescape("&#46;"), ".");
    });
    await t.step("unescapes max decimal codepoint", () => {
      assertEquals(unescape("&#1114111;"), "\u{10ffff}");
    });
    await t.step("unescapes decimal with leading zero", () => {
      assertEquals(unescape("&#046;"), ".");
    });
    await t.step(
      "unescapes invalid decimal codepoint to replacement character",
      () => {
        assertEquals(unescape("&#1114112;"), "�");
      },
    );
  });

  await t.step("unescape() handles hex", async (t) => {
    await t.step("unescapes lower-case hex", () => {
      assertEquals(unescape("&#x2e;"), ".");
    });
    await t.step("unescapes upper-case hex", () => {
      assertEquals(unescape("&#x2E;"), ".");
    });
    await t.step("unescapes hex with leading zero", () => {
      assertEquals(unescape("&#x02E;"), ".");
    });
    await t.step("unescapes max hex codepoint", () => {
      assertEquals(unescape("&#x10ffff;"), "\u{10ffff}");
    });
    await t.step(
      "unescapes invalid hex codepoint to replacement character",
      () => {
        assertEquals(unescape("&#x110000;"), "�");
      },
    );
  });
});

Deno.test("normalize()", async (t) => {
  await t.step(
    "normalizes unnecessarily escaped non-ascii chars by default",
    () => {
      assertEquals(
        normalize("&#x4e24;&#x53ea;&#x5c0f;&#x871c;&#x8702;"),
        "两只小蜜蜂",
      );
      assertEquals(normalize("两只小蜜蜂"), "两只小蜜蜂");
    },
  );
  await t.step(
    "normalizes unnecessarily escaped non-ascii chars if `form` is `readability`",
    () => {
      assertEquals(
        normalize("&#x4e24;&#x53ea;&#x5c0f;&#x871c;&#x8702;", {
          form: "readability",
        }),
        "两只小蜜蜂",
      );
      assertEquals(
        normalize("两只小蜜蜂", { form: "readability" }),
        "两只小蜜蜂",
      );
    },
  );
  await t.step(
    "normalizes non-ascii chars to escaped form if `form` is `compatibility`",
    () => {
      assertEquals(
        normalize("两只小蜜蜂", { form: "compatibility" }),
        "&#x4e24;&#x53ea;&#x5c0f;&#x871c;&#x8702;",
      );
      assertEquals(
        normalize("&#x4e24;&#x53ea;&#x5c0f;&#x871c;&#x8702;", {
          form: "compatibility",
        }),
        "&#x4e24;&#x53ea;&#x5c0f;&#x871c;&#x8702;",
      );
    },
  );
  await t.step("leaves markup untouched", () => {
    const markup = `<tag attr1="dbl" attr2='sgl' />`;
    assertEquals(normalize(markup), markup);
    assertEquals(normalize(markup, { form: "readability" }), markup);
    assertEquals(normalize(markup, { form: "compatibility" }), markup);
  });
  await t.step("normalizes unescaped & to &amp;", () => {
    assertEquals(normalize("a&b"), "a&amp;b");
    assertEquals(normalize("a&b", { form: "readability" }), "a&amp;b");
    assertEquals(normalize("a&b", { form: "compatibility" }), "a&amp;b");
  });
  await t.step("normalizes other forms of entities to a canonical form", () => {
    assertEquals(normalize("&#62;&#x3e;&gt;"), "&gt;&gt;&gt;");
    assertEquals(
      normalize("&#62;&#x3e;&gt;", { form: "readability" }),
      "&gt;&gt;&gt;",
    );
    assertEquals(
      normalize("&#62;&#x3e;&gt;", { form: "compatibility" }),
      "&gt;&gt;&gt;",
    );
  });
  await t.step(
    "normalizes &apos; to &#39; (for compliance with HTML 4.01 Strict)",
    () => {
      assertEquals(normalize("&apos;"), "&#39;");
      assertEquals(normalize("&apos;", { form: "readability" }), "&#39;");
      assertEquals(normalize("&apos;", { form: "compatibility" }), "&#39;");
    },
  );
});
