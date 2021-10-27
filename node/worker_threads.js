import { resolve, toFileUrl } from "../path/mod.ts";
import { notImplemented } from "./_utils.ts";
import { EventEmitter, once } from "./events.ts";

let environmentData = new Map();
let threads = 0;

const kHandle = Symbol("kHandle");
class _Worker extends EventEmitter {
  #threadId;
  #resourceLimits = {
    maxYoungGenerationSizeMb: -1,
    maxOldGenerationSizeMb: -1,
    codeRangeSizeMb: -1,
    stackSizeMb: 4,
  };
  [kHandle];

  postMessage;

  constructor(specifier, options) {
    super();
    if (options?.eval === true) {
      specifier = `data:text/javascript,${specifier}`;
    } else if (typeof specifier === "string") {
      specifier = toFileUrl(resolve(specifier));
    }
    const handle = this[kHandle] = new Worker(
      specifier,
      {
        ...(options || {}),
        type: "module",
        // unstable
        deno: { namespace: true },
      },
    );
    handle.addEventListener(
      "error",
      (event) => this.emit("error", event.error || event.message),
    );
    handle.addEventListener(
      "messageerror",
      (event) => this.emit("messageerror", event.data),
    );
    handle.addEventListener(
      "message",
      (event) => this.emit("message", event.data),
    );
    handle.postMessage({
      environmentData,
      threadId: (this.threadId = ++threads),
      workerData: options?.workerData,
    }, options?.transferList || []);
    this.postMessage = handle.postMessage.bind(handle);
    this.emit("online");
  }

  terminate() {
    this[kHandle].terminate();
    this.emit("exit", 0);
  }

  getHeapSnapshot = notImplemented;
  // fake performance
  performance = globalThis.performance;
}

export const isMainThread = typeof DedicatedWorkerGlobalScope === "undefined" ||
  self instanceof DedicatedWorkerGlobalScope === false;

// fake resourceLimits
export const resourceLimits = isMainThread ? {} : {
  maxYoungGenerationSizeMb: 48,
  maxOldGenerationSizeMb: 2048,
  codeRangeSizeMb: 0,
  stackSizeMb: 4,
};

let threadId = 0;
let workerData = null;

let parentPort = null;

if (!isMainThread) {
  const listeners = new WeakMap();

  parentPort = self;
  parentPort.off = parentPort.removeListener = function (
    name,
    listener,
  ) {
    this.removeEventListener(name, listeners.get(listener));
    listeners.delete(listener);
    return this;
  };
  parentPort.on = parentPort.addListener = function (
    name,
    listener,
  ) {
    const _listener = (ev) => listener(ev.data);
    listeners.set(listener, _listener);
    this.addEventListener(name, _listener);
    return this;
  };
  parentPort.once = function (name, listener) {
    const _listener = (ev) => listener(ev.data);
    listeners.set(listener, _listener);
    this.addEventListener(name, _listener);
    return this;
  };

  // mocks
  parentPort.setMaxListeners = () => {};
  parentPort.getMaxListeners = () => Infinity;
  parentPort.eventNames = () => [""];
  parentPort.listenerCount = () => 0;

  parentPort.emit = () => notImplemented();
  parentPort.removeAllListeners = () => notImplemented();

  [{ threadId, workerData, environmentData }] = await once(
    parentPort,
    "message",
  );

  // alias
  parentPort.addEventListener("offline", () => {
    parentPort.emit("close");
  });
}

export function getEnvironmentData(key) {
  return environmentData.get(key);
}

export function setEnvironmentData(key, value) {
  if (value === undefined) {
    environmentData.delete(key);
  } else {
    environmentData.set(key, value);
  }
}

const _MessagePort = globalThis.MessagePort;
const _MessageChannel = globalThis.MessageChannel;
export const BroadcastChannel = globalThis.BroadcastChannel;
export const SHARE_ENV = Symbol.for("nodejs.worker_threads.SHARE_ENV");
export {
  _MessageChannel as MessageChannel,
  _MessagePort as MessagePort,
  _Worker as Worker,
  notImplemented as markAsUntransferable,
  notImplemented as moveMessagePortToContext,
  notImplemented as receiveMessageOnPort,
  parentPort,
  threadId,
  workerData,
};

export default {
  markAsUntransferable: notImplemented,
  moveMessagePortToContext: notImplemented,
  receiveMessageOnPort: notImplemented,
  MessagePort: _MessagePort,
  MessageChannel: _MessageChannel,
  BroadcastChannel,
  Worker: _Worker,
  getEnvironmentData,
  setEnvironmentData,
  SHARE_ENV,
  threadId,
  workerData,
  resourceLimits,
  parentPort,
  isMainThread,
};
