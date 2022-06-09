// Copyright 2018-2022 the Deno authors. All rights reserved. MIT license.
// @generated file from build script, do not edit
// deno-lint-ignore-file
let wasm;

let cachedInt32Memory0;
function getInt32Memory0() {
  if (cachedInt32Memory0.byteLength === 0) {
    cachedInt32Memory0 = new Int32Array(wasm.memory.buffer);
  }
  return cachedInt32Memory0;
}

let cachedUint8Memory0;
function getUint8Memory0() {
  if (cachedUint8Memory0.byteLength === 0) {
    cachedUint8Memory0 = new Uint8Array(wasm.memory.buffer);
  }
  return cachedUint8Memory0;
}

function getArrayU8FromWasm0(ptr, len) {
  return getUint8Memory0().subarray(ptr / 1, ptr / 1 + len);
}
/**
 * @param {number} val
 * @returns {Uint8Array}
 */
export function encode_u32(val) {
  try {
    const retptr = wasm.__wbindgen_add_to_stack_pointer(-16);
    wasm.encode_u32(retptr, val);
    var r0 = getInt32Memory0()[retptr / 4 + 0];
    var r1 = getInt32Memory0()[retptr / 4 + 1];
    var v0 = getArrayU8FromWasm0(r0, r1).slice();
    wasm.__wbindgen_free(r0, r1 * 1);
    return v0;
  } finally {
    wasm.__wbindgen_add_to_stack_pointer(16);
  }
}

const u32CvtShim = new Uint32Array(2);

const uint64CvtShim = new BigUint64Array(u32CvtShim.buffer);
/**
 * @param {BigInt} val
 * @returns {Uint8Array}
 */
export function encode_u64(val) {
  try {
    const retptr = wasm.__wbindgen_add_to_stack_pointer(-16);
    uint64CvtShim[0] = val;
    const low0 = u32CvtShim[0];
    const high0 = u32CvtShim[1];
    wasm.encode_u64(retptr, low0, high0);
    var r0 = getInt32Memory0()[retptr / 4 + 0];
    var r1 = getInt32Memory0()[retptr / 4 + 1];
    var v1 = getArrayU8FromWasm0(r0, r1).slice();
    wasm.__wbindgen_free(r0, r1 * 1);
    return v1;
  } finally {
    wasm.__wbindgen_add_to_stack_pointer(16);
  }
}

let WASM_VECTOR_LEN = 0;

function passArray8ToWasm0(arg, malloc) {
  const ptr = malloc(arg.length * 1);
  getUint8Memory0().set(arg, ptr / 1);
  WASM_VECTOR_LEN = arg.length;
  return ptr;
}
/**
 * @param {Uint8Array} buff
 * @returns {number}
 */
export function decode_u32(buff) {
  const ptr0 = passArray8ToWasm0(buff, wasm.__wbindgen_malloc);
  const len0 = WASM_VECTOR_LEN;
  const ret = wasm.decode_u32(ptr0, len0);
  return ret >>> 0;
}

/**
 * @param {Uint8Array} buff
 * @returns {BigInt}
 */
export function decode_u64(buff) {
  try {
    const retptr = wasm.__wbindgen_add_to_stack_pointer(-16);
    const ptr0 = passArray8ToWasm0(buff, wasm.__wbindgen_malloc);
    const len0 = WASM_VECTOR_LEN;
    wasm.decode_u64(retptr, ptr0, len0);
    var r0 = getInt32Memory0()[retptr / 4 + 0];
    var r1 = getInt32Memory0()[retptr / 4 + 1];
    u32CvtShim[0] = r0;
    u32CvtShim[1] = r1;
    const n1 = uint64CvtShim[0];
    return n1;
  } finally {
    wasm.__wbindgen_add_to_stack_pointer(16);
  }
}

const imports = {
  __wbindgen_placeholder__: {},
};

/** Instantiates an instance of the Wasm module returning its functions.
 * @remarks It is safe to call this multiple times and once successfully
 * loaded it will always return a reference to the same object.
 */
export function instantiate() {
  return instantiateWithInstance().exports;
}

let instanceWithExports;

/** Instantiates an instance of the Wasm module along with its exports.
 * @remarks It is safe to call this multiple times and once successfully
 * loaded it will always return a reference to the same object.
 * @returns {{
 *   instance: WebAssembly.Instance;
 *   exports: { encode_u32: typeof encode_u32; encode_u64: typeof encode_u64; decode_u32: typeof decode_u32; decode_u64: typeof decode_u64 }
 * }}
 */
export function instantiateWithInstance() {
  if (instanceWithExports == null) {
    const instance = instantiateInstance();
    wasm = instance.exports;
    cachedInt32Memory0 = new Int32Array(wasm.memory.buffer);
    cachedUint8Memory0 = new Uint8Array(wasm.memory.buffer);
    instanceWithExports = {
      instance,
      exports: { encode_u32, encode_u64, decode_u32, decode_u64 },
    };
  }
  return instanceWithExports;
}

/** Gets if the Wasm module has been instantiated. */
export function isInstantiated() {
  return instanceWithExports != null;
}

function instantiateInstance() {
  const wasmBytes = base64decode(
"\
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\
Yy9yYXdfdmVjLnJzY2FwYWNpdHkgb3ZlcmZsb3cAAAAAABAAHAAAADICAAAFAAAAAwAAAAAAAAABAA\
AABAAAAGluZGV4IG91dCBvZiBib3VuZHM6IHRoZSBsZW4gaXMgIGJ1dCB0aGUgaW5kZXggaXMgAABQ\
ABAAIAAAAHAAEAASAAAAMDAwMTAyMDMwNDA1MDYwNzA4MDkxMDExMTIxMzE0MTUxNjE3MTgxOTIwMj\
EyMjIzMjQyNTI2MjcyODI5MzAzMTMyMzMzNDM1MzYzNzM4Mzk0MDQxNDI0MzQ0NDU0NjQ3NDg0OTUw\
NTE1MjUzNTQ1NTU2NTc1ODU5NjA2MTYyNjM2NDY1NjY2NzY4Njk3MDcxNzI3Mzc0NzU3Njc3Nzg3OT\
gwODE4MjgzODQ4NTg2ODc4ODg5OTA5MTkyOTM5NDk1OTY5Nzk4OTlzcmMvbGliLnJzAABcARAACgAA\
ACMAAAAQAAAAY2FsbGVkIGBPcHRpb246OnVud3JhcCgpYCBvbiBhIGBOb25lYCB2YWx1ZWxpYnJhcn\
kvc3RkL3NyYy9wYW5pY2tpbmcucnMAowEQABwAAAAEAgAAHgAAAAQAAAAAAAAAANqKgIAABG5hbWUB\
z4qAgAAeADpkbG1hbGxvYzo6ZGxtYWxsb2M6OkRsbWFsbG9jPEE+OjptYWxsb2M6OmgyYTI3MjA3ZW\
U5YWY3ZmU5AThkbG1hbGxvYzo6ZGxtYWxsb2M6OkRsbWFsbG9jPEE+OjpmcmVlOjpoY2I3OTQ3YTlh\
N2UyODJjYQJBZGxtYWxsb2M6OmRsbWFsbG9jOjpEbG1hbGxvYzxBPjo6ZGlzcG9zZV9jaHVuazo6aD\
JmOTBiZGRmYWI5ZmRhZjkDDl9fcnVzdF9yZWFsbG9jBE5jb3JlOjpmbXQ6Om51bTo6aW1wOjo8aW1w\
bCBjb3JlOjpmbXQ6OkRpc3BsYXkgZm9yIHUzMj46OmZtdDo6aDA0NmVjYzVlYWFiMzRjZDUFMGRsbW\
FsbG9jOjpEbG1hbGxvYzxBPjo6bWFsbG9jOjpoMTg5ZmJjYTAzNzNhYjgyOAYKZW5jb2RlX3U2NAcK\
ZW5jb2RlX3UzMggGbWVtY3B5CU5hbGxvYzo6cmF3X3ZlYzo6UmF3VmVjPFQsQT46OnJlc2VydmU6Om\
RvX3Jlc2VydmVfYW5kX2hhbmRsZTo6aDhkMzQyNTFmMDQ4ODlkYzQKLmFsbG9jOjpyYXdfdmVjOjpm\
aW5pc2hfZ3Jvdzo6aGYyM2E3ODg0OWY0OTkyMjcLCmRlY29kZV91NjQMCmRlY29kZV91MzINNmNvcm\
U6OnBhbmlja2luZzo6cGFuaWNfYm91bmRzX2NoZWNrOjpoY2UwNTAyZjYzNzExZmFkOA43c3RkOjpw\
YW5pY2tpbmc6OnJ1c3RfcGFuaWNfd2l0aF9ob29rOjpoNjA2ZDdjN2Y3YTQyM2I5OA9DY29yZTo6Zm\
10OjpGb3JtYXR0ZXI6OnBhZF9pbnRlZ3JhbDo6d3JpdGVfcHJlZml4OjpoYWEwYWRmMDBjYjY3ZGVk\
NxApY29yZTo6cGFuaWNraW5nOjpwYW5pYzo6aGVjMWZjMDU3YmQwYmFmMGIREV9fd2JpbmRnZW5fbW\
FsbG9jEi1jb3JlOjpwYW5pY2tpbmc6OnBhbmljX2ZtdDo6aDYzMTRiNWM5MWFiZTczNDkTQ3N0ZDo6\
cGFuaWNraW5nOjpiZWdpbl9wYW5pY19oYW5kbGVyOjp7e2Nsb3N1cmV9fTo6aDliOTg1YTI5M2FhYz\
RjZTEUMmNvcmU6Om9wdGlvbjo6T3B0aW9uPFQ+Ojp1bndyYXA6Omg1YTdkZjkxYjVkNjA5MGNiFRFy\
dXN0X2JlZ2luX3Vud2luZBYPX193YmluZGdlbl9mcmVlFzRhbGxvYzo6cmF3X3ZlYzo6Y2FwYWNpdH\
lfb3ZlcmZsb3c6Omg0YjQ5MDE0ODMwY2FmZTYzGB9fX3diaW5kZ2VuX2FkZF90b19zdGFja19wb2lu\
dGVyGUlzdGQ6OnN5c19jb21tb246OmJhY2t0cmFjZTo6X19ydXN0X2VuZF9zaG9ydF9iYWNrdHJhY2\
U6OmhhMDNhYmVmMDJhOGI3MGZkGjE8VCBhcyBjb3JlOjphbnk6OkFueT46OnR5cGVfaWQ6OmhhMGM0\
NDkyMjE2ZDRkMmU3GwpydXN0X3BhbmljHDdzdGQ6OmFsbG9jOjpkZWZhdWx0X2FsbG9jX2Vycm9yX2\
hvb2s6OmhmOWMzOTNiYTNjZDI4N2UxHW9jb3JlOjpwdHI6OmRyb3BfaW5fcGxhY2U8JmNvcmU6Oml0\
ZXI6OmFkYXB0ZXJzOjpjb3BpZWQ6OkNvcGllZDxjb3JlOjpzbGljZTo6aXRlcjo6SXRlcjx1OD4+Pj\
o6aDYzYzJlMTQ5N2I1MmYzZDcA+4CAgAAJcHJvZHVjZXJzAghsYW5ndWFnZQEEUnVzdAAMcHJvY2Vz\
c2VkLWJ5AwVydXN0Yx0xLjU3LjAgKGYxZWRkMDQyOSAyMDIxLTExLTI5KQZ3YWxydXMGMC4xOS4wDH\
dhc20tYmluZGdlbhIwLjIuODAgKDlhNmU3N2Y1ZSk=\
",
  );
  const wasmModule = new WebAssembly.Module(wasmBytes);
  return new WebAssembly.Instance(wasmModule, imports);
}

function base64decode(b64) {
  const binString = atob(b64);
  const size = binString.length;
  const bytes = new Uint8Array(size);
  for (let i = 0; i < size; i++) {
    bytes[i] = binString.charCodeAt(i);
  }
  return bytes;
}
