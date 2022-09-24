// Copyright 2018-2022 the Deno authors. All rights reserved. MIT license.

// This module implements 'child_process' module of Node.JS API.
// ref: https://nodejs.org/api/child_process.html
import {
  ChildProcess,
  ChildProcessOptions,
  spawnSync as _spawnSync,
  type SpawnSyncOptions,
  type SpawnSyncResult,
  stdioStringToArray,
} from "./internal/child_process.ts";
import { validateAbortSignal, validateString } from "./internal/validators.mjs";
import {
  ERR_CHILD_PROCESS_IPC_REQUIRED,
  ERR_CHILD_PROCESS_STDIO_MAXBUFFER,
  ERR_INVALID_ARG_VALUE,
  ERR_OUT_OF_RANGE,
} from "./internal/errors.ts";
import {
  ArrayPrototypePush,
  StringPrototypeSlice,
} from "./internal/primordials.mjs";
import { getSystemErrorName, promisify } from "./util.ts";
import { createDeferredPromise } from "./internal/util.mjs";
import { process } from "./process.ts";
import { Buffer } from "./buffer.ts";
import { notImplemented } from "./_utils.ts";

const MAX_BUFFER = 1024 * 1024;

/**
 * Spawns a new Node.js process + fork. Not implmeneted yet.
 * @param modulePath
 * @param args
 * @param option
 * @returns
 */
export function fork(
  modulePath: string, /* args?: string[], options?: ForkOptions*/
) {
  validateString(modulePath, "modulePath");

  // Get options and args arguments.
  let execArgv;
  let options: SpawnOptions & {
    execArgv?: string;
    execPath?: string;
    silent?: boolean;
  } = {};
  let args: string[] = [];
  let pos = 1;
  if (pos < arguments.length && Array.isArray(arguments[pos])) {
    args = arguments[pos++];
  }

  if (pos < arguments.length && arguments[pos] == null) {
    pos++;
  }

  if (pos < arguments.length && arguments[pos] != null) {
    if (typeof arguments[pos] !== "object") {
      throw new ERR_INVALID_ARG_VALUE(`arguments[${pos}]`, arguments[pos]);
    }

    options = { ...arguments[pos++] };
  }

  // Prepare arguments for fork:
  execArgv = options.execArgv || process.execArgv;

  if (execArgv === process.execArgv && process._eval != null) {
    const index = execArgv.lastIndexOf(process._eval);
    if (index > 0) {
      // Remove the -e switch to avoid fork bombing ourselves.
      execArgv = execArgv.slice(0);
      execArgv.splice(index - 1, 2);
    }
  }

  // TODO(bartlomieju): this is incomplete, currently only handling a single
  // V8 flag to get Prisma integration running, we should fill this out with
  // more
  const v8Flags: string[] = [];
  if (Array.isArray(execArgv)) {
    for (let index = 0; index < execArgv.length; index++) {
      const flag = execArgv[index];
      if (flag.startsWith("--max-old-space-size")) {
        execArgv.splice(index, 1);
        v8Flags.push(flag);
      }
    }
  }
  const stringifiedV8Flags: string[] = [];
  if (v8Flags.length > 0) {
    stringifiedV8Flags.push("--v8-flags=" + v8Flags.join(","));
  }
  args = [
    // TODO(kt3k): Find corrct args for `fork` execution
    ...[],
    ...stringifiedV8Flags,
    ...execArgv,
    modulePath,
    ...args,
  ];

  if (typeof options.stdio === "string") {
    options.stdio = stdioStringToArray(options.stdio, "ipc");
  } else if (!Array.isArray(options.stdio)) {
    // Use a separate fd=3 for the IPC channel. Inherit stdin, stdout,
    // and stderr from the parent if silent isn't set.
    options.stdio = stdioStringToArray(
      options.silent ? "pipe" : "inherit",
      "ipc",
    );
  } else if (!options.stdio.includes("ipc")) {
    throw new ERR_CHILD_PROCESS_IPC_REQUIRED("options.stdio");
  }

  options.execPath = options.execPath || Deno.execPath();
  options.shell = false;

  notImplemented("child_process.fork");
}

// deno-lint-ignore no-empty-interface
interface SpawnOptions extends ChildProcessOptions {}
export function spawn(command: string): ChildProcess;
export function spawn(command: string, options: SpawnOptions): ChildProcess;
export function spawn(command: string, args: string[]): ChildProcess;
export function spawn(
  command: string,
  args: string[],
  options: SpawnOptions,
): ChildProcess;
/**
 * Spawns a child process using `command`.
 */
export function spawn(
  command: string,
  argsOrOptions?: string[] | SpawnOptions,
  maybeOptions?: SpawnOptions,
): ChildProcess {
  const args = Array.isArray(argsOrOptions) ? argsOrOptions : [];
  const options = !Array.isArray(argsOrOptions) && argsOrOptions != null
    ? argsOrOptions
    : maybeOptions;
  validateAbortSignal(options?.signal, "options.signal");
  return new ChildProcess(command, args, options);
}

function validateTimeout(timeout?: number) {
  if (timeout != null && !(Number.isInteger(timeout) && timeout >= 0)) {
    throw new ERR_OUT_OF_RANGE("timeout", "an unsigned integer", timeout);
  }
}

function validateMaxBuffer(maxBuffer?: number) {
  if (
    maxBuffer != null &&
    !(typeof maxBuffer === "number" && maxBuffer >= 0)
  ) {
    throw new ERR_OUT_OF_RANGE(
      "options.maxBuffer",
      "a positive number",
      maxBuffer,
    );
  }
}

export function spawnSync(
  command: string,
  argsOrOptions?: string[] | SpawnSyncOptions,
  maybeOptions?: SpawnSyncOptions,
): SpawnSyncResult {
  const args = Array.isArray(argsOrOptions) ? argsOrOptions : [];
  let options = !Array.isArray(argsOrOptions) && argsOrOptions
    ? argsOrOptions
    : maybeOptions as SpawnSyncOptions;

  options = {
    maxBuffer: MAX_BUFFER,
    ...options,
  };

  // Validate the timeout, if present.
  validateTimeout(options.timeout);

  // Validate maxBuffer, if present.
  validateMaxBuffer(options.maxBuffer);

  return _spawnSync(command, args, options);
}

interface ExecOptions extends
  Pick<
    ChildProcessOptions,
    | "cwd"
    | "env"
    | "signal"
    | "uid"
    | "gid"
    | "windowsHide"
  > {
  encoding?: string;
  /**
   * Shell to execute the command with.
   */
  shell?: string;
  timeout?: number;
  /**
   * Largest amount of data in bytes allowed on stdout or stderr. If exceeded, the child process is terminated and any output is truncated.
   */
  maxBuffer?: number;
  killSignal?: string | number;
}
type ExecException = ChildProcessError;
type ExecCallback = (
  error: ExecException | null,
  stdout?: string | Buffer,
  stderr?: string | Buffer,
) => void;

function normalizeExecArgs(
  command: string,
  optionsOrCallback?: ExecOptions | ExecCallback,
  maybeCallback?: ExecCallback,
) {
  let options: ExecFileOptions | undefined = undefined;
  let callback: ExecFileCallback | undefined = maybeCallback;

  if (typeof optionsOrCallback === "function") {
    callback = optionsOrCallback;
    optionsOrCallback = undefined;
  }

  // Make a shallow copy so we don't clobber the user's options object.
  options = { ...optionsOrCallback };
  options.shell = typeof options.shell === "string" ? options.shell : true;

  return {
    file: command,
    options: options!,
    callback: callback!,
  };
}

/**
 * Spawns a shell executing the given command.
 */
export function exec(command: string): ChildProcess;
export function exec(command: string, options: ExecOptions): ChildProcess;
export function exec(command: string, callback: ExecCallback): ChildProcess;
export function exec(
  command: string,
  options: ExecOptions,
  callback: ExecCallback,
): ChildProcess;
export function exec(
  command: string,
  optionsOrCallback?: ExecOptions | ExecCallback,
  maybeCallback?: ExecCallback,
): ChildProcess {
  const opts = normalizeExecArgs(command, optionsOrCallback, maybeCallback);
  return execFile(opts.file, opts.options, opts.callback);
}

interface PromiseWithChild<T> extends Promise<T> {
  child: ChildProcess;
}
type ExecOutputForPromisify = {
  stdout?: string | Buffer;
  stderr?: string | Buffer;
};
type ExecExceptionForPromisify = ExecException & ExecOutputForPromisify;

const customPromiseExecFunction = (orig: typeof exec) => {
  return (...args: [command: string, options: ExecOptions]) => {
    const { promise, resolve, reject } = createDeferredPromise() as unknown as {
      promise: PromiseWithChild<ExecOutputForPromisify>;
      resolve?: (value: ExecOutputForPromisify) => void;
      reject?: (reason?: ExecExceptionForPromisify) => void;
    };

    promise.child = orig(...args, (err, stdout, stderr) => {
      if (err !== null) {
        const _err: ExecExceptionForPromisify = err;
        _err.stdout = stdout;
        _err.stderr = stderr;
        reject && reject(_err);
      } else {
        resolve && resolve({ stdout, stderr });
      }
    });

    return promise;
  };
};

Object.defineProperty(exec, promisify.custom, {
  enumerable: false,
  value: customPromiseExecFunction(exec),
});

interface ExecFileOptions extends ChildProcessOptions {
  encoding?: string;
  timeout?: number;
  maxBuffer?: number;
  killSignal?: string | number;
}
interface ChildProcessError extends Error {
  code?: string | number;
  killed?: boolean;
  signal?: AbortSignal;
  cmd?: string;
}
class ExecFileError extends Error implements ChildProcessError {
  code?: string | number;

  constructor(message: string) {
    super(message);
    this.code = "UNKNOWN";
  }
}
type ExecFileCallback = (
  error: ChildProcessError | null,
  stdout?: string | Buffer,
  stderr?: string | Buffer,
) => void;
export function execFile(file: string): ChildProcess;
export function execFile(
  file: string,
  callback: ExecFileCallback,
): ChildProcess;
export function execFile(file: string, args: string[]): ChildProcess;
export function execFile(
  file: string,
  args: string[],
  callback: ExecFileCallback,
): ChildProcess;
export function execFile(file: string, options: ExecFileOptions): ChildProcess;
export function execFile(
  file: string,
  options: ExecFileOptions,
  callback: ExecFileCallback,
): ChildProcess;
export function execFile(
  file: string,
  args: string[],
  options: ExecFileOptions,
  callback: ExecFileCallback,
): ChildProcess;
export function execFile(
  file: string,
  argsOrOptionsOrCallback?: string[] | ExecFileOptions | ExecFileCallback,
  optionsOrCallback?: ExecFileOptions | ExecFileCallback,
  maybeCallback?: ExecFileCallback,
): ChildProcess {
  let args: string[] = [];
  let options: ExecFileOptions = {};
  let callback: ExecFileCallback | undefined;

  if (Array.isArray(argsOrOptionsOrCallback)) {
    args = argsOrOptionsOrCallback;
  } else if (argsOrOptionsOrCallback instanceof Function) {
    callback = argsOrOptionsOrCallback;
  } else if (argsOrOptionsOrCallback) {
    options = argsOrOptionsOrCallback;
  }
  if (optionsOrCallback instanceof Function) {
    callback = optionsOrCallback;
  } else if (optionsOrCallback) {
    options = optionsOrCallback;
    callback = maybeCallback;
  }

  const execOptions = {
    encoding: "utf8",
    timeout: 0,
    maxBuffer: MAX_BUFFER,
    killSignal: "SIGTERM",
    shell: false,
    ...options,
  };
  if (!Number.isInteger(execOptions.timeout) || execOptions.timeout < 0) {
    // In Node source, the first argument to error constructor is "timeout" instead of "options.timeout".
    // timeout is indeed a member of options object.
    throw new ERR_OUT_OF_RANGE(
      "timeout",
      "an unsigned integer",
      execOptions.timeout,
    );
  }
  if (execOptions.maxBuffer < 0) {
    throw new ERR_OUT_OF_RANGE(
      "options.maxBuffer",
      "a positive number",
      execOptions.maxBuffer,
    );
  }
  const spawnOptions: SpawnOptions = {
    cwd: execOptions.cwd,
    env: execOptions.env,
    gid: execOptions.gid,
    shell: execOptions.shell,
    signal: execOptions.signal,
    uid: execOptions.uid,
    windowsHide: !!execOptions.windowsHide,
    windowsVerbatimArguments: !!execOptions.windowsVerbatimArguments,
  };

  const child = spawn(file, args, spawnOptions);

  let encoding: string | null;
  const _stdout: (string | Uint8Array)[] = [];
  const _stderr: (string | Uint8Array)[] = [];
  if (
    execOptions.encoding !== "buffer" && Buffer.isEncoding(execOptions.encoding)
  ) {
    encoding = execOptions.encoding;
  } else {
    encoding = null;
  }
  let stdoutLen = 0;
  let stderrLen = 0;
  let killed = false;
  let exited = false;
  let timeoutId: number | null;

  let ex: ChildProcessError | null = null;

  let cmd = file;

  function exithandler(code = 0, signal?: AbortSignal) {
    if (exited) return;
    exited = true;

    if (timeoutId) {
      clearTimeout(timeoutId);
      timeoutId = null;
    }

    if (!callback) return;

    // merge chunks
    let stdout;
    let stderr;
    if (
      encoding ||
      (
        child.stdout &&
        child.stdout.readableEncoding
      )
    ) {
      stdout = _stdout.join("");
    } else {
      stdout = Buffer.concat(_stdout as Buffer[]);
    }
    if (
      encoding ||
      (
        child.stderr &&
        child.stderr.readableEncoding
      )
    ) {
      stderr = _stderr.join("");
    } else {
      stderr = Buffer.concat(_stderr as Buffer[]);
    }

    if (!ex && code === 0 && signal === null) {
      callback(null, stdout, stderr);
      return;
    }

    if (args?.length) {
      cmd += ` ${args.join(" ")}`;
    }

    if (!ex) {
      ex = new ExecFileError(
        "Command failed: " + cmd + "\n" + stderr,
      );
      ex.code = code < 0 ? getSystemErrorName(code) : code;
      ex.killed = child.killed || killed;
      ex.signal = signal;
    }

    ex.cmd = cmd;
    callback(ex, stdout, stderr);
  }

  function errorhandler(e: ExecFileError) {
    ex = e;

    if (child.stdout) {
      child.stdout.destroy();
    }

    if (child.stderr) {
      child.stderr.destroy();
    }

    exithandler();
  }

  function kill() {
    if (child.stdout) {
      child.stdout.destroy();
    }

    if (child.stderr) {
      child.stderr.destroy();
    }

    killed = true;
    try {
      child.kill(execOptions.killSignal);
    } catch (e) {
      if (e) {
        ex = e as ChildProcessError;
      }
      exithandler();
    }
  }

  if (execOptions.timeout > 0) {
    timeoutId = setTimeout(function delayedKill() {
      kill();
      timeoutId = null;
    }, execOptions.timeout);
  }

  if (child.stdout) {
    if (encoding) {
      child.stdout.setEncoding(encoding);
    }

    child.stdout.on("data", function onChildStdout(chunk: string | Buffer) {
      // Do not need to count the length
      if (execOptions.maxBuffer === Infinity) {
        ArrayPrototypePush(_stdout, chunk);
        return;
      }

      const encoding = child.stdout?.readableEncoding;
      const length = encoding
        ? Buffer.byteLength(chunk, encoding)
        : chunk.length;
      const slice = encoding
        ? StringPrototypeSlice
        : (buf: string | Buffer, ...args: number[]) => buf.slice(...args);
      stdoutLen += length;

      if (stdoutLen > execOptions.maxBuffer) {
        const truncatedLen = execOptions.maxBuffer - (stdoutLen - length);
        ArrayPrototypePush(_stdout, slice(chunk, 0, truncatedLen));

        ex = new ERR_CHILD_PROCESS_STDIO_MAXBUFFER("stdout");
        kill();
      } else {
        ArrayPrototypePush(_stdout, chunk);
      }
    });
  }

  if (child.stderr) {
    if (encoding) {
      child.stderr.setEncoding(encoding);
    }

    child.stderr.on("data", function onChildStderr(chunk: string | Buffer) {
      // Do not need to count the length
      if (execOptions.maxBuffer === Infinity) {
        ArrayPrototypePush(_stderr, chunk);
        return;
      }

      const encoding = child.stderr?.readableEncoding;
      const length = encoding
        ? Buffer.byteLength(chunk, encoding)
        : chunk.length;
      const slice = encoding
        ? StringPrototypeSlice
        : (buf: string | Buffer, ...args: number[]) => buf.slice(...args);
      stderrLen += length;

      if (stderrLen > execOptions.maxBuffer) {
        const truncatedLen = execOptions.maxBuffer - (stderrLen - length);
        ArrayPrototypePush(_stderr, slice(chunk, 0, truncatedLen));

        ex = new ERR_CHILD_PROCESS_STDIO_MAXBUFFER("stderr");
        kill();
      } else {
        ArrayPrototypePush(_stderr, chunk);
      }
    });
  }

  child.addListener("close", exithandler);
  child.addListener("error", errorhandler);

  return child;
}

export function execSync() {
  throw new Error("execSync is currently not supported");
}

export default {
  fork,
  spawn,
  exec,
  execFile,
  execSync,
  ChildProcess,
  spawnSync,
};
export { ChildProcess };
