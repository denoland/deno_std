// Copyright 2018-2024 the Deno authors. All rights reserved. MIT license.
import {
  getLevelByName,
  getLevelName,
  type LevelName,
  type LogLevel,
} from "./levels.ts";
import type { LogRecord } from "./logger.ts";

export type FormatterFunction = (logRecord: LogRecord) => string;
const DEFAULT_FORMATTER: FormatterFunction = ({ levelName, msg }) =>
  `${levelName} ${msg}`;

export interface BaseHandlerOptions {
  formatter?: FormatterFunction;
}

export class BaseHandler {
  #levelName: LevelName;
  #level: LogLevel;
  formatter: FormatterFunction;

  constructor(
    levelName: LevelName,
    { formatter = DEFAULT_FORMATTER }: BaseHandlerOptions = {},
  ) {
    this.#levelName = levelName;
    this.#level = getLevelByName(levelName);
    this.formatter = formatter;
  }

  get level(): LogLevel {
    return this.#level;
  }

  set level(level: LogLevel) {
    this.#level = level;
    this.#levelName = getLevelName(level);
  }

  get levelName(): LevelName {
    return this.#levelName;
  }
  set levelName(levelName: LevelName) {
    this.#levelName = levelName;
    this.#level = getLevelByName(levelName);
  }

  handle(logRecord: LogRecord) {
    if (this.level > logRecord.level) return;

    const msg = this.format(logRecord);
    this.#log(msg);
  }

  format(logRecord: LogRecord): string {
    return this.formatter(logRecord);
  }

  /**
   * @deprecated (will be removed in 0.220.0)
   */
  log(_msg: string) {}
  #log(msg: string) {
    this.log(msg);
  }
  setup() {}
  destroy() {}

  [Symbol.dispose]() {
    this.destroy();
  }
}
