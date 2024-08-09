#!/usr/bin/env -S deno bench
// Copyright 2018-2024 the Deno authors. All rights reserved. MIT license.
import { SeededRandom } from "../seeded_random.ts";

const prng = new SeededRandom({
  // deno-fmt-ignore
  seed: [
    0x1b, 0x5c, 0x18, 0xd1, 0xd9, 0xe1, 0xd4, 0x1a,
    0x65, 0xc4, 0xd2, 0x16, 0x68, 0xe4, 0xce, 0x1d,
  ],
});

Deno.bench("SeededRandom.random()", () => {
  prng.random();
});
