# std/hash

## Usage

### Creating new hash instance

You can create a new Hasher instance by calling `createHash` defined in mod.ts.

```ts
import { createHash } from "https://deno.land/std@$STD_VERSION/hash/mod.ts";

const hash = createHash("sha256");
// ...
```

### Using hash instance

You can use `update` method to feed data into your hash instance. Call `digest`
method to retrive final hash value in a Uint8Array.

```ts
import { createHash } from "https://deno.land/std@$STD_VERSION/hash/mod.ts";

const hash = createHash("sha256");
hash.update("Your data here");
const final = hash.digest(); // returns a Uint8Array.
```

If you need final hash in string formats, call `toString`.

```ts
import { createHash } from "https://deno.land/std@$STD_VERSION/hash/mod.ts";

const hash = createHash("sha256");
hash.update("Your data here");
const hashInHex = hash.toString(); // returns 5fe084ee423ff7e0c7709e9437cee89d
```

### Supported algorithms

The following hash algorithms are supported:

- blake2b
- blake2s
- blake3
- keccak224
- keccak256
- keccak384
- keccak512
- md2
- md4
- md5
- ripemd160
- ripemd320
- sha1
- sha224
- sha256
- sha3-224
- sha3-256
- sha3-384
- sha3-512
- sha384
- sha512
- shake128
- shake256
