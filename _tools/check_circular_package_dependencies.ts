// deno-lint-ignore-file camelcase
// Copyright 2018-2024 the Deno authors. All rights reserved. MIT license.
import {
  createGraph,
  type ModuleGraphJson,
  type ModuleJson,
} from "@deno/graph";
import { resolveWorkspaceSpecifiers } from "./utils.ts";
import graphviz from "graphviz";
import { parse } from "../semver/parse.ts";

/**
 * Checks for circular dependencies in the std packages.
 *
 * Usage: deno run -A _tools/check_circular_package_dependencies.ts
 *
 * `--graph` option outputs graphviz diagram. You can convert the output to
 * a visual graph using tools like https://dreampuf.github.io/GraphvizOnline/
 *
 * $ deno run -A _tools/check_circular_package_dependencies.ts --graph
 *
 * `--table` option outputs a table of packages and their status.
 *
 * $ deno run -A _tools/check_circular_package_dependencies.ts --table
 *
 * `--all-imports` option outputs script to import all packages.
 *
 * $ deno run -A _tools/check_circular_package_dependencies.ts --all-imports
 */

type DepState = "Stable" | "Unstable";
type Dep = {
  name: string;
  set: Set<string>;
  state: DepState;
};
type Mod =
  | "archive"
  | "assert"
  | "async"
  | "bytes"
  | "cache"
  | "cli"
  | "collections"
  | "crypto"
  | "csv"
  | "data_structures"
  | "datetime"
  | "dotenv"
  | "encoding"
  | "expect"
  | "fmt"
  | "front_matter"
  | "fs"
  | "html"
  | "http"
  | "ini"
  | "internal"
  | "io"
  | "json"
  | "jsonc"
  | "log"
  | "media_types"
  | "msgpack"
  | "net"
  | "path"
  | "regexp"
  | "semver"
  | "streams"
  | "testing"
  | "text"
  | "toml"
  | "ulid"
  | "uuid"
  | "webgpu"
  | "yaml";

const ENTRYPOINTS: Record<Mod, string[]> = {
  archive: ["mod.ts"],
  assert: ["mod.ts"],
  async: ["mod.ts"],
  bytes: ["mod.ts"],
  cache: ["mod.ts"],
  cli: ["mod.ts"],
  collections: ["mod.ts"],
  crypto: ["mod.ts"],
  csv: ["mod.ts"],
  data_structures: ["mod.ts"],
  datetime: ["mod.ts"],
  dotenv: ["mod.ts"],
  encoding: ["mod.ts"],
  expect: ["mod.ts"],
  fmt: ["bytes.ts", "colors.ts", "duration.ts", "printf.ts"],
  front_matter: ["mod.ts"],
  fs: ["mod.ts"],
  html: ["mod.ts"],
  http: ["mod.ts"],
  ini: ["mod.ts"],
  internal: ["mod.ts"],
  io: ["mod.ts"],
  json: ["mod.ts"],
  jsonc: ["mod.ts"],
  log: ["mod.ts"],
  media_types: ["mod.ts"],
  msgpack: ["mod.ts"],
  net: ["mod.ts"],
  path: ["mod.ts"],
  regexp: ["mod.ts"],
  semver: ["mod.ts"],
  streams: ["mod.ts"],
  testing: ["bdd.ts", "mock.ts", "snapshot.ts", "time.ts", "types.ts"],
  text: ["mod.ts"],
  toml: ["mod.ts"],
  ulid: ["mod.ts"],
  uuid: ["mod.ts"],
  webgpu: ["mod.ts"],
  yaml: ["mod.ts"],
};

const root = new URL("../", import.meta.url).href;
const deps: Record<string, Dep> = {};

function getPackageNameFromUrl(url: string): string {
  return url.replace(root, "").split("/")[0]!;
}

async function getStability(pkg: string): Promise<DepState> {
  const config = await import(`../${pkg}/deno.json`, {
    with: { type: "json" },
  });
  const version = parse(config.default.version);
  return version.major > 0 ? "Stable" : "Unstable";
}

async function check(
  pkg: string,
  paths: string[] = ["mod.ts"],
): Promise<Dep> {
  const deps = new Set<string>();
  for (const path of paths) {
    const entrypoint = new URL(`../${pkg}/${path}`, import.meta.url).href;
    const graph = await createGraph(entrypoint, {
      resolve: resolveWorkspaceSpecifiers,
    });

    for (
      const dep of new Set(
        getPackageDepsFromSpecifier(pkg, graph, entrypoint),
      )
    ) {
      deps.add(dep);
    }
  }
  deps.delete(pkg);
  return { name: pkg, set: deps, state: await getStability(pkg) };
}

/** Returns package dependencies */
function getPackageDepsFromSpecifier(
  base: string,
  graph: ModuleGraphJson,
  specifier: string,
  seen: Set<string> = new Set(),
): Set<string> {
  const { dependencies } = graph.modules.find((item: ModuleJson) =>
    item.specifier === specifier
  )!;
  const pkg = getPackageNameFromUrl(specifier);
  const deps = new Set([pkg]);
  seen.add(specifier);
  // Captures only direct dependencies of the base package
  // i.e. Does not capture transitive dependencies
  if (dependencies && pkg === base) {
    for (const { code, type } of dependencies) {
      const specifier = code?.specifier ?? type?.specifier!;
      if (seen.has(specifier)) {
        continue;
      }
      const res = getPackageDepsFromSpecifier(
        base,
        graph,
        specifier,
        seen,
      )!;
      for (const dep of res) {
        deps.add(dep);
      }
    }
  }
  return deps;
}

for (const [mod, entrypoints] of Object.entries(ENTRYPOINTS)) {
  deps[mod] = await check(mod, entrypoints);
}

/** Checks circular deps between sub modules */
function checkCircularDeps(
  pkg: string,
  ancestors: string[] = [],
  seen: Set<string> = new Set(),
): string[] | undefined {
  const currentDeps = [...ancestors, pkg];
  if (ancestors.includes(pkg)) {
    return currentDeps;
  }
  const d = deps[pkg];
  if (!d) {
    return;
  }
  for (const mod of d.set) {
    const res = checkCircularDeps(mod, currentDeps, seen);
    if (res) {
      return res;
    }
  }
}

/** Formats label for diagram */
function formatLabel(mod: string) {
  return '"' + mod.replace(/_/g, "-\\n") + '"';
}

/** Returns node style (in DOT language) for each state */
function stateToNodeStyle(state: DepState) {
  switch (state) {
    case "Stable":
      return "[shape=circle fixedsize=1 height=1 style=filled fillcolor=lightgreen]";
    case "Unstable":
      return "[shape=circle fixedsize=1 height=1]";
  }
}

if (Deno.args.includes("--graph")) {
  const lines = [];
  lines.push("digraph std_deps {");
  for (const mod of Object.keys(deps)) {
    const info = deps[mod]!;
    lines.push(`  ${formatLabel(mod)} ${stateToNodeStyle(info.state)};`);
    for (const dep of info.set) {
      lines.push(`  ${formatLabel(mod)} -> ${formatLabel(dep)};`);
    }
  }
  lines.push("}");
  const graph = lines.join("\n");
  // Compile the graph to SVG using the `dot` layout algorithm
  const svg = await graphviz.graphviz.dot(graph, "svg");
  console.log("Writing dependency graph image to .github/dependency_graph.svg");
  await Deno.writeTextFile(".github/dependency_graph.svg", svg);
} else if (Deno.args.includes("--all-imports")) {
  for (const [mod, entrypoints] of Object.entries(ENTRYPOINTS)) {
    for (const path of entrypoints) {
      if (path === "mod.ts") {
        console.log(`import "jsr:@std/${mod.replaceAll("_", "-")}";`);
      } else {
        console.log(
          `import "jsr:@std/${mod.replaceAll("_", "-")}/${
            path.replace(".ts", "").replaceAll("_", "-")
          }";`,
        );
      }
    }
  }
} else {
  console.log(`${Object.keys(deps).length} packages checked.`);
  for (const mod of Object.keys(deps)) {
    const res = checkCircularDeps(mod);
    if (res) {
      console.log(`Circular dependencies found: ${res.join(" -> ")}`);
      Deno.exit(1);
    }
  }
  console.log("No circular dependencies found.");
}
