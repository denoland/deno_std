import { LineStream, TextDelimiterStream } from "./delimiter.ts";
import { assert, assertEquals } from "../testing/asserts.ts";

Deno.test("[streams] LineStream", async () => {
  const textStream = new ReadableStream({
    start(controller) {
      controller.enqueue("qwertzu");
      controller.enqueue("iopasd\r\nmnbvc");
      controller.enqueue("xylk\njhgfds\napoiuzt");
      controller.enqueue("rewq0987654321");
      controller.close();
    },
  });

  const lines = textStream
    .pipeThrough(new TextEncoderStream())
    .pipeThrough(new LineStream())
    .pipeThrough(new TextDecoderStream());
  const reader = lines.getReader();

  const a = await reader.read();
  assertEquals(a.value, "qwertzuiopasd");
  const b = await reader.read();
  assertEquals(b.value, "mnbvcxylk");
  const c = await reader.read();
  assertEquals(c.value, "jhgfds");
  const d = await reader.read();
  assertEquals(d.value, "apoiuztrewq0987654321");
  const e = await reader.read();
  assert(e.done);
});

Deno.test("[streams] TextDelimiterStream", async () => {
  const textStream = new ReadableStream({
    start(controller) {
      controller.enqueue("qwertzu");
      controller.enqueue("iopasdfoomnbvc");
      controller.enqueue("xylkjhfoogfdsapfoooiuzt");
      controller.enqueue("rewq0987654321");
      controller.close();
    },
  });

  const lines = textStream.pipeThrough(new TextDelimiterStream("foo"));
  const reader = lines.getReader();

  const a = await reader.read();
  assertEquals(a.value, "qwertzuiopasd");
  const b = await reader.read();
  assertEquals(b.value, "mnbvcxylkjh");
  const c = await reader.read();
  assertEquals(c.value, "gfdsap");
  const d = await reader.read();
  assertEquals(d.value, "oiuztrewq0987654321");
  const e = await reader.read();
  assert(e.done);
});
