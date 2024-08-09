// Copyright 2018-2024 the Deno authors. All rights reserved. MIT license.
import type { WriterSync } from "@std/io/types";
export type { WriterSync };

const encoder = new TextEncoder();

const LINE_CLEAR = encoder.encode("\r\u001b[K"); // From cli/prompt_secret.ts
const COLOR_RESET = "\u001b[0m";
const DEFAULT_INTERVAL = 75;
const DEFAULT_SPINNER = ["⠋", "⠙", "⠹", "⠸", "⠼", "⠴", "⠦", "⠧", "⠇", "⠏"];

/**
 * This is a hack to allow us to use the same type for both the color name and
 * an ANSI escape code.
 *
 * @see {@link https://github.com/microsoft/TypeScript/issues/29729#issuecomment-460346421}
 *
 * @internal
 */
// deno-lint-ignore ban-types
export type Ansi = string & {};

/**
 * Color options for {@linkcode SpinnerOptions.color}.
 *
 * > [!WARNING]
 * > **UNSTABLE**: New API, yet to be vetted.
 *
 * @experimental
 */
export type Color =
  | "black"
  | "red"
  | "green"
  | "yellow"
  | "blue"
  | "magenta"
  | "cyan"
  | "white"
  | "gray"
  | Ansi;

const COLORS: Record<Color, string> = {
  black: "\u001b[30m",
  red: "\u001b[31m",
  green: "\u001b[32m",
  yellow: "\u001b[33m",
  blue: "\u001b[34m",
  magenta: "\u001b[35m",
  cyan: "\u001b[36m",
  white: "\u001b[37m",
  gray: "\u001b[90m",
};

/**
 * Options for {@linkcode Spinner}.
 *
 * > [!WARNING]
 * > **UNSTABLE**: New API, yet to be vetted.
 *
 * @experimental
 */
export interface SpinnerOptions {
  /**
   * The sequence of characters to be iterated through for animation.
   *
   * @default {["⠋", "⠙", "⠹", "⠸", "⠼", "⠴", "⠦", "⠧", "⠇", "⠏"]}
   */
  spinner?: string[];
  /**
   * The message to display next to the spinner. This can be changed while the
   * spinner is active.
   */
  message?: string;
  /**
   * The time between each frame of the spinner in milliseconds.
   *
   * @default {75}
   */
  interval?: number;
  /**
   * The color of the spinner. Defaults to the default terminal color.
   * This can be changed while the spinner is active.
   */
  color?: Color;
  /**
   * Stream to write the spinner to.
   *
   * @default {Deno.stderr}
   */
  stream?: WriterSync & { writable: WritableStream<Uint8Array> };
}

/**
 * A spinner that can be used to indicate that something is loading.
 *
 * > [!WARNING]
 * > **UNSTABLE**: New API, yet to be vetted.
 *
 * @example Usage
 * ```ts no-eval
 * import { Spinner } from "@std/cli/spinner";
 *
 * const spinner = new Spinner({ message: "Loading...", color: "yellow" });
 * spinner.start();
 *
 * setTimeout(() => {
 *  spinner.stop();
 *  console.log("Finished loading!");
 * }, 3_000);
 * ```
 *
 * @experimental
 */
export class Spinner {
  #spinner: string[];

  /**
   * The message to display next to the spinner.
   * This can be changed while the spinner is active.
   *
   * @example Usage
   * ```ts no-eval
   * import { Spinner } from "@std/cli/spinner";
   *
   * const spinner = new Spinner({ message: "Working..." });
   * spinner.start();
   *
   * for (let step = 0; step < 5; step++) {
   *   // do some work
   *   await new Promise((resolve) => setTimeout(resolve, 1000));
   *
   *   spinner.message = `Finished Step #${step}`;
   * }
   *
   * spinner.stop();
   * console.log("Done!");
   * ```
   */
  message: string;

  #interval: number;
  #color?: Color;
  #intervalId: number | undefined;
  #active = false;
  #stream: WriterSync & { writable: WritableStream<Uint8Array> };

  /**
   * Creates a new spinner.
   *
   * @param options Options for the spinner.
   */
  constructor(options?: SpinnerOptions) {
    const {
      spinner = DEFAULT_SPINNER,
      message = "",
      interval = DEFAULT_INTERVAL,
      color,
      stream = Deno.stderr,
    } = options ?? {};
    this.#spinner = spinner;
    this.message = message;
    this.#interval = interval;
    this.color = color;
    this.#stream = stream;
  }

  /**
   * Set the color of the spinner. This defaults to the default terminal color.
   * This can be changed while the spinner is active.
   *
   * Providing `undefined` will use the default terminal color.
   *
   * @param value Color to set.
   *
   * @example Usage
   * ```ts no-eval
   * import { Spinner } from "@std/cli/spinner";
   *
   * const spinner = new Spinner({ message: "Loading...", color: "yellow" });
   * spinner.start();
   *
   * // do some work
   * await new Promise((resolve) => setTimeout(resolve, 1000));
   *
   * spinner.color = "magenta";
   * ```
   */
  set color(value: Color | undefined) {
    this.#color = value ? COLORS[value] : undefined;
  }

  /**
   * Get the current color of the spinner.
   *
   * @example Usage
   * ```ts no-assert
   * import { Spinner } from "@std/cli/spinner";
   *
   * const spinner = new Spinner({ message: "Loading", color: "blue" });
   *
   * spinner.color; // Blue ANSI escape sequence
   * ```
   * @returns The color of the spinner or `undefined` if it's using the terminal default.
   */
  get color(): Color | undefined {
    return this.#color;
  }

  /**
   * Starts the spinner.
   *
   * @example Usage
   * ```ts no-eval
   * import { Spinner } from "@std/cli/spinner";
   *
   * const spinner = new Spinner({ message: "Loading..." });
   * spinner.start();
   * ```
   */
  start() {
    if (this.#active || this.#stream.writable.locked) {
      return;
    }

    this.#active = true;
    let i = 0;
    const noColor = Deno.noColor;

    // Updates the spinner after the given interval.
    const updateFrame = () => {
      const color = this.#color ?? "";
      const frame = encoder.encode(
        noColor
          ? this.#spinner[i] + " " + this.message
          : color + this.#spinner[i] + COLOR_RESET + " " + this.message,
      );
      // call writeSync once to reduce flickering
      const writeData = new Uint8Array(LINE_CLEAR.length + frame.length);
      writeData.set(LINE_CLEAR);
      writeData.set(frame, LINE_CLEAR.length);
      this.#stream.writeSync(writeData);
      i = (i + 1) % this.#spinner.length;
    };

    this.#intervalId = setInterval(updateFrame, this.#interval);
  }

  /**
   * Stops the spinner.
   *
   * @example Usage
   * ```ts no-eval
   * import { Spinner } from "@std/cli/spinner";
   *
   * const spinner = new Spinner({ message: "Loading..." });
   * spinner.start();
   *
   * setTimeout(() => {
   *  spinner.stop();
   *  console.log("Finished loading!");
   * }, 3_000);
   * ```
   */
  stop() {
    if (this.#intervalId && this.#active) {
      clearInterval(this.#intervalId);
      this.#stream.writeSync(LINE_CLEAR); // Clear the current line
      this.#active = false;
    }
  }
}
