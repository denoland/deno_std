import { BufWriterSync } from "../io/buffer.ts";
import {
  buildDefaultLogMessage,
  buildLogger,
  Logger,
  LogHandler,
  LogLevels,
} from "./logging.ts";

/** Options for `buildFileLogger` */
export type FileLoggerOptions<L extends LogLevels, M, A> = Readonly<{
  /** Formatter for incoming messages, defaults to `buildDefaultLogMessage` */
  messageFormatter?: (
    ...handlerArgs: Parameters<LogHandler<L, M, A>>
  ) => string;
  /** Options for how the log file should handle existing files, see `Deno.OpenOptions` */
  fileOptions?: Pick<
    Deno.OpenOptions,
    "append" | "truncate" | "create" | "createNew"
  >;
}>;

export type FileLogger<L extends LogLevels, M, A> =
  & Logger<L, M, A>
  & {
    flush(): void;
    close(): void;
  };
/**
 * Creates a file logger that writes log messages into the given file. By default a new file will be created if
 * one does not exist yet or append to already existing file. This behavior can be configured
 * with a subset of `Deno.OpenOptions`.
 */
export function buildFileLogger<L extends LogLevels, M, A>(
  logLevels: L,
  thresholdLevel: keyof L,
  filename: string,
  {
    messageFormatter = buildDefaultLogMessage,
    fileOptions = { append: true, create: true },
  }: FileLoggerOptions<L, M, A> = {},
): FileLogger<L, M, A> {
  const file = Deno.openSync(filename, { ...fileOptions, write: true });
  const buf = new BufWriterSync(file);
  const encoder = new TextEncoder();

  const logger: FileLogger<L, M, A> = buildLogger(
    logLevels,
    thresholdLevel,
    (level, message: M, additionalData?: A) => {
      const messageString = messageFormatter(
        level,
        message,
        additionalData,
      );

      buf.writeSync(encoder.encode(`${messageString}\n`));
    },
  ) as FileLogger<L, M, A>;

  logger.flush = () => buf.flush();
  logger.close = () => {
    logger.flush();
    file.close();
    removeEventListener("unload", logger.close);
  };

  addEventListener("unload", logger.close);

  return logger;
}

/** Options for `buildConsoleLogger` */
export type ConsoleLoggerOptions<L extends LogLevels, M, A> = Readonly<{
  /** Formatter for incoming messages, defaults to `buildDefaultLogMessage` */
  messageFormatter?: (
    ...handlerArgs: Parameters<LogHandler<L, M, A>>
  ) => string;
}>;

/**
 * Creates a custom console logger that logs to stdout and stderr
 *
 * @param isErrorLevel Predicate to decide whether messages of a given log level should be logged to stderr or stdout
 */
export function buildConsoleLogger<L extends LogLevels, M, A>(
  logLevels: L,
  thresholdLevel: keyof L,
  isErrorLevel: (level: keyof L) => boolean,
  { messageFormatter = buildDefaultLogMessage }: ConsoleLoggerOptions<L, M, A> =
    {},
): Logger<L, M, A> {
  return buildLogger(
    logLevels,
    thresholdLevel,
    (level, message, additionalData) => {
      const messageString = messageFormatter(
        level,
        message,
        additionalData,
      );

      if (isErrorLevel(level)) {
        console.error(messageString);
      } else {
        console.log(messageString);
      }
    },
  );
}

export type MultiLoggerOptions<L extends LogLevels> = Readonly<{
  thresholdLevel?: keyof L | null;
}>;

/**
 * Creates a custom multi logger that passes messages to all given loggers. Defaults to no threshold
 * (and thus no filter), but a threshold can optionally be passed.
 */
export function buildMultiLogger<L extends LogLevels, M, A>(
  logLevels: L,
  loggers: readonly Logger<L, M, A>[],
  { thresholdLevel = null }: MultiLoggerOptions<L> = {},
): Logger<L, M, A> {
  return buildLogger(
    logLevels,
    thresholdLevel,
    (level, message, additionalData) =>
      loggers.forEach((it) => it[level](message, additionalData)),
  );
}
