import { decodeBase32, encodeBase32 } from "./encoding/base32.ts";
import {
  decodeBase32 as decodeBase32Legacy,
  encodeBase32 as encodeBase32Legacy,
} from "https://deno.land/std@0.224.0/encoding/base32.ts";

const str = "6e08a89ca36b677ff8fe99e68a1241c8d8cef2570a5f60b6417d2538b30c";

Deno.bench("encodeBase32", () => {
  encodeBase32(str);
});

Deno.bench("encodeBase32Legacy", () => {
  encodeBase32Legacy(str);
});

Deno.bench("decodeBase32", () => {
  decodeBase32("NYEKRHFDNNTX76H6THTIUESBZDMM54SXBJPWBNSBPUSTRMYM");
});

Deno.bench("decodeBase32Legacy", () => {
  decodeBase32Legacy("NYEKRHFDNNTX76H6THTIUESBZDMM54SXBJPWBNSBPUSTRMYM");
});
