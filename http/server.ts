// Copyright 2018-2019 the Deno authors. All rights reserved. MIT license.
const { listen, copy, toAsyncIterator } = Deno;
type Listener = Deno.Listener;
type Conn = Deno.Conn;
type Reader = Deno.Reader;
type Writer = Deno.Writer;
import { BufReader, BufState, BufWriter } from "../io/bufio.ts";
import { TextProtoReader } from "../textproto/mod.ts";
import { STATUS_TEXT } from "./http_status.ts";
import { assert, fail } from "../testing/asserts.ts";
import { deferred, Deferred } from "../util/async.ts";

interface HttpConn extends Conn {
  // When read by a newly created request B, lastId is the id pointing to a previous
  // request A, such that we must wait for responses to A to complete before
  // writing B's response.
  lastPipelineId: number;
  pendingDeferredMap: Map<number, Deferred<void>>;
}

function createHttpConn(c: Conn): HttpConn {
  const httpConn = Object.assign(c, {
    lastPipelineId: 0,
    pendingDeferredMap: new Map()
  });

  const d = deferred();
  d.resolve(); // The first request is ready immediately.
  httpConn.pendingDeferredMap.set(0, d);

  return httpConn;
}

function bufWriter(w: Writer): BufWriter {
  if (w instanceof BufWriter) {
    return w;
  } else {
    return new BufWriter(w);
  }
}

export function setContentLength(r: Response): void {
  if (!r.headers) {
    r.headers = new Headers();
  }

  if (r.body) {
    if (!r.headers.has("content-length")) {
      if (r.body instanceof Uint8Array) {
        const bodyLength = r.body.byteLength;
        r.headers.append("Content-Length", bodyLength.toString());
      } else {
        r.headers.append("Transfer-Encoding", "chunked");
      }
    }
  }
}

async function writeChunkedBody(w: Writer, r: Reader): Promise<void> {
  const writer = bufWriter(w);
  const encoder = new TextEncoder();

  for await (const chunk of toAsyncIterator(r)) {
    if (chunk.byteLength <= 0) continue;
    const start = encoder.encode(`${chunk.byteLength.toString(16)}\r\n`);
    const end = encoder.encode("\r\n");
    await writer.write(start);
    await writer.write(chunk);
    await writer.write(end);
  }

  const endChunk = encoder.encode("0\r\n\r\n");
  await writer.write(endChunk);
}

export async function writeResponse(w: Writer, r: Response): Promise<void> {
  const protoMajor = 1;
  const protoMinor = 1;
  const statusCode = r.status || 200;
  const statusText = STATUS_TEXT.get(statusCode);
  const writer = bufWriter(w);
  if (!statusText) {
    throw Error("bad status code");
  }

  let out = `HTTP/${protoMajor}.${protoMinor} ${statusCode} ${statusText}\r\n`;

  setContentLength(r);

  if (r.headers) {
    for (const [key, value] of r.headers) {
      out += `${key}: ${value}\r\n`;
    }
  }
  out += "\r\n";

  const header = new TextEncoder().encode(out);
  let n = await writer.write(header);
  assert(header.byteLength == n);

  if (r.body) {
    if (r.body instanceof Uint8Array) {
      n = await writer.write(r.body);
      assert(r.body.byteLength == n);
    } else {
      if (r.headers.has("content-length")) {
        const bodyLength = parseInt(r.headers.get("content-length"));
        const n = await copy(writer, r.body);
        assert(n == bodyLength);
      } else {
        await writeChunkedBody(writer, r.body);
      }
    }
  }
  await writer.flush();
}

async function readAllIterator(
  it: AsyncIterableIterator<Uint8Array>
): Promise<Uint8Array> {
  const chunks = [];
  let len = 0;
  for await (const chunk of it) {
    chunks.push(chunk);
    len += chunk.length;
  }
  if (chunks.length === 0) {
    // No need for copy
    return chunks[0];
  }
  const collected = new Uint8Array(len);
  let offset = 0;
  for (let chunk of chunks) {
    collected.set(chunk, offset);
    offset += chunk.length;
  }
  return collected;
}

export class ServerRequest {
  pipelineId: number;
  url: string;
  method: string;
  proto: string;
  headers: Headers;
  conn: HttpConn;
  r: BufReader;
  w: BufWriter;

  public async *bodyStream(): AsyncIterableIterator<Uint8Array> {
    if (this.headers.has("content-length")) {
      const len = +this.headers.get("content-length");
      if (Number.isNaN(len)) {
        return new Uint8Array(0);
      }
      let buf = new Uint8Array(1024);
      let rr = await this.r.read(buf);
      let nread = rr.nread;
      while (!rr.eof && nread < len) {
        yield buf.subarray(0, rr.nread);
        buf = new Uint8Array(1024);
        rr = await this.r.read(buf);
        nread += rr.nread;
      }
      yield buf.subarray(0, rr.nread);
    } else {
      if (this.headers.has("transfer-encoding")) {
        const transferEncodings = this.headers
          .get("transfer-encoding")
          .split(",")
          .map((e): string => e.trim().toLowerCase());
        if (transferEncodings.includes("chunked")) {
          // Based on https://tools.ietf.org/html/rfc2616#section-19.4.6
          const tp = new TextProtoReader(this.r);
          let [line] = await tp.readLine();
          // TODO: handle chunk extension
          let [chunkSizeString] = line.split(";");
          let chunkSize = parseInt(chunkSizeString, 16);
          if (Number.isNaN(chunkSize) || chunkSize < 0) {
            throw new Error("Invalid chunk size");
          }
          while (chunkSize > 0) {
            let data = new Uint8Array(chunkSize);
            let [nread] = await this.r.readFull(data);
            if (nread !== chunkSize) {
              throw new Error("Chunk data does not match size");
            }
            yield data;
            await this.r.readLine(); // Consume \r\n
            [line] = await tp.readLine();
            chunkSize = parseInt(line, 16);
          }
          const [entityHeaders, err] = await tp.readMIMEHeader();
          if (!err) {
            for (let [k, v] of entityHeaders) {
              this.headers.set(k, v);
            }
          }
          /* Pseudo code from https://tools.ietf.org/html/rfc2616#section-19.4.6
          length := 0
          read chunk-size, chunk-extension (if any) and CRLF
          while (chunk-size > 0) {
            read chunk-data and CRLF
            append chunk-data to entity-body
            length := length + chunk-size
            read chunk-size and CRLF
          }
          read entity-header
          while (entity-header not empty) {
            append entity-header to existing header fields
            read entity-header
          }
          Content-Length := length
          Remove "chunked" from Transfer-Encoding
          */
          return; // Must return here to avoid fall through
        }
        // TODO: handle other transfer-encoding types
      }
      // Otherwise...
      yield new Uint8Array(0);
    }
  }

  // Read the body of the request into a single Uint8Array
  public async body(): Promise<Uint8Array> {
    return readAllIterator(this.bodyStream());
  }

  async respond(r: Response): Promise<void> {
    // Check and wait if the previous request is done responding.
    const lastPipelineId = this.pipelineId - 1;
    const lastPipelineDeferred = this.conn.pendingDeferredMap.get(
      lastPipelineId
    );
    assert(!!lastPipelineDeferred);
    await lastPipelineDeferred;
    // If yes, delete old deferred and proceed with writing.
    this.conn.pendingDeferredMap.delete(lastPipelineId);
    // Write our response!
    await writeResponse(this.w, r);
    // Signal the next pending request that it can start writing.
    const currPipelineDeferred = this.conn.pendingDeferredMap.get(
      this.pipelineId
    );
    assert(!!currPipelineDeferred);
    currPipelineDeferred.resolve();
  }
}

/** Continuously read more requests from conn until EOF
 * bufr is empty on a fresh TCP connection.
 * Would be passed around and reused for later request on same conn
 * TODO: make them async function after this change is done
 * https://github.com/tc39/ecma262/pull/1250
 * See https://v8.dev/blog/fast-async
 */
async function* iterateHttpRequests(
  conn: Conn
): AsyncIterableIterator<ServerRequest> {
  const httpConn = createHttpConn(conn);

  const bufr = new BufReader(httpConn);
  const bufw = new BufWriter(httpConn);
  const tp = new TextProtoReader(bufr);

  let bufStateErr: BufState;
  for (;;) {
    const req = new ServerRequest();

    // Set and incr pipeline id;
    req.pipelineId = ++httpConn.lastPipelineId;
    // Set a new pipeline deferred associated with this request
    // for future requests to wait for.
    httpConn.pendingDeferredMap.set(req.pipelineId, deferred());

    req.conn = httpConn;
    req.r = bufr;
    req.w = bufw;

    // First line: GET /index.html HTTP/1.0
    let firstLine: string;
    [firstLine, bufStateErr] = await tp.readLine();
    if (bufStateErr !== null) break;
    [req.method, req.url, req.proto] = firstLine.split(" ", 3);

    [req.headers, bufStateErr] = await tp.readMIMEHeader();
    if (bufStateErr !== null) break;

    yield req;
  }

  if (bufStateErr === "EOF") {
    // The connection was gracefully closed.
  } else if (bufStateErr instanceof Error) {
    // TODO(ry): send something back like a HTTP 500 status.
  } else {
    fail(`unexpected BufState: ${bufStateErr}`);
  }

  httpConn.close();
}

// The MuxAsyncIterator class multiplexes multiple async iterators into a
// single stream. It currently makes a few assumptions:
//   * The iterators do not throw.
//   * The final result (the value returned and not yielded from the iterator)
//     does not matter; if there is any, it is discarded.
//   * Adding an iterator while the multiplexer is blocked does not take
//     effect immediately.
interface WrappedIteratorResult<T> {
  iterator: AsyncIterableIterator<T>;
  result: IteratorResult<T>;
}
class MuxAsyncIterator<T> {
  private iteratorNextPromiseMap: Map<
    AsyncIterableIterator<T>,
    Promise<WrappedIteratorResult<T>>
  > = new Map();

  private async wrapIteratorNext(
    iterator: AsyncIterableIterator<T>
  ): Promise<WrappedIteratorResult<T>> {
    return { iterator, result: await iterator.next() };
  }

  add(iterator: AsyncIterableIterator<T>) {
    this.iteratorNextPromiseMap.set(iterator, this.wrapIteratorNext(iterator));
  }

  async next(): Promise<IteratorResult<T>> {
    while (this.iteratorNextPromiseMap.size > 0) {
      // Wait for the next iteration result of any of the iterators, whichever
      // yields first.
      const { iterator, result }: WrappedIteratorResult<T> = await Promise.race(
        this.iteratorNextPromiseMap.values()
      );
      assert(this.iteratorNextPromiseMap.has(iterator));

      if (result.done) {
        // The iterator that yielded is done, remove it from the map.
        this.iteratorNextPromiseMap.delete(iterator);
      } else {
        // The iterator has yielded a value. Call `next()` on it, wrap the
        // returned promise, and store it in the map.
        this.iteratorNextPromiseMap.set(
          iterator,
          this.wrapIteratorNext(iterator)
        );
        return result;
      }
    }

    // There are no iterators left in the multiplexer, so report we're done.
    return { value: null, done: true };
  }

  [Symbol.asyncIterator]() {
    return this;
  }
}

export class Server implements AsyncIterable<ServerRequest> {
  private closing = false;

  constructor(public listener: Listener) {}

  close(): void {
    this.closing = true;
    this.listener.close();
  }

  async *iterateRequestsOnNewConnection(
    mux: MuxAsyncIterator<ServerRequest>
  ): AsyncIterableIterator<ServerRequest> {
    if (this.closing) return;
    // Wait for a new connection.
    const conn = await this.listener.accept();
    // Try to accept another connection and add it to the multiplexer.
    mux.add(this.iterateRequestsOnNewConnection(mux));
    // Yield the requests that arrive on the just-accepted connection.
    yield* iterateHttpRequests(conn);
  }

  [Symbol.asyncIterator](): AsyncIterableIterator<ServerRequest> {
    const mux: MuxAsyncIterator<ServerRequest> = new MuxAsyncIterator();
    mux.add(this.iterateRequestsOnNewConnection(mux));
    return mux;
  }
}

export function serve(addr: string): Server {
  const listener = listen("tcp", addr);
  return new Server(listener);
}

export async function listenAndServe(
  addr: string,
  handler: (req: ServerRequest) => void
): Promise<void> {
  const server = serve(addr);

  for await (const request of server) {
    await handler(request);
  }
}

export interface Response {
  status?: number;
  headers?: Headers;
  body?: Uint8Array | Reader;
}
