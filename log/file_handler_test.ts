// Copyright 2018-2024 the Deno authors. All rights reserved. MIT license.
import { assertEquals, assertThrows } from "../assert/mod.ts";
import { LogLevels } from "./levels.ts";
import { FileHandler } from "./file_handler.ts";
import { LogRecord } from "./logger.ts";

const LOG_FILE = "./file_handler_test_log.file";

Deno.test({
  name: "FileHandler doesn't have broken line",
  fn() {
    class TestFileHandler extends FileHandler {
      override flush() {
        super.flush();
        const decoder = new TextDecoder("utf-8");
        const data = Deno.readFileSync(LOG_FILE);
        const text = decoder.decode(data);
        assertEquals(text.slice(-1), "\n");
      }

      override close() {
        super.close();
        Deno.removeSync(LOG_FILE);
      }
    }

    using testFileHandler = new TestFileHandler("WARN", {
      filename: LOG_FILE,
      mode: "w",
    });
    testFileHandler.open();

    for (let i = 0; i < 300; i++) {
      testFileHandler.handle(
        new LogRecord({
          msg: "The starry heavens above me and the moral law within me.",
          args: [],
          level: LogLevels.WARN,
          loggerName: "default",
        }),
      );
    }
  },
});

Deno.test({
  name: "FileHandler wipes existing log file clean with mode 'w'",
  async fn() {
    const fileHandler = new FileHandler("WARN", {
      filename: LOG_FILE,
      mode: "w",
    });

    fileHandler.open();
    fileHandler.handle(
      new LogRecord({
        msg: "Hello World",
        args: [],
        level: LogLevels.WARN,
        loggerName: "default",
      }),
    );
    fileHandler.close();
    const firstFileSize = (await Deno.stat(LOG_FILE)).size;

    fileHandler.open();
    fileHandler.handle(
      new LogRecord({
        msg: "Hello World",
        args: [],
        level: LogLevels.WARN,
        loggerName: "default",
      }),
    );
    fileHandler.close();
    const secondFileSize = (await Deno.stat(LOG_FILE)).size;

    assertEquals(secondFileSize, firstFileSize);
    Deno.removeSync(LOG_FILE);
  },
});

Deno.test({
  name: "FileHandler throws if log file already exists with mode 'x'",
  fn() {
    using fileHandler = new FileHandler("WARN", {
      filename: LOG_FILE,
      mode: "x",
    });
    Deno.writeFileSync(LOG_FILE, new TextEncoder().encode("hello world"));

    assertThrows(() => {
      fileHandler.open();
    }, Deno.errors.AlreadyExists);

    Deno.removeSync(LOG_FILE);
  },
});

Deno.test({
  name: "FileHandler flushes buffer on unload",
  async fn() {
    const fileHandler = new FileHandler("WARN", {
      filename: LOG_FILE,
      mode: "w",
    });
    fileHandler.open();
    fileHandler.handle(
      new LogRecord({
        msg: "AAA",
        args: [],
        level: LogLevels.ERROR,
        loggerName: "default",
      }),
    ); // 'ERROR AAA\n' = 10 bytes

    assertEquals((await Deno.stat(LOG_FILE)).size, 0);
    dispatchEvent(new Event("unload"));
    dispatchEvent(new Event("unload"));
    assertEquals((await Deno.stat(LOG_FILE)).size, 10);

    Deno.removeSync(LOG_FILE);
  },
});

Deno.test({
  name: "FileHandler triggers immediate flush on critical logs",
  async fn() {
    using fileHandler = new FileHandler("WARN", {
      filename: LOG_FILE,
      mode: "w",
    });
    fileHandler.open();

    fileHandler.handle(
      new LogRecord({
        msg: "AAA",
        args: [],
        level: LogLevels.ERROR,
        loggerName: "default",
      }),
    );

    // ERROR won't trigger immediate flush
    const fileSize = (await Deno.stat(LOG_FILE)).size;
    assertEquals(fileSize, 0);

    fileHandler.handle(
      new LogRecord({
        msg: "AAA",
        args: [],
        level: LogLevels.CRITICAL,
        loggerName: "default",
      }),
    );

    // CRITICAL will trigger immediate flush
    const fileSize2 = (await Deno.stat(LOG_FILE)).size;
    // ERROR record is 10 bytes, CRITICAL is 13 bytes
    assertEquals(fileSize2, 23);

    Deno.removeSync(LOG_FILE);
  },
});

Deno.test({
  name: "FileHandler handles strings larger than the buffer",
  fn() {
    const fileHandler = new FileHandler("WARN", {
      filename: LOG_FILE,
      mode: "w",
    });
    const logOverBufferLimit = "A".repeat(4096);
    fileHandler.open();

    fileHandler.log(logOverBufferLimit);
    fileHandler.close();

    assertEquals(
      Deno.readTextFileSync(LOG_FILE),
      `${logOverBufferLimit}\n`,
    );

    Deno.removeSync(LOG_FILE);
  },
});

Deno.test({
  name: "FileHandler handles a mixture of string sizes",
  fn() {
    const fileHandler = new FileHandler("WARN", {
      filename: LOG_FILE,
      mode: "w",
    });
    const veryLargeLog = "A".repeat(10000);
    const regularLog = "B".repeat(100);
    fileHandler.open();

    fileHandler.log(regularLog);
    fileHandler.log(veryLargeLog);
    fileHandler.log(regularLog);
    fileHandler.close();

    assertEquals(
      Deno.readTextFileSync(LOG_FILE),
      `${regularLog}\n${veryLargeLog}\n${regularLog}\n`,
    );

    Deno.removeSync(LOG_FILE);
  },
});
