// Copyright 2018-2024 the Deno authors. All rights reserved. MIT license.
import { assertEquals, assertRejects, assertThrows } from "../assert/mod.ts";
import * as path from "../path/mod.ts";
import { ensureDir, ensureDirSync } from "./ensure_dir.ts";
import { ensureFile, ensureFileSync } from "./ensure_file.ts";

const moduleDir = path.dirname(path.fromFileUrl(import.meta.url));
const testdataDir = path.resolve(moduleDir, "testdata", "ensure_dir");

Deno.test("ensureDir() creates dir if it does not exist", async function () {
  const baseDir = path.join(testdataDir, "not_exist");
  const testDir = path.join(baseDir, "test");

  try {
    await ensureDir(testDir);

    // test dir should exists.
    await Deno.stat(testDir);
  } finally {
    await Deno.remove(baseDir, { recursive: true });
  }
});

Deno.test("ensureDirSync() creates dir if it does not exist", function () {
  const baseDir = path.join(testdataDir, "sync_not_exist");
  const testDir = path.join(baseDir, "test");

  try {
    ensureDirSync(testDir);

    // test dir should exists.
    Deno.statSync(testDir);
  } finally {
    Deno.removeSync(baseDir, { recursive: true });
  }
});

Deno.test("ensureDir() ensures existing dir exists", async function () {
  const baseDir = path.join(testdataDir, "exist");
  const testDir = path.join(baseDir, "test");

  try {
    // create test directory
    await Deno.mkdir(testDir, { recursive: true });

    await ensureDir(testDir);

    // test dir should still exists.
    await Deno.stat(testDir);
  } finally {
    await Deno.remove(baseDir, { recursive: true });
  }
});

Deno.test("ensureDirSync() ensures existing dir exists", function () {
  const baseDir = path.join(testdataDir, "sync_exist");
  const testDir = path.join(baseDir, "test");

  try {
    // create test directory
    Deno.mkdirSync(testDir, { recursive: true });

    ensureDirSync(testDir);

    // test dir should still exists.
    Deno.statSync(testDir);
  } finally {
    Deno.removeSync(baseDir, { recursive: true });
  }
});

Deno.test("ensureDir() accepts links to dirs", async function () {
  const ldir = path.join(testdataDir, "ldir");

  await ensureDir(ldir);

  // test dir should still exists.
  await Deno.stat(ldir);
  // ldir should be still be a symlink
  const { isSymlink } = await Deno.lstat(ldir);
  assertEquals(isSymlink, true);
});

Deno.test("ensureDirSync() accepts links to dirs", function () {
  const ldir = path.join(testdataDir, "ldir");

  ensureDirSync(ldir);

  // test dir should still exists.
  Deno.statSync(ldir);
  // ldir should be still be a symlink
  const { isSymlink } = Deno.lstatSync(ldir);
  assertEquals(isSymlink, true);
});

Deno.test("ensureDir() rejects if input is a file", async function () {
  const baseDir = path.join(testdataDir, "exist_file");
  const testFile = path.join(baseDir, "test");

  try {
    await ensureFile(testFile);

    await assertRejects(
      async () => {
        await ensureDir(testFile);
      },
      Error,
      `Ensure path exists, expected 'dir', got 'file'`,
    );
  } finally {
    await Deno.remove(baseDir, { recursive: true });
  }
});

Deno.test("ensureDirSync() throws if input is a file", function () {
  const baseDir = path.join(testdataDir, "exist_file_async");
  const testFile = path.join(baseDir, "test");

  try {
    ensureFileSync(testFile);

    assertThrows(
      () => {
        ensureDirSync(testFile);
      },
      Error,
      `Ensure path exists, expected 'dir', got 'file'`,
    );
  } finally {
    Deno.removeSync(baseDir, { recursive: true });
  }
});

Deno.test("ensureDir() rejects links to files", async function () {
  const lf = path.join(testdataDir, "lf");

  await assertRejects(
    async () => {
      await ensureDir(lf);
    },
    Error,
    `Ensure path exists, expected 'dir', got 'file'`,
  );
});

Deno.test("ensureDirSync() rejects links to files", function () {
  const lf = path.join(testdataDir, "lf");

  assertThrows(
    () => {
      ensureDirSync(lf);
    },
    Error,
    `Ensure path exists, expected 'dir', got 'file'`,
  );
});

Deno.test({
  name: "ensureDir() rejects permission fs write error",
  permissions: { read: true },
  async fn() {
    const baseDir = path.join(testdataDir, "without_permission");

    // ensureDir fails because this test doesn't have write permissions,
    // but don't swallow that error.
    await assertRejects(
      async () => await ensureDir(baseDir),
      Deno.errors.PermissionDenied,
    );
  },
});

Deno.test({
  name: "ensureDirSync() throws permission fs write error",
  permissions: { read: true },
  fn() {
    const baseDir = path.join(
      testdataDir,
      "sync_without_permission",
    );

    // ensureDirSync fails because this test doesn't have write permissions,
    // but don't swallow that error.
    assertThrows(
      () => ensureDirSync(baseDir),
      Deno.errors.PermissionDenied,
    );
  },
});
