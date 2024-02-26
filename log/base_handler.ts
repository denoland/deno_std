// Copyright 2018-2024 the Deno authors. All rights reserved. MIT license.
import { getLevelByName, getLevelName, LevelName, LogLevel } from "./levels.ts";
import type { LogRecord } from "./logger.ts";

export type FormatterFunction = (logRecord: LogRecord) => string;
const DEFAULT_FORMATTER: FormatterFunction = ({ levelName, msg }) =>
  `${levelName} ${msg}`;

export interface BaseHandlerOptions {
  formatter?: FormatterFunction;
}

export class BaseHandler {
  #logLevel: LevelName;
  #level: LogLevel;
  formatter: FormatterFunction;

  constructor(
    levelName: LevelName,
    { formatter = DEFAULT_FORMATTER }: BaseHandlerOptions = {},
  ) {
    this.#logLevel = levelName;
    this.#level = getLevelByName(levelName);
    this.formatter = formatter;
  }

  get level() {
    return this.#level;
  }
  set level(level: LogLevel) {
    this.#level = level;
    this.#logLevel = getLevelName(level);
  }

  get levelName() {
    return this.#logLevel;
  }
  set levelName(levelName: LevelName) {
    this.#logLevel = levelName;
    this.#level = getLevelByName(levelName);
  }

  handle(logRecord: LogRecord) {
    if (this.level > logRecord.level) return;

    const msg = this.format(logRecord);
    this.log(msg);
  }

  format(logRecord: LogRecord): string {
    return this.formatter(logRecord);
  }

  log(_msg: string) {}
  setup() {}
  destroy() {}

  [Symbol.dispose]() {
    this.destroy();
  }
}
