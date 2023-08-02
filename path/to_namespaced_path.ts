// Copyright 2018-2023 the Deno authors. All rights reserved. MIT license.
// This module is browser compatible.

import { isWindows } from "../_util/os.ts";
import {
  CHAR_BACKWARD_SLASH,
  CHAR_COLON,
  CHAR_DOT,
  CHAR_QUESTION_MARK,
} from "./_constants.ts";
import { isWindowsDeviceRoot } from "./_util.ts";
import { resolve } from "./resolve.ts";

function windowsToNamespacedPath(path: string): string {
  // Note: this will *probably* throw somewhere.
  if (typeof path !== "string") return path;
  if (path.length === 0) return "";

  // TODO(lino-levan): specify windows as OS
  const resolvedPath = resolve(path);

  if (resolvedPath.length >= 3) {
    if (resolvedPath.charCodeAt(0) === CHAR_BACKWARD_SLASH) {
      // Possible UNC root

      if (resolvedPath.charCodeAt(1) === CHAR_BACKWARD_SLASH) {
        const code = resolvedPath.charCodeAt(2);
        if (code !== CHAR_QUESTION_MARK && code !== CHAR_DOT) {
          // Matched non-long UNC root, convert the path to a long UNC path
          return `\\\\?\\UNC\\${resolvedPath.slice(2)}`;
        }
      }
    } else if (isWindowsDeviceRoot(resolvedPath.charCodeAt(0))) {
      // Possible device root

      if (
        resolvedPath.charCodeAt(1) === CHAR_COLON &&
        resolvedPath.charCodeAt(2) === CHAR_BACKWARD_SLASH
      ) {
        // Matched device root, convert the path to a long UNC path
        return `\\\\?\\${resolvedPath}`;
      }
    }
  }

  return path;
}

/**
 * Resolves path to a namespace path
 * @param path to resolve to namespace
 */
export function toNamespacedPath(path: string): string {
  if (isWindows) {
    return windowsToNamespacedPath(path);
  }

  // Non-op on posix systems
  return path;
}
