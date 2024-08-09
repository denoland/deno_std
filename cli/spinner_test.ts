// Copyright 2018-2024 the Deno authors. All rights reserved. MIT license.
import {
  assert,
  assertEquals,
  assertGreater,
  assertLess,
  assertLessOrEqual,
  assertStringIncludes,
} from "@std/assert";
import { delay } from "@std/async/delay";
import { Spinner } from "./spinner.ts";

async function spawnDeno(args: string[], opts?: Deno.CommandOptions) {
  const cmd = new Deno.Command(Deno.execPath(), {
    args: ["run", ...args],
    stdout: "piped",
    stderr: "piped",
    ...opts,
  });
  const output = await cmd.output();
  return decoder.decode(output.stderr);
}

const normalizeString = (s: string) =>
  // deno-lint-ignore no-control-regex
  s.replace(/\r\n|\r|\n|\u001b\[[0-9;]*[a-zA-Z]/g, "").trim();

const COLOR_RESET = "\u001b[0m";
const LINE_CLEAR = "\r\u001b[K";
const decoder = new TextDecoder();

Deno.test("Spinner can start and stop", async () => {
  const spinner = new Spinner({ message: "Loading..." });
  spinner.start();
  spinner.start(); // This doesn't throw, but ignored
  await delay(300);
  spinner.stop();
});

Deno.test("Spinner constructor accepts spinner", async () => {
  const text = await spawnDeno([
    "cli/testdata/spinner_cases/custom_spinner.ts",
  ]);
  const actual = normalizeString(text);

  assertStringIncludes(actual, "0 1 2 3 4 5 6");
});

Deno.test("Spinner constructor accepts message", async () => {
  const text = await spawnDeno([
    "cli/testdata/spinner_cases/custom_message.ts",
  ]);
  const actual = normalizeString(text);

  assert(actual.startsWith("⠋ Spinning with Deno 🦕"));
});

Deno.test("Spinner constructor accepts interval", async () => {
  const text1 = await spawnDeno([
    "cli/testdata/spinner_cases/custom_interval_750.ts",
  ]);
  const actual1 = normalizeString(text1);

  // means it only ran once
  assertEquals(actual1, "⠋");

  const text2 = await spawnDeno([
    "cli/testdata/spinner_cases/custom_interval_10.ts",
  ]);
  const actual2 = normalizeString(text2);

  // give setInterval a good buffer to avoid needlessly failing
  assertGreater(actual2.length, 50);
  assertLess(actual2.length, 300);
});

Deno.test("Spinner constructor accepts each color", async () => {
  {
    const text = await spawnDeno([
      "cli/testdata/spinner_cases/custom_color_black.ts",
    ]);
    assertStringIncludes(text, `${LINE_CLEAR}\u001b[30m⠋${COLOR_RESET} `);
  }

  {
    const text = await spawnDeno([
      "cli/testdata/spinner_cases/custom_color_red.ts",
    ]);
    assertStringIncludes(text, `${LINE_CLEAR}\u001b[31m⠋${COLOR_RESET} `);
  }

  {
    const text = await spawnDeno([
      "cli/testdata/spinner_cases/custom_color_green.ts",
    ]);
    assertStringIncludes(text, `${LINE_CLEAR}\u001b[32m⠋${COLOR_RESET} `);
  }

  {
    const text = await spawnDeno([
      "cli/testdata/spinner_cases/custom_color_yellow.ts",
    ]);
    assertStringIncludes(text, `${LINE_CLEAR}\u001b[33m⠋${COLOR_RESET} `);
  }

  {
    const text = await spawnDeno([
      "cli/testdata/spinner_cases/custom_color_blue.ts",
    ]);
    assertStringIncludes(text, `${LINE_CLEAR}\u001b[34m⠋${COLOR_RESET} `);
  }

  {
    const text = await spawnDeno([
      "cli/testdata/spinner_cases/custom_color_magenta.ts",
    ]);
    assertStringIncludes(text, `${LINE_CLEAR}\u001b[35m⠋${COLOR_RESET} `);
  }

  {
    const text = await spawnDeno([
      "cli/testdata/spinner_cases/custom_color_cyan.ts",
    ]);
    assertStringIncludes(text, `${LINE_CLEAR}\u001b[36m⠋${COLOR_RESET} `);
  }

  {
    const text = await spawnDeno([
      "cli/testdata/spinner_cases/custom_color_white.ts",
    ]);
    assertStringIncludes(text, `${LINE_CLEAR}\u001b[37m⠋${COLOR_RESET} `);
  }

  {
    const text = await spawnDeno([
      "cli/testdata/spinner_cases/custom_color_gray.ts",
    ]);
    assertStringIncludes(text, `${LINE_CLEAR}\u001b[90m⠋${COLOR_RESET} `);
  }
});

Deno.test("Spinner.color can set each color", async () => {
  const text = await spawnDeno(["cli/testdata/spinner_cases/set_color.ts"]);

  assertStringIncludes(text, `${LINE_CLEAR}\u001b[30m⠋${COLOR_RESET} `); // includes black spinner
  assertStringIncludes(text, `${LINE_CLEAR}\u001b[31m⠙${COLOR_RESET} `); // includes red spinner
});

Deno.test("Spinner.color can get each color", () => {
  const spinner = new Spinner();

  spinner.color = "black";
  assertEquals(spinner.color, "\u001b[30m");

  spinner.color = "red";
  assertEquals(spinner.color, "\u001b[31m");

  spinner.color = "green";
  assertEquals(spinner.color, "\u001b[32m");

  spinner.color = "yellow";
  assertEquals(spinner.color, "\u001b[33m");

  spinner.color = "blue";
  assertEquals(spinner.color, "\u001b[34m");

  spinner.color = "magenta";
  assertEquals(spinner.color, "\u001b[35m");

  spinner.color = "cyan";
  assertEquals(spinner.color, "\u001b[36m");

  spinner.color = "white";
  assertEquals(spinner.color, "\u001b[37m");

  spinner.color = "gray";
  assertEquals(spinner.color, "\u001b[90m");
});

Deno.test("Spinner.start() begins the sequence", async () => {
  const text = await spawnDeno(["cli/testdata/spinner_cases/start.ts"]);
  assertStringIncludes(text, `${LINE_CLEAR}⠋${COLOR_RESET} `);
});

Deno.test("Spinner.stop() terminates the sequence", async () => {
  const text = await spawnDeno(["cli/testdata/spinner_cases/stop.ts"]);
  // Spinner renders 2 times and then renders LINE_CLEAR at the end.
  // (LINE_CLEAR(4) + ⠋(1) COLOR_RESET(4) + SPACE(1)) * 2 + LINE_CLEAR(4) = 24
  assertLessOrEqual(text.length, 24);
});

Deno.test("Spinner.message can be updated", async () => {
  const text = await spawnDeno([
    "cli/testdata/spinner_cases/change_message.ts",
  ]);
  const actual = normalizeString(text);
  assertStringIncludes(actual, "One dino 🦕");
  assertStringIncludes(actual, "Two dinos 🦕🦕");
});

Deno.test("Spinner.message returns the current value when updated", () => {
  const spinner = new Spinner();

  spinner.message = "Step 1";
  assertEquals(spinner.message, "Step 1");

  spinner.message = "Step 2";
  assertEquals(spinner.message, "Step 2");

  spinner.message = "Step 3";
  assertEquals(spinner.message, "Step 3");
});
