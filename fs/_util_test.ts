// Copyright 2018-2023 the Deno authors. All rights reserved. MIT license.
// Copyright the Browserify authors. MIT License.

import { assertEquals } from "../testing/asserts.ts";
import * as path from "../path/mod.ts";
import { getFileInfoType, isSamePath, isSubdir, PathType } from "./_util.ts";
import { ensureFileSync } from "./ensure_file.ts";
import { ensureDirSync } from "./ensure_dir.ts";

const moduleDir = path.dirname(path.fromFileUrl(import.meta.url));
const testdataDir = path.resolve(moduleDir, "testdata");

Deno.test("_isSubdir", function () {
  const pairs = [
    ["", "", false, path.posix.sep],
    ["/first/second", "/first", false, path.posix.sep],
    ["/first", "/first", false, path.posix.sep],
    ["/first", "/first/second", true, path.posix.sep],
    ["first", "first/second", true, path.posix.sep],
    ["../first", "../first/second", true, path.posix.sep],
    ["c:\\first", "c:\\first", false, path.win32.sep],
    ["c:\\first", "c:\\first\\second", true, path.win32.sep],
  ];

  pairs.forEach(function (p) {
    const src = p[0] as string;
    const dest = p[1] as string;
    const expected = p[2] as boolean;
    const sep = p[3] as string;
    assertEquals(
      isSubdir(src, dest, sep),
      expected,
      `'${src}' should ${expected ? "" : "not"} be parent dir of '${dest}'`,
    );
  });
});

Deno.test("_getFileInfoType", function () {
  const pairs = [
    [path.join(testdataDir, "file_type_1"), "file"],
    [path.join(testdataDir, "file_type_dir_1"), "dir"],
  ];

  pairs.forEach(function (p) {
    const filePath = p[0] as string;
    const type = p[1] as PathType;
    switch (type) {
      case "file":
        ensureFileSync(filePath);
        break;
      case "dir":
        ensureDirSync(filePath);
        break;
      case "symlink":
        // TODO(axetroy): test symlink
        break;
    }

    const stat = Deno.statSync(filePath);

    Deno.removeSync(filePath, { recursive: true });

    assertEquals(getFileInfoType(stat), type);
  });
});

Deno.test("_isSamePath", function () {
  const pairs = [
    ["", "", true, path.posix.sep],
    ["/test", "/test/", true, path.posix.sep],
    ["/test", new URL("file:///test"), true, path.posix.sep],
    ["/test", new URL("file:///test/test"), false, path.posix.sep],
    ["/test", "/test/test", false, path.posix.sep],
    ["/test", "/test/test/..", true, path.posix.sep],
    ["C:\\test", "C:\\test", true, path.win32.sep],
    ["C:\\test", "C:\\test\\test", false, path.win32.sep],
    ["C:\\test", new URL("file:///C:/test"), true, path.win32.sep],
    ["C:\\test", new URL("file:///C:/test/test"), false, path.win32.sep],
  ];

  pairs.forEach(function (p) {
    const src = p[0] as string | URL;
    const dest = p[1] as string | URL;
    const expected = p[2] as boolean;

    assertEquals(
      isSamePath(src, dest),
      expected,
      `'${src}' should ${expected ? "" : "not"} be the same as '${dest}'`,
    );
  });
});
