// Copyright 2018-2024 the Deno authors. All rights reserved. MIT license.
import { assertEquals } from "../assert/assert_equals.ts";
import "./setup.ts";
import { debug } from "./debug.ts";

Deno.test("default loggers work as expected", () => {
  const debugData: string = debug("foo");
  const debugResolver: string | undefined = debug(() => "foo");
  assertEquals(debugData, "foo");
  assertEquals(debugResolver, undefined);
});
