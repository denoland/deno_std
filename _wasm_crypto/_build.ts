#!/usr/bin/env -S deno run --allow-run --allow-read --allow-write --allow-env
// Copyright 2018-2022 the Deno authors. All rights reserved. MIT license.
import * as base64 from "../encoding/base64.ts";

const home = Deno.env.get("HOME");
const root = new URL(".", import.meta.url).pathname;

// Run in the same directory as this script is located.
if (new URL(import.meta.url).protocol === "file:") {
  Deno.chdir(root);
} else {
  console.error("build.ts can only be run locally (from a file: URL).");
  Deno.exit(1);
}

// Format the Rust code.
if (
  !((await Deno.run({
    cmd: [
      "cargo",
      "fmt",
    ],
  }).status()).success)
) {
  console.error(`Failed to format the Rust code.`);
  Deno.exit(1);
}

// Compile the Rust code to WASM.
if (
  !((await Deno.run({
    cmd: [
      "cargo",
      "build",
      "--release",
    ],
    env: {
      // eliminate some potential sources of non-determinism
      SOURCE_DATE_EPOCH: "1600000000",
      TZ: "UTC",
      LC_ALL: "C",
      RUSTFLAGS: `--remap-path-prefix=${root}=. --remap-path-prefix=${home}=~`,
    },
  }).status()).success)
) {
  console.error(`Failed to compile the Rust code to WASM.`);
  Deno.exit(1);
}

const copyrightLine = `// Copyright 2018-${
  new Date().getFullYear()
} the Deno authors. All rights reserved. MIT license.`;

const generatedWasmFile = "./target/wasm32-unknown-unknown/release/deno_std_wasm_crypto.wasm";
// Encode WASM binary as a JavaScript module.
const generatedWasm = await Deno.readFile(generatedWasmFile);

// Format WASM binary size with _ thousands separators for human readability,
// so that any changes in size will be clear in diffs.
const formattedWasmSize = generatedWasm.length.toString().padStart(
  Math.ceil(generatedWasm.length.toString().length / 3) * 3,
).replace(/...\B/g, "$&_").trim();

// Generate a hash of the WASM in the format required by subresource integrity.
const wasmIntegrity = `sha256-${
  base64.encode(await crypto.subtle!.digest("SHA-256", generatedWasm))
}`;

const wasmJs = `${copyrightLine}
// This file is automatically @generated by _build.ts
// It is not intended for manual editing.
import * as base64 from "../encoding/base64.ts";

export const size = ${formattedWasmSize};
export const name = "crypto.wasm";
export const type = "application/wasm";
export const hash = ${JSON.stringify(wasmIntegrity)};
export const data = base64.decode("\\\n${
  base64.encode(generatedWasm).replace(/.{78}/g, "$&\\\n")
}\\\n");

export default data;
`;

await Deno.writeTextFile("./crypto.wasm.mjs", wasmJs);

// Format the generated files.
if (
  !(await Deno.run({
    cmd: [
      "deno",
      "fmt",
      "./crypto.wasm.mjs",
    ],
  }).status()).success
) {
  console.error(
    `Failed to format generated code.`,
  );
  Deno.exit(1);
}
