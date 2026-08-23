// Copyright 2018-2026 the Deno authors. MIT license.
import {
  assert,
  assertEquals,
  assertFalse,
  assertInstanceOf,
} from "@std/assert";
import { createServer } from "node:net";
import { isRetriableFetchError } from "./unstable_is_retriable_fetch_error.ts";

Deno.test("isRetriableFetchError() returns true for responses with retriable statuses", () => {
  for (const status of [408, 429, 500, 503, 522]) {
    assert(
      isRetriableFetchError(new Response(null, { status })),
      `status ${status}`,
    );
  }
});

Deno.test("isRetriableFetchError() returns false for responses with non-retriable statuses", () => {
  for (const status of [200, 400, 404]) {
    assertFalse(
      isRetriableFetchError(new Response(null, { status })),
      `status ${status}`,
    );
  }
});

Deno.test("isRetriableFetchError() returns true for errors with a retriable status property", () => {
  for (const status of [408, 429, 500, 503, 522]) {
    const error = Object.assign(new Error("request failed"), { status });
    assert(isRetriableFetchError(error), `status ${status}`);
  }
});

Deno.test("isRetriableFetchError() returns false for errors with a non-retriable status property", () => {
  for (const status of [400, 404]) {
    const error = Object.assign(new Error("request failed"), { status });
    assertFalse(isRetriableFetchError(error), `status ${status}`);
  }
});

Deno.test("isRetriableFetchError() ignores non-integer and out-of-range status properties", () => {
  assertFalse(
    isRetriableFetchError(Object.assign(new Error("x"), { status: "503" })),
  );
  assertFalse(
    isRetriableFetchError(Object.assign(new Error("x"), { status: 503.5 })),
  );
  assertFalse(
    isRetriableFetchError(Object.assign(new Error("x"), { status: 999 })),
  );
});

Deno.test("isRetriableFetchError() returns false when the message merely mentions a status or timeout", () => {
  assertFalse(
    isRetriableFetchError(
      new Error('Unexpected response payload: {"code":429,"error":"timeout"}'),
    ),
  );
  assertFalse(
    isRetriableFetchError(
      new TypeError("Cannot read properties of undefined (reading 'timeout')"),
    ),
  );
});

Deno.test("isRetriableFetchError() returns false for AbortError produced by AbortController.abort()", () => {
  const controller = new AbortController();
  controller.abort();
  const reason = controller.signal.reason;
  assertInstanceOf(reason, DOMException);
  assertEquals(reason.name, "AbortError");
  assertFalse(isRetriableFetchError(reason));
});

Deno.test("isRetriableFetchError() returns true for a TimeoutError DOMException", () => {
  assert(
    isRetriableFetchError(new DOMException("Signal timed out", "TimeoutError")),
  );
});

Deno.test("isRetriableFetchError() returns true for a real failed fetch TypeError", async () => {
  // Find a port that is guaranteed to refuse connections: bind an
  // ephemeral port on 127.0.0.1, read it, and close the listener.
  const port = await new Promise<number>((resolve, reject) => {
    const server = createServer();
    server.once("error", reject);
    server.listen(0, "127.0.0.1", () => {
      const address = server.address() as { port: number };
      server.close((error) => error ? reject(error) : resolve(address.port));
    });
  });
  const error = await fetch(`http://127.0.0.1:${port}/`).then(
    () => null,
    (error) => error,
  );
  assertInstanceOf(error, TypeError);
  const { code } = error as { code?: unknown };
  assert(
    isRetriableFetchError(error),
    `unexpected failed-fetch shape: name=${error.name} message=${
      JSON.stringify(error.message)
    } code=${JSON.stringify(code)}`,
  );
});

Deno.test("isRetriableFetchError() returns true for legacy Deno transport TypeErrors", () => {
  assert(
    isRetriableFetchError(
      new TypeError(
        "error sending request for url (http://example.com/): client error (Connect): tcp connect error",
      ),
    ),
  );
});

Deno.test("isRetriableFetchError() returns true for errors with a transient network code", () => {
  // Shapes thrown by Bun's fetch, verified against Bun 1.4.
  const bunShapes = [
    Object.assign(
      new TypeError(
        "Unable to connect. Is the computer able to access the url?",
      ),
      { code: "ConnectionRefused" },
    ),
    Object.assign(
      new TypeError(
        "The socket connection was closed unexpectedly. For more information, pass `verbose: true` in the second argument to fetch()",
      ),
      { code: "ECONNRESET" },
    ),
    Object.assign(
      new TypeError("getaddrinfo ENOTFOUND example.invalid"),
      { code: "ENOTFOUND" },
    ),
  ];
  for (const error of bunShapes) {
    assert(isRetriableFetchError(error), String(error.code));
  }
  // The cause of undici's "fetch failed" TypeError, as rethrown directly.
  const undiciCause = Object.assign(
    new Error("connect ECONNREFUSED 127.0.0.1:80"),
    { code: "ECONNREFUSED", errno: -61, syscall: "connect" },
  );
  assert(isRetriableFetchError(undiciCause));
});

Deno.test("isRetriableFetchError() ignores deterministic, unknown, and non-string codes", () => {
  assertFalse(
    isRetriableFetchError(
      Object.assign(new TypeError("Failed to parse URL from :bad:"), {
        code: "ERR_INVALID_URL",
      }),
    ),
  );
  assertFalse(
    isRetriableFetchError(
      Object.assign(new Error("connection refused"), { code: 111 }),
    ),
  );
});

Deno.test("isRetriableFetchError() ignores the Bun connection-refused message without the code", () => {
  assertFalse(
    isRetriableFetchError(
      new TypeError(
        "Unable to connect. Is the computer able to access the url?",
      ),
    ),
  );
});

Deno.test("isRetriableFetchError() returns true for browser failed-fetch TypeErrors", () => {
  const messages = [
    "Failed to fetch",
    "NetworkError when attempting to fetch resource.",
    "Load failed",
  ];
  for (const message of messages) {
    assert(isRetriableFetchError(new TypeError(message)), message);
  }
});

Deno.test("isRetriableFetchError() returns false for Deno policy fetch TypeErrors", () => {
  assertFalse(
    isRetriableFetchError(
      new TypeError("Fetch failed: Requests to port 6000 are blocked"),
    ),
  );
});

Deno.test("isRetriableFetchError() follows nested cause chains", () => {
  const error = new Error("request failed", {
    cause: new Error("wrapped", { cause: new TypeError("fetch failed") }),
  });
  assert(isRetriableFetchError(error));
});

Deno.test("isRetriableFetchError() terminates on a cyclic cause chain", () => {
  const a = new Error("a");
  const b = new Error("b", { cause: a });
  a.cause = b;
  assertFalse(isRetriableFetchError(a));
});

Deno.test("isRetriableFetchError() examines at most 8 objects along the cause chain", () => {
  const buildChain = (wrappers: number): Error => {
    let error: Error = new TypeError("fetch failed");
    for (let i = 0; i < wrappers; i++) {
      error = new Error(`wrapper ${i}`, { cause: error });
    }
    return error;
  };
  assert(isRetriableFetchError(buildChain(7)));
  assertFalse(isRetriableFetchError(buildChain(8)));
});

Deno.test("isRetriableFetchError() returns false for non-error values", () => {
  assertFalse(isRetriableFetchError("fetch failed"));
  assertFalse(isRetriableFetchError(null));
  assertFalse(isRetriableFetchError(undefined));
  assertFalse(isRetriableFetchError(503));
  assertFalse(isRetriableFetchError({ status: 503 }));
});
