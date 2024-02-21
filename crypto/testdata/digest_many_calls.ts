import { crypto as stdCrypto } from "../crypto.ts";
import { instantiateWithInstance } from "../_wasm/lib/deno_std_wasm_crypto.generated.mjs";
import { encodeHex } from "../../encoding/hex.ts";

const { memory } = instantiateWithInstance().instance.exports;

const heapBytesInitial = memory.buffer.byteLength;

let state = new ArrayBuffer(0);

for (let i = 0; i < 1_000_000; i++) {
  state = stdCrypto.subtle.digestSync({
    name: "BLAKE3",
  }, state);
}

const heapBytesFinal = memory.buffer.byteLength;

const stateFinal = encodeHex(state);

console.log(JSON.stringify({
  heapBytesInitial,
  heapBytesFinal,
  stateFinal,
}));
