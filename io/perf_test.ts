import { assertEquals, assertThrows} from "../testing/asserts.ts";
import { BytesList } from "./perf.ts";
import *  as bytes from "../bytes/mod.ts";
function setup() {
  const arr = new BytesList();
  const part1 = new Uint8Array([0, 1, 2]);
  const part2 = new Uint8Array([3, 4, 5, 6]);
  const part3 = new Uint8Array([7]);
  const part4 = new Uint8Array([0, 0, 8, 0]);
  const part5 = new Uint8Array([0, 9]);
  arr.add(part1);
  arr.add(part2);
  arr.add(part3);
  arr.add(new Uint8Array());
  arr.add(part3, 0, 0);
  arr.add(part4, 2, 3);
  arr.add(part5, 1, 2);
  return arr;
}
Deno.test("BytesList.add", () => {
  const arr = setup();
  assertEquals(arr.size(), 10);
  assertEquals(arr.getChunkIndex(-1), -1);
  assertEquals(arr.getChunkIndex(0), 0);
  assertEquals(arr.getChunkIndex(1), 0);
  assertEquals(arr.getChunkIndex(2), 0);
  assertEquals(arr.getChunkIndex(3), 1);
  assertEquals(arr.getChunkIndex(4), 1);
  assertEquals(arr.getChunkIndex(5), 1);
  assertEquals(arr.getChunkIndex(6), 1);
  assertEquals(arr.getChunkIndex(7), 2);
  assertEquals(arr.getChunkIndex(8), 3);
  assertEquals(arr.getChunkIndex(9), 4);
  assertEquals(arr.getChunkIndex(10), -1);
  for (let i = 0; i < arr.size(); i++) {
    assertEquals(arr.get(i), i);
  }
})
Deno.test("BytesList.slice", () => {
  const arr = setup();
  assertEquals(bytes.equals(arr.slice(0, 4), new Uint8Array([0, 1, 2, 3])), true);
  assertEquals(bytes.equals(arr.slice(3, 5), new Uint8Array([3, 4,])),true);
  assertEquals(bytes.equals(arr.slice(0,), new Uint8Array([0, 1, 2, 3, 4, 5, 6, 7, 8, 9])), true);
  assertThrows(() => {
    arr.slice(9, 11)
  }, Error, "out of range");
  assertThrows(() => {
    arr.slice(-1, 1);
  }, Error, "out of range");
})
Deno.test("BytesList.concat", () => {
  const arr = setup();
  assertEquals(bytes.equals(
    arr.concat(),
    new Uint8Array([0,1,2,3, 4, 5, 6, 7, 8, 9])), true);
})
Deno.test("BytesList.shift", () => {
  const arr = setup();
  arr.shift(3);
  assertEquals(arr.size(), 7);
  assertEquals(bytes.equals(
    arr.concat(),
    new Uint8Array([3, 4, 5, 6, 7, 8, 9])), true);
  arr.shift(4);
  assertEquals(arr.size(), 3);
  assertEquals(bytes.equals(
    arr.concat(),
    new Uint8Array([7, 8, 9]),
  ), true);
})
Deno.test("BytesList.shift 2", () => {
  const arr = new BytesList();
  arr.add(new Uint8Array([0, 0, 0, 1, 2, 0]), 0, 5);
  arr.shift(2);
  assertEquals(arr.size(), 3);
  assertEquals(bytes.equals(arr.concat(), new Uint8Array([
    0, 1, 2
  ])), true);
  arr.shift(2);
  assertEquals(arr.size(), 1);
  assertEquals(bytes.equals(arr.concat(), new Uint8Array([
    2
  ])), true);
})
Deno.test("BytesList.shift 3", () => {
  const arr = new BytesList();
  arr.add(new Uint8Array([0, 0, 0, 1, 2, 0]), 0, 5);
  arr.shift(100);
  assertEquals(arr.size(), 0);
  assertEquals(arr.concat().byteLength, 0);
})
