// Copyright 2018-2024 the Deno authors. All rights reserved. MIT license.

import {
  isClientErrorStatus,
  isErrorStatus,
  isInformationalStatus,
  isRedirectStatus,
  isServerErrorStatus,
  isSuccessfulStatus,
  STATUS_CODES,
  STATUS_TEXTS,
} from "./status.ts";
import { assert, assertEquals } from "@std/assert";

Deno.test({
  name: "STATUS_CODES",
  fn() {
    // just spot check a few common codes
    assertEquals(STATUS_CODES.OK, 200);
    assertEquals(STATUS_CODES.NoContent, 204);
    assertEquals(STATUS_CODES.NotFound, 404);
    assertEquals(STATUS_CODES.InternalServerError, 500);
  },
});

Deno.test({
  name: "STATUS_TEXTS",
  fn() {
    // just spot check a few common codes
    assertEquals(STATUS_TEXTS[STATUS_CODES.OK], "OK");
    assertEquals(STATUS_TEXTS[STATUS_CODES.NoContent], "No Content");
    assertEquals(STATUS_TEXTS[STATUS_CODES.NotFound], "Not Found");
    assertEquals(
      STATUS_TEXTS[STATUS_CODES.InternalServerError],
      "Internal Server Error",
    );
  },
});

Deno.test({
  name: "isInformationalStatus()",
  fn() {
    assert(isInformationalStatus(STATUS_CODES.Continue));
    assert(!isInformationalStatus(STATUS_CODES.OK));
    assert(isInformationalStatus(101));
    assert(!isInformationalStatus(300));
  },
});

Deno.test({
  name: "isSuccessfulStatus()",
  fn() {
    assert(isSuccessfulStatus(STATUS_CODES.OK));
    assert(!isSuccessfulStatus(STATUS_CODES.NotFound));
    assert(isSuccessfulStatus(204));
    assert(!isSuccessfulStatus(100));
  },
});

Deno.test({
  name: "isRedirectStatus()",
  fn() {
    assert(isRedirectStatus(STATUS_CODES.Found));
    assert(!isRedirectStatus(STATUS_CODES.NotFound));
    assert(isRedirectStatus(301));
    assert(!isRedirectStatus(200));
  },
});

Deno.test({
  name: "isClientErrorStatus()",
  fn() {
    assert(isClientErrorStatus(STATUS_CODES.NotFound));
    assert(!isClientErrorStatus(STATUS_CODES.InternalServerError));
    assert(isClientErrorStatus(400));
    assert(!isClientErrorStatus(503));
  },
});

Deno.test({
  name: "isServerErrorStatus()",
  fn() {
    assert(isServerErrorStatus(STATUS_CODES.InternalServerError));
    assert(!isServerErrorStatus(STATUS_CODES.NotFound));
    assert(isServerErrorStatus(503));
    assert(!isServerErrorStatus(400));
  },
});

Deno.test({
  name: "isErrorStatus()",
  fn() {
    assert(isErrorStatus(STATUS_CODES.InternalServerError));
    assert(isErrorStatus(STATUS_CODES.NotFound));
    assert(isErrorStatus(503));
    assert(isErrorStatus(400));
    assert(!isErrorStatus(STATUS_CODES.OK));
    assert(!isErrorStatus(STATUS_CODES.MovedPermanently));
    assert(!isErrorStatus(100));
    assert(!isErrorStatus(204));
  },
});
