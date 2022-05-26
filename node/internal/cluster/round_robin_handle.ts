// Copyright 2018-2022 the Deno authors. All rights reserved. MIT license.
// Copyright Joyent, Inc. and Node.js contributors. All rights reserved. MIT license.

import assert from "../assert.mjs";
import { createServer, Server } from "../../net.ts";
import { sendHelper } from "./utils.ts";
import { constants } from "../../internal_binding/tcp_wrap.ts";
import type { Message } from "./types.ts";
import type { Worker } from "./types.ts";
import { append, init, isEmpty, peek, remove } from "../linkedlist.mjs";

export class RoundRobinHandle {
  key: string;
  all: Map<number, Worker>;
  free: Map<number, Worker>;
  // deno-lint-ignore no-explicit-any
  handle: any = null;
  // deno-lint-ignore no-explicit-any
  handles: any;
  server: Server | null;

  constructor(
    key: string,
    address: string,
    { port, fd, flags, backlog }: Message,
  ) {
    this.key = key;
    this.all = new Map();
    this.free = new Map();
    this.handles = init(Object.create(null));
    this.handle = null;
    this.server = createServer(assert.fail);

    if (fd! >= 0) {
      this.server.listen({ fd, backlog });
    } else if (port! >= 0) {
      this.server.listen({
        port,
        host: address,
        // Currently, net module only supports `ipv6Only` option in `flags`.
        ipv6Only: Boolean(flags! & constants.UV_TCP_IPV6ONLY),
        backlog,
      });
    } else {
      this.server.listen(address, backlog); // UNIX socket path.
    }

    this.server.once("listening", () => {
      this.handle = this.server!._handle;
      // deno-lint-ignore no-explicit-any
      this.handle.onconnection = (err: unknown, handle: any) =>
        this.distribute(err, handle);
      this.server!._handle = null;
      this.server = null;
    });
  }

  add(
    worker: Worker,
    send: (
      errno: number | null,
      reply: Record<string, unknown> | null,
      // deno-lint-ignore no-explicit-any
      handle: any,
    ) => void,
  ) {
    assert(this.all.has(worker.id) === false);
    this.all.set(worker.id, worker);

    const done = () => {
      if (this.handle.getsockname) {
        const out = {};
        this.handle.getsockname(out);
        send(null, { sockname: out }, null);
      } else {
        send(null, null, null); // UNIX socket.
      }

      this.handoff(worker); // In case there are connections pending.
    };

    if (this.server === null) {
      return done();
    }

    // Still busy binding.
    this.server.once("listening", done);
    this.server.once("error", (err) => {
      send(err.errno, null, null);
    });
  }

  remove(worker: Worker) {
    const existed = this.all.delete(worker.id);

    if (!existed) {
      return false;
    }

    this.free.delete(worker.id);

    if (this.all.size !== 0) {
      return false;
    }

    while (!isEmpty(this.handles)) {
      const handle = peek(this.handles);
      handle.close();
      remove(handle);
    }

    this.handle.close();
    this.handle = null;

    return true;
  }

  // deno-lint-ignore no-explicit-any
  distribute(_err: unknown, handle: any) {
    append(this.handles, handle);
    // eslint-disable-next-line node-core/no-array-destructuring
    const [workerEntry] = this.free; // this.free is a Map

    if (Array.isArray(workerEntry)) {
      const { 0: workerId, 1: worker } = workerEntry;
      this.free.delete(workerId);
      this.handoff(worker);
    }
  }

  handoff(worker: Worker) {
    if (!this.all.has(worker.id)) {
      return; // Worker is closing (or has closed) the server.
    }

    const handle = peek(this.handles);

    if (handle === null) {
      this.free.set(worker.id, worker); // Add to ready queue again.

      return;
    }

    remove(handle);

    const message = { act: "newconn", key: this.key };

    // deno-lint-ignore no-explicit-any
    sendHelper(worker.process, message, handle, (reply: any) => {
      if (reply.accepted) {
        handle.close();
      } else {
        this.distribute(0, handle); // Worker is shutting down. Send to another.
      }

      this.handoff(worker);
    });
  }
}

export default RoundRobinHandle;
