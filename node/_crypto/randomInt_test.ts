import randomInt from "./randomInt.ts";
import { assert, assertThrows } from "../../testing/asserts.ts";

const between = (x: number, min: number, max: number) => x >= min && x <= max;

Deno.test("[node/crypto.randomInt] One Param: Max", () => {
  assert(between(randomInt(55), 0, 55));
});

Deno.test("[node/crypto.randomInt] Two Params: Max and Min", () => {
  assert(between(randomInt(40, 120), 40, 120));
});

Deno.test("[node/crypto.randomInt] Max and Callback", () => {
  randomInt(3, (_err, val) => {
    assert(between(val as number, 0, 3));
  });
});

Deno.test("[node/crypto.randomInt] Min, Max and Callback", () => {
  randomInt(3, 5, (_err, val) => {
    assert(between(val as number, 3, 5));
  });
});

Deno.test("[node/crypto.randomInt] Min is bigger than Max", () => {
  assertThrows(() => randomInt(45, 34));
});
