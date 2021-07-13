// deno-lint-ignore-file
import wasmBinary from "./wasm_binary.ts";

let cachedTextDecoder = new TextDecoder("utf-8", {
  ignoreBOM: true,
  fatal: true,
});

cachedTextDecoder.decode();

let cachegetUint8Memory0 = null;
function getUint8Memory0() {
  if (
    cachegetUint8Memory0 === null ||
    cachegetUint8Memory0.buffer !== wasm.memory.buffer
  ) {
    cachegetUint8Memory0 = new Uint8Array(wasm.memory.buffer);
  }
  return cachegetUint8Memory0;
}

function getStringFromWasm0(ptr, len) {
  return cachedTextDecoder.decode(getUint8Memory0().subarray(ptr, ptr + len));
}

const heap = new Array(32).fill(undefined);

heap.push(undefined, null, true, false);

function getObject(idx) {
  return heap[idx];
}

let heap_next = heap.length;

function dropObject(idx) {
  if (idx < 36) return;
  heap[idx] = heap_next;
  heap_next = idx;
}

function takeObject(idx) {
  const ret = getObject(idx);
  dropObject(idx);
  return ret;
}

let WASM_VECTOR_LEN = 0;

let cachedTextEncoder = new TextEncoder("utf-8");

const encodeString = function (arg, view) {
  return cachedTextEncoder.encodeInto(arg, view);
};

function passStringToWasm0(arg, malloc, realloc) {
  if (realloc === undefined) {
    const buf = cachedTextEncoder.encode(arg);
    const ptr = malloc(buf.length);
    getUint8Memory0().subarray(ptr, ptr + buf.length).set(buf);
    WASM_VECTOR_LEN = buf.length;
    return ptr;
  }

  let len = arg.length;
  let ptr = malloc(len);

  const mem = getUint8Memory0();

  let offset = 0;

  for (; offset < len; offset++) {
    const code = arg.charCodeAt(offset);
    if (code > 0x7F) break;
    mem[ptr + offset] = code;
  }

  if (offset !== len) {
    if (offset !== 0) {
      arg = arg.slice(offset);
    }
    ptr = realloc(ptr, len, len = offset + arg.length * 3);
    const view = getUint8Memory0().subarray(ptr + offset, ptr + len);
    const ret = encodeString(arg, view);

    offset += ret.written;
  }

  WASM_VECTOR_LEN = offset;
  return ptr;
}

function passArray8ToWasm0(arg, malloc) {
  const ptr = malloc(arg.length * 1);
  getUint8Memory0().set(arg, ptr / 1);
  WASM_VECTOR_LEN = arg.length;
  return ptr;
}

function isLikeNone(x) {
  return x === undefined || x === null;
}

let cachegetInt32Memory0 = null;
function getInt32Memory0() {
  if (
    cachegetInt32Memory0 === null ||
    cachegetInt32Memory0.buffer !== wasm.memory.buffer
  ) {
    cachegetInt32Memory0 = new Int32Array(wasm.memory.buffer);
  }
  return cachegetInt32Memory0;
}

function getArrayU8FromWasm0(ptr, len) {
  return getUint8Memory0().subarray(ptr / 1, ptr / 1 + len);
}

function addHeapObject(obj) {
  if (heap_next === heap.length) heap.push(heap.length + 1);
  const idx = heap_next;
  heap_next = heap[idx];

  heap[idx] = obj;
  return idx;
}

const HasherFinalization = new FinalizationRegistry((ptr) =>
  wasm.__wbg_hasher_free(ptr)
);
/**
* A Hasher for any supported cryptographic hash algorithm, wrapping them in
* a common interface for our WASM use.
*/
export class Hasher {
  static __wrap(ptr) {
    const obj = Object.create(Hasher.prototype);
    obj.ptr = ptr;
    HasherFinalization.register(obj, obj.ptr, obj);
    return obj;
  }

  __destroy_into_raw() {
    const ptr = this.ptr;
    this.ptr = 0;
    HasherFinalization.unregister(this);
    return ptr;
  }

  free() {
    const ptr = this.__destroy_into_raw();
    wasm.__wbg_hasher_free(ptr);
  }
  /**
    * Creates a new hasher given a supported algorithm name.
    * @param {string} algorithm
    */
  constructor(algorithm) {
    var ptr0 = passStringToWasm0(
      algorithm,
      wasm.__wbindgen_malloc,
      wasm.__wbindgen_realloc,
    );
    var len0 = WASM_VECTOR_LEN;
    var ret = wasm.hasher_new(ptr0, len0);
    return Hasher.__wrap(ret);
  }
  /**
    * Resets this hasher to its initial (emtpy) state.
    */
  reset() {
    wasm.hasher_reset(this.ptr);
  }
  /**
    * Updates this hasher's sate with binary message data.
    * @param {Uint8Array} data
    */
  update(data) {
    var ptr0 = passArray8ToWasm0(data, wasm.__wbindgen_malloc);
    var len0 = WASM_VECTOR_LEN;
    wasm.hasher_update(this.ptr, ptr0, len0);
  }
  /**
    * Returns the binary digest of the hasher's current state. If the hash
    * algorithm being used is extensible, a length parameter may be provided,
    * otherwise it must be None.
    * @param {number | undefined} length
    * @returns {Uint8Array}
    */
  digest(length) {
    try {
      const retptr = wasm.__wbindgen_add_to_stack_pointer(-16);
      wasm.hasher_digest(
        retptr,
        this.ptr,
        !isLikeNone(length),
        isLikeNone(length) ? 0 : length,
      );
      var r0 = getInt32Memory0()[retptr / 4 + 0];
      var r1 = getInt32Memory0()[retptr / 4 + 1];
      var v0 = getArrayU8FromWasm0(r0, r1).slice();
      wasm.__wbindgen_free(r0, r1 * 1);
      return v0;
    } finally {
      wasm.__wbindgen_add_to_stack_pointer(16);
    }
  }
  /**
    * Returns the binary digest of the hasher's current state, then resets it
    * to its initial state. This can be a more efficient option if you're
    * going to be reusing this hasher instance.
    * @param {number | undefined} length
    * @returns {Uint8Array}
    */
  digestAndReset(length) {
    try {
      const retptr = wasm.__wbindgen_add_to_stack_pointer(-16);
      wasm.hasher_digestAndReset(
        retptr,
        this.ptr,
        !isLikeNone(length),
        isLikeNone(length) ? 0 : length,
      );
      var r0 = getInt32Memory0()[retptr / 4 + 0];
      var r1 = getInt32Memory0()[retptr / 4 + 1];
      var v0 = getArrayU8FromWasm0(r0, r1).slice();
      wasm.__wbindgen_free(r0, r1 * 1);
      return v0;
    } finally {
      wasm.__wbindgen_add_to_stack_pointer(16);
    }
  }
  /**
    * Returns a new hasher that's a copy of this one.
    * @returns {Hasher}
    */
  clone() {
    var ret = wasm.hasher_clone(this.ptr);
    return Hasher.__wrap(ret);
  }
}

const imports = {
  __wbindgen_placeholder__: {
    __wbg_new_3e1ee746fe308c9f: function (arg0, arg1) {
      var ret = new Error(getStringFromWasm0(arg0, arg1));
      return addHeapObject(ret);
    },
    __wbindgen_throw: function (arg0, arg1) {
      throw new Error(getStringFromWasm0(arg0, arg1));
    },
    __wbindgen_rethrow: function (arg0) {
      throw takeObject(arg0);
    },
  },
};

const wasmModule = new WebAssembly.Module(wasmBinary);
const wasmInstance = new WebAssembly.Instance(wasmModule, imports);
const wasm = wasmInstance.exports;

export const _wasm = wasm;
