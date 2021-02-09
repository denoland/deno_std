import { gunzip } from "https://deno.land/x/compress@v0.3.6/gzip/gzip.ts";
import { Untar } from "../../archive/tar.ts";
import { walk } from "../../fs/walk.ts";
import { basename, fromFileUrl, join, resolve } from "../../path/mod.ts";
import { ensureFile } from "../../fs/ensure_file.ts";
import { config, ignoreList } from "./common.ts";

/**
 * This script will download and extract the test files specified in the
 * configuration file
 * 
 * It will delete any previous tests unless they are specified on the `ignore`
 * section of the configuration file
 * 
 * Usage: `deno run --allow-read --allow-net --allow-write setup.ts`
 */

const NODE_URL = "https://nodejs.org/dist/vNODE_VERSION";
const NODE_FILE = "node-vNODE_VERSION.tar.gz";

/** URL for the download */
const url = `${NODE_URL}/${NODE_FILE}`.replaceAll(
  "NODE_VERSION",
  config.nodeVersion,
);
/** Local url location */
const path = join(
  config.versionsFolder,
  NODE_FILE.replaceAll("NODE_VERSION", config.nodeVersion),
);

/**
 * This will overwrite the file if found
 * */
async function downloadFile(url: string, path: string) {
  console.log(`Downloading: ${url}...`);
  const fileContent = await fetch(url)
    .then((response) => {
      if (response.ok) {
        if (!response.body) {
          throw new Error(
            `The requested download url ${url} doesn't contain an archive to download`,
          );
        }
        return response.body.getIterator();
      } else if (response.status === 404) {
        throw new Error(
          `The requested version ${config.nodeVersion} could not be found for download`,
        );
      }
      throw new Error(`Request failed with status ${response.status}`);
    });

  const filePath = fromFileUrl(new URL(path, import.meta.url));

  await ensureFile(filePath);
  const file = await Deno.open(filePath, {
    truncate: true,
    write: true,
  });
  for await (const chunk of fileContent) {
    await Deno.write(file.rid, chunk);
  }
  file.close();
  console.log(`Downloaded: ${url} into ${path}`);
}

async function clearTests() {
  console.log("Cleaning up previous tests");

  const files = walk(
    (fromFileUrl(new URL(config.suitesFolder, import.meta.url))),
    {
      includeDirs: false,
      skip: ignoreList,
    },
  );

  for await (const file of files) {
    await Deno.remove(file.path);
  }
}

/**
 * This will iterate over the ignore and test lists defined in the
 * configuration file
 * 
 * If it were to be found in the ignore list or not found in the test list, the
 * function will return undefined, meaning the file won't be regenerated
 */
function getRequestedFileSuite(file: string): string | undefined {
  for (const regex of ignoreList) {
    if (regex.test(file)) {
      return;
    }
  }

  for (const suite in config.tests) {
    for (const regex of config.tests[suite]) {
      if (new RegExp(regex).test(file)) {
        return suite;
      }
    }
  }
}

async function decompressTests(filePath: string) {
  console.log(`Processing ${basename(filePath)}...`);
  const compressedFile = await Deno.open(
    new URL(filePath, import.meta.url),
    { read: true },
  );

  const buffer = new Deno.Buffer(gunzip(await Deno.readAll(compressedFile)));
  Deno.close(compressedFile.rid);

  const tar = new Untar(buffer);

  for await (const entry of tar) {
    if (entry.type !== "file") continue;
    const suite = getRequestedFileSuite(entry.fileName);
    if (!suite) continue;
    const path = resolve(
      fromFileUrl(new URL(config.suitesFolder, import.meta.url)),
      suite,
      basename(entry.fileName),
    );
    await ensureFile(path);
    const file = await Deno.open(path, {
      create: true,
      truncate: true,
      write: true,
    });
    // This will allow CI to pass without checking linting and formatting
    // on the test suite files, removing the need to mantain that as well
    await Deno.writeAll(
      file,
      new TextEncoder().encode(
        "// deno-fmt-ignore-file\n// deno-lint-ignore-file\n" +
          "\n// Copyright Joyent and Node contributors. All rights reserved. MIT license.\n" +
          `// Taken from Node ${config.nodeVersion}\n` +
          '// This file is automatically generated by "node/tools/setup.ts". Do not modify this file manually\n\n',
      ),
    );
    await Deno.copy(entry, file);
    Deno.close(file.rid);
  }
}

let shouldDownload = false;
try {
  Deno.lstatSync(new URL(path, import.meta.url)).isFile;
  while (true) {
    const r = (prompt(`File "${path}" found, use file? Y/N:`) ?? "").trim()
      .toUpperCase();
    if (r === "Y") {
      break;
    } else if (r === "N") {
      shouldDownload = true;
      break;
    } else {
      console.log(`Unexpected: "${r}"`);
    }
  }
} catch (e) {
  if (!(e instanceof Deno.errors.NotFound)) {
    throw e;
  }
  shouldDownload = true;
}

if (shouldDownload) {
  console.log(`Downloading ${url} in path "${path}" ...`);
  await downloadFile(url, path);
}

await clearTests();

await decompressTests(path);
