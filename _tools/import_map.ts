// Copyright 2018-2024 the Deno authors. All rights reserved. MIT license.

/**
 * This script generates the `import_map.json` file based on the `deno.json`
 * files in the workspaces.
 *
 * Tasks:
 * - `deno run -A _tools/import_map.ts update` will update the `import_map.json`
 * - `deno run -A _tools/import_map.ts check` will check if the
 *   `import_map.json` is up-to-date
 */

import rootDenoConfig from "../deno.json" with { type: "json" };
import { join } from "../path/posix/join.ts";
import { assertEquals } from "../assert/assert_equals.ts";

const importMap: { imports: Record<string, string> } = { imports: {} };
for (const workspace of rootDenoConfig.workspaces) {
  const { default: pkgDenoConfig } = await import(
    `../${workspace}/deno.json`,
    {
      with: { type: "json" },
    }
  );

  if (typeof pkgDenoConfig.exports === "string") {
    importMap.imports[pkgDenoConfig.name] = `./${
      join(workspace, pkgDenoConfig.exports)
    }`;
  } else {
    for (
      const [moduleName, modulePath] of Object.entries(
        pkgDenoConfig.exports as Record<string, string>,
      )
    ) {
      importMap.imports[join(pkgDenoConfig.name, moduleName)] = `./${
        join(workspace, modulePath)
      }`;
    }
  }
}

if (Deno.args[0] === "update") {
  await Deno.writeTextFile(
    "./import_map.json",
    JSON.stringify(importMap, null, 2),
  );
} else if (Deno.args[0] === "check") {
  const currentImportMap = await import("../import_map.json", {
    with: { type: "json" },
  });
  assertEquals(
    currentImportMap.default,
    importMap,
    "`import_map.json` is outdated",
  );
}
