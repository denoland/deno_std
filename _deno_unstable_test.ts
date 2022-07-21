// Copyright 2018-2022 the Deno authors. All rights reserved. MIT license.
import { assertEquals } from "./testing/asserts.ts";

Deno.test({
  name: "_deno_unstable.ts complies with --unstable if type checked",
  async fn() {
    const denoUnstableUrl = new URL("_deno_unstable.ts", import.meta.url);
    const denoUnstableCheckedUrl = new URL(
      "_deno_unstable_checked.ts",
      import.meta.url,
    );
    const code = await Deno.readTextFile(denoUnstableUrl);
    const checkedCode = `// AUTOGENERATED\n${code.replace("@ts-nocheck ", "")}`;
    try {
      await Deno.writeTextFile(denoUnstableCheckedUrl, checkedCode);
      const { code } = await Deno.spawn(Deno.execPath(), {
        args: [
          "run",
          "--quiet",
          "--unstable",
          denoUnstableCheckedUrl.href,
        ],
        stdout: "inherit",
        stderr: "inherit",
      });
      assertEquals(code, 0);
    } finally {
      // TODO(nayeemrmn): Uncomment (https://github.com/denoland/deno_std/pull/1819#issuecomment-1011136991).
      // await Deno.remove(denoUnstableCheckedUrl, {}).catch(() => {});
    }
  },
});
