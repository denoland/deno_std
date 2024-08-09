// Copyright 2018-2024 the Deno authors. All rights reserved. MIT license.
import { assertEquals } from "@std/assert/equals";
import { slugify } from "./slugify.ts";

Deno.test("slugify() returns kebabcase", () => {
  assertEquals(slugify("hello world"), "hello-world");
});
Deno.test("slugify() returns lowercase", () => {
  assertEquals(slugify("Hello World"), "hello-world");
});

Deno.test("slugify() handles whitespaces", () => {
  assertEquals(slugify("  Hello   World  "), "hello-world");
  assertEquals(slugify("Hello\tWorld"), "hello-world");
  assertEquals(slugify("Hello\nWorld"), "hello-world");
  assertEquals(slugify("Hello\r\nWorld"), "hello-world");
});

Deno.test("slugify() handles special characters", () => {
  assertEquals(slugify("Hello, World!"), "hello-world");
  assertEquals(slugify("I ♥ Dogs"), "i-love-dogs");
  assertEquals(slugify("Copyright © by deno"), "copyright-c-by-deno");
  assertEquals(slugify("Café & Restaurant"), "cafe-and-restaurant");
  assertEquals(slugify("100% Real"), "100percent-real");
});

Deno.test("slugify() replaces diacritic characters", () => {
  assertEquals(slugify("я люблю единорогов"), "ya-lyublyu-edinorogov");
  assertEquals(slugify("déjà vu"), "deja-vu");
  assertEquals(slugify("Cliché"), "cliche");
  assertEquals(slugify("façade"), "facade");
  assertEquals(slugify("résumé"), "resume");
});

Deno.test("slugify() handles dashes", () => {
  assertEquals(slugify("-Hello-World-"), "hello-world");
  assertEquals(slugify("--Hello--World--"), "hello-world");
});

Deno.test("slugify() handles empty String", () => {
  assertEquals(slugify(""), "");
});

Deno.test("slugify() removes unknown special characters", () => {
  assertEquals(slugify("hello ~ world"), "hello-world");

  assertEquals(
    slugify("Elon Musk considers move to Mars"),
    "elon-musk-considers-move-to-mars",
  );
  assertEquals(
    slugify("Fintech startups raised $34B in 2019"),
    "fintech-startups-raised-dollar34b-in-2019",
  );
  assertEquals(
    slugify("Shopify joins Facebook’s cryptocurrency Libra Association"),
    "shopify-joins-facebooks-cryptocurrency-libra-association",
  );
  assertEquals(
    slugify("What is a slug and how to optimize it?"),
    "what-is-a-slug-and-how-to-optimize-it",
  );
  assertEquals(
    slugify("Bitcoin soars past $33,000, its highest ever"),
    "bitcoin-soars-past-dollar33000-its-highest-ever",
  );
});
