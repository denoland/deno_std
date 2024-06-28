// Copyright 2018-2024 the Deno authors. All rights reserved. MIT license.
// This module is browser compatible.

export const isWindows: boolean = getIsWindows() === true;

function getIsWindows(): boolean | undefined {
  return (
    getIsWindowsOnDeno() || getIsWindowsOnBrowser() || getIsWindowsOnNodeOrBun()
  );
}

/**
 * @returns whether the os is windows or undefined if not running
 * in a deno runtime, undefined if not a deno runtime.
 */
function getIsWindowsOnDeno(): boolean | undefined {
  // deno-lint-ignore no-explicit-any
  const { Deno } = globalThis as any;
  if (typeof Deno?.build?.os === "string") {
    return Deno.build.os === "windows";
  }
}

/**
 * @returns whether the os is windows or undefined if not running
 * in a web browser, undefined if not a web browser
 */
function getIsWindowsOnBrowser(): boolean | undefined {
  // deno-lint-ignore no-explicit-any
  const { navigator } = globalThis as any;

  return containsWindows(navigator?.userAgent);
}

declare const process: { platform?: string } | undefined;

/**
 * according to documentation node's os module is implemented
 * in bun as well.
 * {@link https://bun.sh/docs/runtime/nodejs-apis#node-os}
 *
 * @returns whether the os is windows or undefined if not running
 * on node or bun runtime
 */
function getIsWindowsOnNodeOrBun(): boolean | undefined {
  try {
    return process?.platform === "win32";
  } catch {
    return undefined;
  }
}

function containsWindows(s?: string): boolean | undefined {
  if (typeof s === "string") {
    return s.toUpperCase().includes("WINDOWS");
  } else {
    return undefined;
  }
}
