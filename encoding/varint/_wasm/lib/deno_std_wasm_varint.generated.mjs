// @generated file from wasmbuild -- do not edit
// deno-lint-ignore-file
// deno-fmt-ignore-file
// source-hash: af20f8016433d2846e0f3c0999b2fbb7a648c299
let wasm;

let cachedInt32Memory0 = new Int32Array();

function getInt32Memory0() {
  if (cachedInt32Memory0.byteLength === 0) {
    cachedInt32Memory0 = new Int32Array(wasm.memory.buffer);
  }
  return cachedInt32Memory0;
}

let cachedUint8Memory0 = new Uint8Array();

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

/**
 * @param {bigint} val
 * @returns {Uint8Array}
 */
export function encode_u64(val) {
  try {
    const retptr = wasm.__wbindgen_add_to_stack_pointer(-16);
    wasm.encode_u64(retptr, val);
    var r0 = getInt32Memory0()[retptr / 4 + 0];
    var r1 = getInt32Memory0()[retptr / 4 + 1];
    var v0 = getArrayU8FromWasm0(r0, r1).slice();
    wasm.__wbindgen_free(r0, r1 * 1);
    return v0;
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
 * @returns {bigint}
 */
export function decode_u64(buff) {
  const ptr0 = passArray8ToWasm0(buff, wasm.__wbindgen_malloc);
  const len0 = WASM_VECTOR_LEN;
  const ret = wasm.decode_u64(ptr0, len0);
  return BigInt.asUintN(64, ret);
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
AGFzbQEAAAABvoCAgAALYAAAYAF/AGABfwF/YAF/AX5gAn9/AGACf38Bf2ACf38BfmADf39/AX9gBH\
9/f38AYAR/f39/AX9gAn9+AAOfgICAAB4CAQQFBQcEAQQKBAgFBgQBAAkABAEBAQIEAgcDAAEEhYCA\
gAABcAEEBAWDgICAAAEAEQaJgICAAAF/AUGAgMAACweGgYCAAAgGbWVtb3J5AgAKZW5jb2RlX3UzMg\
AICmVuY29kZV91NjQACQpkZWNvZGVfdTMyAAwKZGVjb2RlX3U2NAANH19fd2JpbmRnZW5fYWRkX3Rv\
X3N0YWNrX3BvaW50ZXIAGQ9fX3diaW5kZ2VuX2ZyZWUAGBFfX3diaW5kZ2VuX21hbGxvYwAXCYmAgI\
AAAQBBAQsDBB0bCojfgIAAHtgjAgh/AX4CQAJAAkACQAJAIABB9QFJDQBBACEBIABBzf97Tw0EIABB\
C2oiAEF4cSECQQAoAuSDQCIDRQ0DQQAhBAJAIAJBgAJJDQBBHyEEIAJB////B0sNACACQQYgAEEIdm\
ciAGt2QQFxIABBAXRrQT5qIQQLQQAgAmshAQJAIARBAnRB8IXAAGooAgAiAEUNAEEAIQUgAkEAQRkg\
BEEBdmtBH3EgBEEfRht0IQZBACEHA0ACQCAAKAIEQXhxIgggAkkNACAIIAJrIgggAU8NACAIIQEgAC\
EHIAgNAEEAIQEgACEHDAQLIABBFGooAgAiCCAFIAggACAGQR12QQRxakEQaigCACIARxsgBSAIGyEF\
IAZBAXQhBiAADQALAkAgBUUNACAFIQAMAwsgBw0DC0EAIQcgA0ECIAR0IgBBACAAa3JxIgBFDQMgAE\
EAIABrcWhBAnRB8IXAAGooAgAiAA0BDAMLAkACQAJAAkACQEEAKALgg0AiBkEQIABBC2pBeHEgAEEL\
SRsiAkEDdiIBdiIAQQNxDQAgAkEAKALwhkBNDQcgAA0BQQAoAuSDQCIARQ0HIABBACAAa3FoQQJ0Qf\
CFwABqKAIAIgcoAgRBeHEhAQJAIAcoAhAiAA0AIAdBFGooAgAhAAsgASACayEFAkAgAEUNAANAIAAo\
AgRBeHEgAmsiCCAFSSEGAkAgACgCECIBDQAgAEEUaigCACEBCyAIIAUgBhshBSAAIAcgBhshByABIQ\
AgAQ0ACwsgBygCGCEEIAcoAgwiASAHRw0CIAdBFEEQIAdBFGoiASgCACIGG2ooAgAiAA0DQQAhAQwE\
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\
QQAoAvCGQCACaiICNgLwhkAgACACQQFyNgIEIAAgAmogAjYCAAwBCyAFIAFBfnE2AgQgACACQQFyNg\
IEIAAgAmogAjYCAAJAIAJBgAJJDQAgACACEAYMAQsgAkF4cUHog8AAaiEBAkACQEEAKALgg0AiBUEB\
IAJBA3Z0IgJxRQ0AIAEoAgghAgwBC0EAIAUgAnI2AuCDQCABIQILIAEgADYCCCACIAA2AgwgACABNg\
IMIAAgAjYCCAsgBkEIag8LQQBB/x82AqCHQEEAIAg2AoyHQEEAIAY2AoiHQEEAQeiDwAA2AvSDQEEA\
QfCDwAA2AvyDQEEAQeiDwAA2AvCDQEEAQfiDwAA2AoSEQEEAQfCDwAA2AviDQEEAQYCEwAA2AoyEQE\
EAQfiDwAA2AoCEQEEAQYiEwAA2ApSEQEEAQYCEwAA2AoiEQEEAQZCEwAA2ApyEQEEAQYiEwAA2ApCE\
QEEAQZiEwAA2AqSEQEEAQZCEwAA2ApiEQEEAQaCEwAA2AqyEQEEAQZiEwAA2AqCEQEEAQQA2ApSHQE\
EAQaiEwAA2ArSEQEEAQaCEwAA2AqiEQEEAQaiEwAA2ArCEQEEAQbCEwAA2AryEQEEAQbCEwAA2AriE\
QEEAQbiEwAA2AsSEQEEAQbiEwAA2AsCEQEEAQcCEwAA2AsyEQEEAQcCEwAA2AsiEQEEAQciEwAA2At\
SEQEEAQciEwAA2AtCEQEEAQdCEwAA2AtyEQEEAQdCEwAA2AtiEQEEAQdiEwAA2AuSEQEEAQdiEwAA2\
AuCEQEEAQeCEwAA2AuyEQEEAQeCEwAA2AuiEQEEAQeiEwAA2AvSEQEEAQfCEwAA2AvyEQEEAQeiEwA\
A2AvCEQEEAQfiEwAA2AoSFQEEAQfCEwAA2AviEQEEAQYCFwAA2AoyFQEEAQfiEwAA2AoCFQEEAQYiF\
wAA2ApSFQEEAQYCFwAA2AoiFQEEAQZCFwAA2ApyFQEEAQYiFwAA2ApCFQEEAQZiFwAA2AqSFQEEAQZ\
CFwAA2ApiFQEEAQaCFwAA2AqyFQEEAQZiFwAA2AqCFQEEAQaiFwAA2ArSFQEEAQaCFwAA2AqiFQEEA\
QbCFwAA2AryFQEEAQaiFwAA2ArCFQEEAQbiFwAA2AsSFQEEAQbCFwAA2AriFQEEAQcCFwAA2AsyFQE\
EAQbiFwAA2AsCFQEEAQciFwAA2AtSFQEEAQcCFwAA2AsiFQEEAQdCFwAA2AtyFQEEAQciFwAA2AtCF\
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\
OgAYIAIgATYCFCACIAA2AhAgAkGogcAANgIMIAJBgIPAADYCCCACQQhqEBQACzkBAn8jAEEQayIBJA\
ACQCAAKAIIIgINABAQAAsgASAAKAIMNgIIIAEgADYCBCABIAI2AgAgARAWAAs9AQJ/IAAoAgAiAUEU\
aigCACECAkACQCABKAIEDgIAAAELIAINACAAKAIELQAQEA8ACyAAKAIELQAQEA8ACywBAX8jAEEQay\
IBJAAgAUEIaiAAQQhqKAIANgIAIAEgACkCADcDACABEBUACycAAkAgAEH8////B0sNAAJAIAANAEEE\
DwsgABAAIgBFDQAgAA8LAAsOAAJAIAFFDQAgABABCwsLACAAIwBqJAAjAAsKACAAIAEgAhAFCwwAQr\
iJz5eJxtH4TAsDAAALAgALC+KDgIAAAQBBgIDAAAvYA3NyY1xsaWIucnMAAAAAEAAKAAAAIwAAABAA\
AABsaWJyYXJ5L2FsbG9jL3NyYy9yYXdfdmVjLnJzY2FwYWNpdHkgb3ZlcmZsb3cAAAA4ABAAEQAAAB\
wAEAAcAAAABgIAAAUAAABpbmRleCBvdXQgb2YgYm91bmRzOiB0aGUgbGVuIGlzICBidXQgdGhlIGlu\
ZGV4IGlzIAAAZAAQACAAAACEABAAEgAAAAIAAAAAAAAAAQAAAAMAAAAwMDAxMDIwMzA0MDUwNjA3MD\
gwOTEwMTExMjEzMTQxNTE2MTcxODE5MjAyMTIyMjMyNDI1MjYyNzI4MjkzMDMxMzIzMzM0MzUzNjM3\
MzgzOTQwNDE0MjQzNDQ0NTQ2NDc0ODQ5NTA1MTUyNTM1NDU1NTY1NzU4NTk2MDYxNjI2MzY0NjU2Nj\
Y3Njg2OTcwNzE3MjczNzQ3NTc2Nzc3ODc5ODA4MTgyODM4NDg1ODY4Nzg4ODk5MDkxOTI5Mzk0OTU5\
Njk3OTg5OWNhbGxlZCBgT3B0aW9uOjp1bndyYXAoKWAgb24gYSBgTm9uZWAgdmFsdWVsaWJyYXJ5L3\
N0ZC9zcmMvcGFuaWNraW5nLnJzAKsBEAAcAAAARwIAAA8AAAAA8IqAgAAEbmFtZQHlioCAAB4AOmRs\
bWFsbG9jOjpkbG1hbGxvYzo6RGxtYWxsb2M8QT46Om1hbGxvYzo6aGE5NmZjZWZiYjQ0ZDZkYTUBOG\
RsbWFsbG9jOjpkbG1hbGxvYzo6RGxtYWxsb2M8QT46OmZyZWU6OmhhNDczN2I3Zjg0OTcwYWRkAkFk\
bG1hbGxvYzo6ZGxtYWxsb2M6OkRsbWFsbG9jPEE+OjpkaXNwb3NlX2NodW5rOjpoM2I2YzRlNzRmYT\
hhYTA0YgMOX19ydXN0X3JlYWxsb2METmNvcmU6OmZtdDo6bnVtOjppbXA6OjxpbXBsIGNvcmU6OmZt\
dDo6RGlzcGxheSBmb3IgdTMyPjo6Zm10OjpoYzUwYTFjOWI4MmViNDQ0NgUxY29tcGlsZXJfYnVpbH\
RpbnM6Om1lbTo6bWVtY3B5OjpoNDVlYjUzNjAxZDlkNmJmMAZGZGxtYWxsb2M6OmRsbWFsbG9jOjpE\
bG1hbGxvYzxBPjo6aW5zZXJ0X2xhcmdlX2NodW5rOjpoYjEyOTkwZjkyNTM4ZmJiZgdGZGxtYWxsb2\
M6OmRsbWFsbG9jOjpEbG1hbGxvYzxBPjo6dW5saW5rX2xhcmdlX2NodW5rOjpoYmU4ZDM2YTlmNDA2\
MGNlZQgKZW5jb2RlX3UzMgkKZW5jb2RlX3U2NApAYWxsb2M6OnJhd192ZWM6OlJhd1ZlYzxULEE+Oj\
pyZXNlcnZlX2Zvcl9wdXNoOjpoNzdjMDBlNDFkZDhkNThlMwsuYWxsb2M6OnJhd192ZWM6OmZpbmlz\
aF9ncm93OjpoMDg4ODZiNDc3M2MwNWQ0MgwKZGVjb2RlX3UzMg0KZGVjb2RlX3U2NA42Y29yZTo6cG\
FuaWNraW5nOjpwYW5pY19ib3VuZHNfY2hlY2s6OmgxZmI3YTZkZjEwMzMxMjc5DzdzdGQ6OnBhbmlj\
a2luZzo6cnVzdF9wYW5pY193aXRoX2hvb2s6Omg3MGEwZTE5NWY0ZGIyYTI5ECljb3JlOjpwYW5pY2\
tpbmc6OnBhbmljOjpoOGFmMDQ2Mzk3YTJiZjY1ZBFDY29yZTo6Zm10OjpGb3JtYXR0ZXI6OnBhZF9p\
bnRlZ3JhbDo6d3JpdGVfcHJlZml4OjpoNjBiMWI1MDNlNjZmMzJiMRI0YWxsb2M6OnJhd192ZWM6Om\
NhcGFjaXR5X292ZXJmbG93OjpoNGIyNzVjYjNjMTBiMGE3OBMtY29yZTo6cGFuaWNraW5nOjpwYW5p\
Y19mbXQ6Omg3NTFiZTgwNzc5ZDQyYjUzFBFydXN0X2JlZ2luX3Vud2luZBVDc3RkOjpwYW5pY2tpbm\
c6OmJlZ2luX3BhbmljX2hhbmRsZXI6Ont7Y2xvc3VyZX19OjpoZGNmYzgxOWNlODM2ODI5ZRZJc3Rk\
OjpzeXNfY29tbW9uOjpiYWNrdHJhY2U6Ol9fcnVzdF9lbmRfc2hvcnRfYmFja3RyYWNlOjpoNTNjYW\
JhZmFiNWIwOWFkYRcRX193YmluZGdlbl9tYWxsb2MYD19fd2JpbmRnZW5fZnJlZRkfX193YmluZGdl\
bl9hZGRfdG9fc3RhY2tfcG9pbnRlchoGbWVtY3B5GzE8VCBhcyBjb3JlOjphbnk6OkFueT46OnR5cG\
VfaWQ6OmgxM2M3ODU5NjY4OGY2N2IyHApydXN0X3BhbmljHW9jb3JlOjpwdHI6OmRyb3BfaW5fcGxh\
Y2U8JmNvcmU6Oml0ZXI6OmFkYXB0ZXJzOjpjb3BpZWQ6OkNvcGllZDxjb3JlOjpzbGljZTo6aXRlcj\
o6SXRlcjx1OD4+Pjo6aDA1ZmEwZjk3MWI0NmIwZTcA74CAgAAJcHJvZHVjZXJzAghsYW5ndWFnZQEE\
UnVzdAAMcHJvY2Vzc2VkLWJ5AwVydXN0Yx0xLjY1LjAgKDg5N2UzNzU1MyAyMDIyLTExLTAyKQZ3YW\
xydXMGMC4xOS4wDHdhc20tYmluZGdlbgYwLjIuODM=\
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
