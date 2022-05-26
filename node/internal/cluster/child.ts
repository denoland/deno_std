// Copyright 2018-2022 the Deno authors. All rights reserved. MIT license.
// Copyright Joyent, Inc. and Node.js contributors. All rights reserved. MIT license.

import assert from "../assert.mjs";
import path from "../../path.ts";
import EventEmitter from "../../events.ts";
import { ownerSymbol } from "../async_hooks.ts";
import Worker from "./worker.ts";
import { internal, sendHelper } from "./utils.ts";
import process from "../../process.ts";
import type {
  Cluster as ICluster,
  Message,
  Worker as IWorker,
  WorkerClass,
} from "./types.ts";
import { Server } from "../../net.ts";
import type { AddressInfo } from "../../net.ts";
import { Socket } from "../../dgram.ts";
import type { Handle } from "../../net.ts";
import type { TCP } from "../../internal_binding/tcp_wrap.ts";
import type { UDP } from "../../internal_binding/udp_wrap.ts";

const cluster: ICluster = new EventEmitter() as ICluster;
const handles = new Map();
const indexes = new Map();

const noop = Function.prototype;

(cluster.isWorker as boolean) = true;
(cluster.isMaster as boolean) = false; // Deprecated alias. Must be same as isPrimary.
(cluster.isPrimary as boolean) = false;
(cluster.worker as null) = null;
(cluster.Worker as WorkerClass) = Worker;

// deno-lint-ignore no-explicit-any
(cluster as any)._setupWorker = function () {
  const worker = new Worker({
    id: +process.env.NODE_UNIQUE_ID | 0,
    process,
    state: "online",
  });

  (cluster.worker as IWorker) = worker;

  process.once("disconnect", () => {
    worker.emit("disconnect");

    if (!worker.exitedAfterDisconnect) {
      // Unexpected disconnect, primary exited, or some such nastiness, so
      // worker exits immediately.
      process.exit(0);
    }
  });

  process.on("internalMessage", internal(worker, onmessage));
  send({ act: "online" });

  function onmessage(message: Message, handle: Handle | UDP) {
    if (message.act === "newconn") {
      onconnection(message, handle);
    } else if (message.act === "disconnect") {
      Reflect.apply(_disconnect, worker, [true]);
    }
  }
};

// `obj` is a net#Server or a dgram#Socket object.
// deno-lint-ignore no-explicit-any
(cluster as any)._getServer = function (
  obj: Server | Socket,
  options: {
    address?: string | null;
    port?: number | null;
    addressType?: string | null;
    fd?: number | null;
    flags: number | null;
  },
  cb: (err: number, handle: Handle | UDP | null) => void,
) {
  let address = options.address;

  // Resolve unix socket paths to absolute paths
  if (
    options.port! < 0 &&
    typeof address === "string" &&
    process.platform !== "win32"
  ) {
    address = path.resolve(address);
  }

  const indexesKey = [
    address,
    options.port,
    options.addressType,
    options.fd,
  ].join(":");

  let indexSet = indexes.get(indexesKey);

  if (indexSet === undefined) {
    indexSet = { nextIndex: 0, set: new Set() };
    indexes.set(indexesKey, indexSet);
  }

  const index = indexSet.nextIndex++;
  indexSet.set.add(index);

  const message = {
    act: "queryServer",
    index,
    data: null,
    ...options,
  };

  message.address = address;

  // Set custom data on handle (i.e. tls tickets key)
  // deno-lint-ignore no-explicit-any
  if ((obj as any)._getServerData) {
    // deno-lint-ignore no-explicit-any
    message.data = (obj as any)._getServerData();
  }

  send(
    message,
    (reply: Record<string, unknown> | null, handle: Handle | UDP) => {
      // deno-lint-ignore no-explicit-any
      if (typeof (obj as any)._setServerData === "function") {
        // deno-lint-ignore no-explicit-any
        (obj as any)._setServerData(reply!.data);
      }

      if (handle) {
        // Shared listen socket
        shared(reply!, { handle, indexesKey, index }, cb);
      } else {
        // Round-robin.
        rr(reply!, { indexesKey, index }, cb);
      }
    },
  );

  obj.once("listening", () => {
    cluster.worker!.state = "listening";
    const address = obj.address();
    message.act = "listening";
    message.port = (address && (address as AddressInfo).port) || options.port;
    send(message);
  });
};

function removeIndexesKey(indexesKey: string, index: number) {
  const indexSet = indexes.get(indexesKey);

  if (!indexSet) {
    return;
  }

  indexSet.set.delete(index);

  if (indexSet.set.size === 0) {
    indexes.delete(indexesKey);
  }
}

// Shared listen socket.
function shared(
  message: Message,
  {
    handle,
    indexesKey,
    index,
  }: { handle: Handle | UDP; indexesKey: string; index: number },
  cb: (errno: number, handle: Handle | UDP) => void,
) {
  const key = message.key;
  // Monkey-patch the close() method so we can keep track of when it's
  // closed. Avoids resource leaks when the handle is short-lived.
  const close = handle.close;

  handle.close = function () {
    send({ act: "close", key });
    handles.delete(key);
    removeIndexesKey(indexesKey, index);

    return Reflect.apply(close, handle, arguments);
  };

  assert(handles.has(key) === false);
  handles.set(key, handle);
  cb(message.errno, handle);
}

// Round-robin. Master distributes handles across workers.
function rr(
  message: Message,
  { indexesKey, index }: { indexesKey: string; index: number },
  cb: (errno: number, handle: Handle | UDP | null) => void,
) {
  if (message.errno) {
    return cb(message.errno, null);
  }

  let key = message.key;

  function listen(_backlog: number) {
    return 0;
  }

  function close() {
    // lib/net.js treats server._handle.close() as effectively synchronous.
    // That means there is a time window between the call to close() and
    // the ack by the primary process in which we can still receive handles.
    // onconnection() below handles that by sending those handles back to
    // the primary.
    if (key === undefined) {
      return;
    }

    send({ act: "close", key });
    handles.delete(key);
    removeIndexesKey(indexesKey, index);
    key = undefined;
  }

  // deno-lint-ignore no-explicit-any
  function getsockname(out: any) {
    if (key) {
      Object.assign(out, message.sockname);
    }

    return 0;
  }

  // Faux handle. Mimics a TCPWrap with just enough fidelity to get away
  // with it. Fools net.Server into thinking that it's backed by a real
  // handle. Use a noop function for ref() and unref() because the control
  // channel is going to keep the worker alive anyway.
  const handle: TCP = {
    close,
    listen,
    ref: noop as () => void,
    unref: noop as () => void,
  } as TCP;

  if (message.sockname) {
    handle.getsockname = getsockname; // TCP handles only.
  }

  assert(handles.has(key) === false);
  handles.set(key, handle);
  cb(0, handle);
}

// Round-robin connection.
function onconnection(message: Message, handle: Handle | UDP) {
  const key = message.key;
  const server = handles.get(key);
  const accepted = server !== undefined;

  send({ ack: message.seq, accepted });

  if (accepted) {
    server.onconnection(0, handle);
  }
}

function send(message: Message, cb?: unknown) {
  return sendHelper(process, message, null, cb);
}

function _disconnect(this: IWorker, primaryInitiated: boolean) {
  this.exitedAfterDisconnect = true;
  let waitingCount = 1;

  function checkWaitingCount() {
    waitingCount--;

    if (waitingCount === 0) {
      // If disconnect is worker initiated, wait for ack to be sure
      // exitedAfterDisconnect is properly set in the primary, otherwise, if
      // it's primary initiated there's no need to send the
      // exitedAfterDisconnect message
      if (primaryInitiated) {
        // TODO(cmorten): remove type cast once process interface is completed.
        // deno-lint-ignore no-explicit-any
        (process as any).disconnect();
      } else {
        send({ act: "exitedAfterDisconnect" }, () =>
          // TODO(cmorten): remove type cast once process interface is completed.
          // deno-lint-ignore no-explicit-any
          (process as any).disconnect());
      }
    }
  }

  handles.forEach((handle) => {
    waitingCount++;

    if (handle[ownerSymbol]) {
      handle[ownerSymbol].close(checkWaitingCount);
    } else {
      handle.close(checkWaitingCount);
    }
  });

  handles.clear();
  checkWaitingCount();
}

// Extend generic Worker with methods specific to worker processes.
Worker.prototype.disconnect = function () {
  if (this.state !== "disconnecting" && this.state !== "destroying") {
    this.state = "disconnecting";
    Reflect.apply(_disconnect, this, []);
  }

  return this;
};

Worker.prototype.destroy = function () {
  if (this.state === "destroying") {
    return;
  }

  this.exitedAfterDisconnect = true;

  if (!this.isConnected()) {
    process.exit(0);
  } else {
    this.state = "destroying";
    // TODO(cmorten): remove type cast once process interface is completed.
    // deno-lint-ignore no-explicit-any
    send({ act: "exitedAfterDisconnect" }, () => (process as any).disconnect());
    process.once("disconnect", () => process.exit(0));
  }
};

export default cluster;
