// Copyright 2018-2026 the Deno authors. MIT license.
/**
 * Provides user-friendly {@linkcode serve} on top of Deno's native HTTP server
 * and other utilities for creating HTTP servers and clients.
 *
 * ## File Server
 *
 * A small program for serving local files over HTTP.
 *
 * ```sh
 * deno run --allow-net --allow-read jsr:@std/http/file-server
 * Listening on:
 * - Local: http://localhost:8000
 * ```
 *
 * When the `--allow-sys=networkInterfaces` permission is provided, the file
 * server will also display the local area network addresses that can be used to
 * access the server.
 *
 * ## HTTP Status Code and Status Text
 *
 * Helper for processing status code and status text.
 *
 * ## HTTP errors
 *
 * Provides error classes for each HTTP error status code as well as utility
 * functions for handling HTTP errors in a structured way.
 *
 * ## Negotiation
 *
 * A set of functions which can be used to negotiate content types, encodings and
 * languages when responding to requests.
 *
 * > Note: some libraries include accept charset functionality by analyzing the
 * > `Accept-Charset` header. This is a legacy header that
 * > {@link https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/Accept-Charset | clients omit and servers should ignore}
 * > therefore is not provided.
 *
 * ## User agent handling
 *
 * The {@linkcode UserAgent} class provides user agent string parsing, allowing
 * a user agent flag to be semantically understood.
 *
 * For example to integrate the user agent provided in the header `User-Agent`
 * in an http request would look like this:
 *
 * ```ts ignore
 * import { UserAgent } from "@std/http/user-agent";
 *
 * Deno.serve((req) => {
 *   const userAgent = new UserAgent(req.headers.get("user-agent") ?? "");
 *   return new Response(`Hello, ${userAgent.browser.name}
 *     on ${userAgent.os.name} ${userAgent.os.version}!`);
 * });
 * ```
 *
 * ### Routing
 *
 * {@linkcode route} provides an easy way to route requests to different
 * handlers based on the request path and method.
 *
 * ```ts ignore
 * import { route, type Route } from "@std/http/unstable-route";
 * import { serveDir } from "@std/http/file-server";
 *
 * const routes: Route[] = [
 *   {
 *     pattern: new URLPattern({ pathname: "/about" }),
 *     handler: () => new Response("About page"),
 *   },
 *   {
 *     pattern: new URLPattern({ pathname: "/users/:id" }),
 *     handler: (_req, _info, params) => new Response(params?.pathname.groups.id),
 *   },
 *   {
 *     pattern: new URLPattern({ pathname: "/static/*" }),
 *     handler: (req: Request) => serveDir(req)
 *   },
 *   {
 *     method: ["GET", "HEAD"],
 *     pattern: new URLPattern({ pathname: "/api" }),
 *     handler: (req: Request) => new Response(req.method === 'HEAD' ? null : 'ok'),
 *   },
 * ];
 *
 * function defaultHandler(_req: Request) {
 *   return new Response("Not found", { status: 404 });
 * }
 *
 * Deno.serve(route(routes, defaultHandler));
 * ```
 *
 * @module
 */

export * from "./cookie.ts";
export * from "./etag.ts";
export * from "./status.ts";
export * from "./negotiation.ts";
export * from "./server_sent_event_stream.ts";
export * from "./server_sent_event_parse_stream.ts";
export * from "./user_agent.ts";
export * from "./file_server.ts";
