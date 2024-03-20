// Copyright 2018-2024 the Deno authors. All rights reserved. MIT license.

import {
  assert,
  assertEquals,
  assertRejects,
  assertStrictEquals,
  assertThrows,
} from "../assert/mod.ts";
import {
  load,
  type LoadOptions,
  loadSync,
  MissingEnvVarsError,
} from "./mod.ts";
import * as path from "../path/mod.ts";

const moduleDir = path.dirname(path.fromFileUrl(import.meta.url));
const testdataDir = path.resolve(moduleDir, "testdata");

const testOptions = Object.freeze({
  envPath: path.join(testdataDir, ".env"),
  defaultsPath: path.join(testdataDir, ".env.defaults"),
});

Deno.test("load() handles non-existent .env files", async () => {
  //n.b. neither .env nor .env.default exist in the current directory
  assertEquals({}, await load());
  assertEquals({}, loadSync());

  const loadOptions = {
    envPath: "some.nonexistent.env",
    examplePath: "some.nonexistent.example",
    defaultsPath: "some.nonexistent.defaults",
  };
  assertEquals({}, await load(loadOptions));
  assertEquals({}, loadSync(loadOptions));
});

Deno.test("load() handles build from .env.default only", async () => {
  const conf = loadSync({
    defaultsPath: path.join(testdataDir, ".env.defaults"),
  });
  assertEquals(conf.DEFAULT1, "Some Default", "loaded from .env.default");

  const asyncConf = await load({
    defaultsPath: path.join(testdataDir, ".env.defaults"),
  });
  assertEquals(asyncConf.DEFAULT1, "Some Default", "loaded from .env.default");
});

Deno.test("load() handles comprised .env and .env.defaults", async () => {
  const conf = loadSync(testOptions);
  assertEquals(conf.GREETING, "hello world", "loaded from .env");
  assertEquals(conf.DEFAULT1, "Some Default", "loaded from .env.default");

  const asyncConf = await load(testOptions);
  assertEquals(asyncConf.GREETING, "hello world", "loaded from .env");
  assertEquals(asyncConf.DEFAULT1, "Some Default", "loaded from .env.default");
});

Deno.test("load() handles exported entries accessibility in Deno.env", async () => {
  assert(Deno.env.get("GREETING") === undefined, "GREETING is not set");
  assert(Deno.env.get("DEFAULT1") === undefined, "DEFAULT1 is not set");

  loadSync({ ...testOptions, export: true });
  validateExport();

  await load({ ...testOptions, export: true });
  validateExport();
});

function validateExport(): void {
  try {
    assertEquals(
      Deno.env.get("GREETING"),
      "hello world",
      "exported from .env -> Deno.env",
    );
    assertEquals(
      Deno.env.get("DEFAULT1"),
      "Some Default",
      "exported from .env.default -> Deno.env",
    );
  } finally {
    Deno.env.delete("GREETING");
    Deno.env.delete("DEFAULT1");
  }
}

Deno.test("load() process does not overridde env vars by .env values", async () => {
  Deno.env.set("GREETING", "Do not override!");
  assert(Deno.env.get("DEFAULT1") === undefined, "DEFAULT1 is not set");

  validateNotOverridden(loadSync({ ...testOptions, export: true }));
  validateNotOverridden(await load({ ...testOptions, export: true }));
});

function validateNotOverridden(conf: Record<string, string>): void {
  try {
    assertEquals(conf.GREETING, "hello world", "value from .env");
    assertEquals(
      Deno.env.get("GREETING"),
      "Do not override!",
      "not exported from .env -> Deno.env",
    );
    assertEquals(
      Deno.env.get("DEFAULT1"),
      "Some Default",
      "exported from .env.default -> Deno.env",
    );
  } finally {
    Deno.env.delete("DEFAULT1");
  }
}

Deno.test("load() handles example file key in .env, no issues loading", async () => {
  //Both .env.example.test and .env contain "GREETING"
  const loadOptions = {
    ...testOptions,
    examplePath: path.join(testdataDir, "./.env.example.test"),
  };
  loadSync(loadOptions);
  await load(loadOptions);
});

Deno.test("load() handles example file key in .env.default, no issues loading", async () => {
  //Both .env.example3.test and .env.default contain "DEFAULT1"
  const loadOptions = {
    ...testOptions,
    examplePath: path.join(testdataDir, "./.env.example3.test"),
  };
  loadSync(loadOptions);
  await load(loadOptions);
});

Deno.test("load() handles example file key not in .env or .env.defaults, error thrown", async () => {
  // Example file key of "ANOTHER" is not present in .env or .env.defaults
  const error: MissingEnvVarsError = assertThrows(() => {
    loadSync({
      ...testOptions,
      examplePath: path.join(testdataDir, "./.env.example2.test"),
    });
  }, MissingEnvVarsError);

  assertEquals(error.missing, ["ANOTHER"]);

  const asyncError: MissingEnvVarsError = await assertRejects(async () => {
    await load({
      ...testOptions,
      examplePath: path.join(testdataDir, "./.env.example2.test"),
    });
  }, MissingEnvVarsError);

  assertEquals(asyncError.missing, ["ANOTHER"]);
});

Deno.test("load() handles omitted allowEmptyValues, empty required keys throw error", async () => {
  // Example file key of "ANOTHER" is present but empty in .env
  const error: MissingEnvVarsError = assertThrows(() => {
    loadSync({
      envPath: path.join(testdataDir, "./.env.required.empty.test"),
      examplePath: path.join(testdataDir, "./.env.example2.test"),
    });
  }, MissingEnvVarsError);

  assertEquals(error.missing, ["ANOTHER"]);

  const asyncError: MissingEnvVarsError = await assertRejects(async () => {
    await load({
      envPath: path.join(testdataDir, "./.env.required.empty.test"),
      examplePath: path.join(testdataDir, "./.env.example2.test"),
    });
  }, MissingEnvVarsError);

  assertEquals(asyncError.missing, ["ANOTHER"]);
});

Deno.test("load() handles allowEmptyValues, empty required keys do not throw error", async () => {
  // Example file key of "ANOTHER" is present but empty in .env
  const loadOptions = {
    envPath: path.join(testdataDir, "./.env.required.empty.test"),
    examplePath: path.join(testdataDir, "./.env.example2.test"),
    allowEmptyValues: true,
  };

  loadSync(loadOptions);
  await load(loadOptions);
});

Deno.test("load() checks that required keys can be sourced from process environment", async () => {
  try {
    Deno.env.set("ANOTHER", "VAR");

    // Example file key of "ANOTHER" is not present in .env or .env.defaults
    const loadOptions = {
      envPath: path.join(testdataDir, "./.env"),
      examplePath: path.join(testdataDir, "./.env.example2.test"),
    };

    loadSync(loadOptions);
    await load(loadOptions);
  } finally {
    Deno.env.delete("ANOTHER");
  }
});

Deno.test("load() checks that required keys sourced from process environment cannot be empty", async () => {
  try {
    Deno.env.set("ANOTHER", "");

    // Example file key of "ANOTHER" is not present in .env or .env.defaults
    const loadOptions = {
      envPath: path.join(testdataDir, "./.env"),
      examplePath: path.join(testdataDir, "./.env.example2.test"),
    };

    const error: MissingEnvVarsError = assertThrows(() => {
      loadSync(loadOptions);
    }, MissingEnvVarsError);

    assertEquals(error.missing, ["ANOTHER"]);

    const asyncError: MissingEnvVarsError = await assertRejects(async () => {
      await load(loadOptions);
    }, MissingEnvVarsError);

    assertEquals(asyncError.missing, ["ANOTHER"]);
  } finally {
    Deno.env.delete("ANOTHER");
  }
});

Deno.test("load() checks that required keys sourced from process environment can be empty with allowEmptyValues", async () => {
  try {
    Deno.env.set("ANOTHER", "");

    // Example file key of "ANOTHER" is not present in .env or .env.defaults
    const loadOptions = {
      envPath: path.join(testdataDir, "./.env"),
      examplePath: path.join(testdataDir, "./.env.example2.test"),
      allowEmptyValues: true,
    };

    loadSync(loadOptions);
    await load(loadOptions);
  } finally {
    Deno.env.delete("ANOTHER");
  }
});

Deno.test("load() loads .env and .env.defaults successfully from default file names/paths", async () => {
  const command = new Deno.Command(Deno.execPath(), {
    args: [
      "run",
      "--no-lock",
      "--allow-read",
      "--allow-env",
      path.join(testdataDir, "./app_defaults.ts"),
    ],
    cwd: testdataDir,
  });
  const { stdout } = await command.output();

  const decoder = new TextDecoder();
  const conf = JSON.parse(decoder.decode(stdout).trim());

  assertEquals(conf.GREETING, "hello world", "fetches .env by default");
  assertEquals(conf.DEFAULT1, "Some Default", "default value loaded");
});

Deno.test("load() checks that expected variables are found after loading from the filesystem", async () => {
  const loadOptions = {
    envPath: path.join(testdataDir, "./.env"),
    examplePath: path.join(testdataDir, "./.env.example"),
    defaultsPath: path.join(testdataDir, "./.env.defaults"),
    expectVars: ["GREETING", "DEFAULT1"] as const,
  } satisfies LoadOptions;
  const loadOptionsToFail = {
    envPath: path.join(testdataDir, "./.env"),
    examplePath: path.join(testdataDir, "./.env.example"),
    defaultsPath: path.join(testdataDir, "./.env.defaults"),
    expectVars: ["GREETING", "DEFAULT1", "WHERE_AM_I"] as const,
  } satisfies LoadOptions;

  const conf = loadSync(loadOptions);
  assertEquals(conf.GREETING, "hello world", "loaded from .env");
  assertEquals(
    conf.DEFAULT1,
    "Some Default",
    "default value from the defaults file",
  );

  const confAsync = await load(loadOptions);
  assertEquals(confAsync.GREETING, "hello world", "loaded from .env");
  assertEquals(
    confAsync.DEFAULT1,
    "Some Default",
    "default value from the defaults file",
  );

  const error: MissingEnvVarsError = assertThrows(
    () => loadSync(loadOptionsToFail),
    MissingEnvVarsError,
  );

  assertEquals(error.missing, ["WHERE_AM_I"]);

  const asyncError: MissingEnvVarsError = await assertRejects(
    async () => await load(loadOptionsToFail),
    MissingEnvVarsError,
  );

  assertEquals(asyncError.missing, ["WHERE_AM_I"]);
});

Deno.test("load() expands empty values from process env expand as empty value", async () => {
  try {
    Deno.env.set("EMPTY", "");

    // .env.single.expand contains one key which expands to the "EMPTY" process env var
    const loadOptions = {
      envPath: path.join(testdataDir, "./.env.single.expand"),
      allowEmptyValues: true,
    };

    const conf = loadSync(loadOptions);
    assertEquals(
      conf.EXPECT_EMPTY,
      "",
      "empty value expanded from process env",
    );

    const asyncConf = await load(loadOptions);
    assertEquals(
      asyncConf.EXPECT_EMPTY,
      "",
      "empty value expanded from process env",
    );
  } finally {
    Deno.env.delete("EMPTY");
  }
});

Deno.test(
  "loadSync() checks that --allow-env is not required if no process env vars are expanded upon",
  {
    permissions: {
      read: true,
    },
  },
  () => {
    // note lack of --allow-env permission
    const conf = loadSync(testOptions);
    assertEquals(conf.GREETING, "hello world");
    assertEquals(conf.DEFAULT1, "Some Default");
  },
);

Deno.test(
  "loadSync() checks that --allow-env is required when process env vars are expanded upon",
  {
    permissions: {
      read: true,
    },
  },
  () => {
    // ./app_permission_test.ts loads a .env with one key which expands a process env var
    // note lack of --allow-env permission
    const loadOptions = {
      envPath: path.join(testdataDir, "./.env.single.expand"),
      defaultsPath: null,
      examplePath: null,
    };
    assertThrows(
      () => loadSync(loadOptions),
      Deno.errors.PermissionDenied,
      `Requires env access to "EMPTY", run again with the --allow-env flag`,
    );
  },
);

Deno.test(
  "loadSync() checks that --allow-env restricted access works when process env vars are expanded upon",
  {
    permissions: {
      read: true,
      env: ["EMPTY"],
    },
  },
  () => {
    try {
      Deno.env.set("EMPTY", "");

      const loadOptions = {
        envPath: path.join(testdataDir, "./.env.single.expand"),
        defaultsPath: null,
        examplePath: null,
      };
      const conf = loadSync(loadOptions);
      assertEquals(
        conf.EXPECT_EMPTY,
        "",
        "empty value expanded from process env",
      );
    } finally {
      Deno.env.delete("EMPTY");
    }
  },
);

//TODO test permissions

Deno.test(
  "loadSync() prevents file system reads of default path parameter values by using explicit null",
  {
    permissions: {
      env: ["GREETING", "DO_NOT_OVERRIDE"],
      read: [path.join(testdataDir, "./.env.multiple")],
    },
  },
  async (t) => {
    const optsNoPaths = {
      defaultsPath: null,
      envPath: null,
      examplePath: null,
    } satisfies LoadOptions;

    const optsEnvPath = {
      envPath: path.join(testdataDir, "./.env.multiple"),
    } satisfies LoadOptions;

    const optsOnlyEnvPath = {
      ...optsEnvPath,
      defaultsPath: null,
      examplePath: null,
    } satisfies LoadOptions;

    const assertEnv = (env: Record<string, string>): void => {
      assertStrictEquals(Object.keys(env).length, 2);
      assertStrictEquals(env["GREETING"], "hello world");
      assertStrictEquals(env["DO_NOT_OVERRIDE"], "overridden");
    };

    await t.step("load", async () => {
      assertStrictEquals(Object.keys(await load(optsNoPaths)).length, 0);
      assertEnv(await load(optsOnlyEnvPath));

      await assertRejects(
        () => load(optsEnvPath),
        Deno.errors.PermissionDenied,
        `Requires read access to ".env.defaults"`,
      );

      await assertRejects(
        () => load({ ...optsEnvPath, defaultsPath: null }),
        Deno.errors.PermissionDenied,
        `Requires read access to ".env.example"`,
      );

      await assertRejects(
        () => load({ ...optsEnvPath, examplePath: null }),
        Deno.errors.PermissionDenied,
        `Requires read access to ".env.defaults"`,
      );
    });

    await t.step("loadSync", () => {
      assertStrictEquals(Object.keys(loadSync(optsNoPaths)).length, 0);
      assertEnv(loadSync(optsOnlyEnvPath));

      assertThrows(
        () => loadSync(optsEnvPath),
        Deno.errors.PermissionDenied,
        `Requires read access to ".env.defaults"`,
      );

      assertThrows(
        () => loadSync({ ...optsEnvPath, defaultsPath: null }),
        Deno.errors.PermissionDenied,
        `Requires read access to ".env.example"`,
      );

      assertThrows(
        () => loadSync({ ...optsEnvPath, examplePath: null }),
        Deno.errors.PermissionDenied,
        `Requires read access to ".env.defaults"`,
      );
    });
  },
);
