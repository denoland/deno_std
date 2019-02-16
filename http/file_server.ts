#!/usr/bin/env deno --allow-net
// Copyright 2018-2019 the Deno authors. All rights reserved. MIT license.

// This program serves files in the current directory over HTTP.
// TODO Stream responses instead of reading them into memory.
// TODO Add tests like these:
// https://github.com/indexzero/http-server/blob/master/test/http-server-test.js

const { ErrorKind, cwd, args, stat, readDir, open } = Deno;
import { DenoError } from "deno";
import {
  listenAndServe,
  ServerRequest,
  setContentLength,
  Response
} from "./server.ts";
import { extname } from "../fs/path.ts";
import { contentType } from "../media_types/mod.ts";

const dirViewerTemplate = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta http-equiv="X-UA-Compatible" content="ie=edge">
  <title>Deno File Server</title>
  <style>
    td {
      padding: 0 1rem;
    }
    td.mode {
      font-family: Courier;
    }
  </style>
</head>
<body>
  <h1>Index of <%DIRNAME%></h1>
  <table>
    <tr><th>Mode</th><th>Size</th><th>Name</th></tr>
    <%CONTENTS%>
  </table>
</body>
</html>
`;

const encoder = new TextEncoder();

function modeToString(isDir: boolean, maybeMode: number | null): string {
  const modeMap = ["---", "--x", "-w-", "-wx", "r--", "r-x", "rw-", "rwx"];

  if (maybeMode === null) {
    return "(unknown mode)";
  }
  const mode = maybeMode!.toString(8);
  if (mode.length < 3) {
    return "(unknown mode)";
  }
  let output = "";
  mode
    .split("")
    .reverse()
    .slice(0, 3)
    .forEach(v => {
      output = modeMap[+v] + output;
    });
  output = `(${isDir ? "d" : "-"}${output})`;
  return output;
}

function fileLenToString(len: number): string {
  const multipler = 1024;
  let base = 1;
  const suffix = ["B", "K", "M", "G", "T"];
  let suffixIndex = 0;

  while (base * multipler < len) {
    if (suffixIndex >= suffix.length - 1) {
      break;
    }
    base *= multipler;
    suffixIndex++;
  }

  return `${(len / base).toFixed(2)}${suffix[suffixIndex]}`;
}

function createDirEntryDisplay(
  name: string,
  path: string,
  size: number | null,
  mode: number | null,
  isDir: boolean
): string {
  const sizeStr = size === null ? "" : "" + fileLenToString(size!);
  return `
  <tr><td class="mode">${modeToString(
    isDir,
    mode
  )}</td><td>${sizeStr}</td><td><a href="${path}">${name}${
    isDir ? "/" : ""
  }</a></td>
  </tr>
  `;
}

// TODO: simplify this after deno.stat and deno.readDir are fixed
async function serveDir(
  req: ServerRequest,
  dirPath: string,
  dirName: string
): Promise<Response> {
  // dirname has no prefix
  const listEntry: string[] = [];
  const fileInfos = await readDir(dirPath);
  for (const info of fileInfos) {
    if (info.name === "index.html" && info.isFile()) {
      // in case index.html as dir...
      return await serveFile(req, info.path);
    }
    // Yuck!
    let mode = null;
    try {
      mode = (await stat(info.path)).mode;
    } catch (e) {}
    listEntry.push(
      createDirEntryDisplay(
        info.name,
        dirName + "/" + info.name,
        info.isFile() ? info.len : null,
        mode,
        info.isDirectory()
      )
    );
  }

  const page = encoder.encode(
    dirViewerTemplate
      .replace("<%DIRNAME%>", dirName + "/")
      .replace("<%CONTENTS%>", listEntry.join(""))
  );

  const headers = new Headers();
  headers.set("content-type", "text/html");

  const res = {
    status: 200,
    body: page,
    headers
  };
  setContentLength(res);
  return res;
}

async function serveFile(req: ServerRequest, filename: string) {
  const file = await open(filename);
  const fileInfo = await stat(filename);
  const headers = new Headers();
  headers.set("content-length", fileInfo.len.toString());
  headers.set("content-type", contentType(extname(filename)) || "text/plain");

  const res = {
    status: 200,
    body: file,
    headers
  };
  return res;
}

async function serveFallback(req: ServerRequest, e: Error): Promise<Response> {
  if (
    e instanceof DenoError &&
    (e as DenoError<any>).kind === ErrorKind.NotFound
  ) {
    return {
      status: 404,
      body: encoder.encode("Not found")
    };
  } else {
    return {
      status: 500,
      body: encoder.encode("Internal server error")
    };
  }
}

function serverLog(req: ServerRequest, res: Response): void {
  const d = new Date().toISOString();
  const dateFmt = `[${d.slice(0, 10)} ${d.slice(11, 19)}]`;
  const s = `${dateFmt} "${req.method} ${req.url} ${req.proto}" ${res.status}`;
  console.log(s);
}

function setCORS(res: Response) {
  if (!res.headers) {
    res.headers = new Headers();
  }
  res.headers!.append("access-control-allow-origin", "*");
  res.headers!.append(
    "access-control-allow-headers",
    "Origin, X-Requested-With, Content-Type, Accept, Range"
  );
}

export interface FileServerOptions {
  CORSEnabled?: Boolean;
  dir?: string;
  fallback?: (ServerRequest, Error) => Promise<Response>;
  logger?: (ServerRequest, Response) => void;
  port?: number;
}
const defaultOptions: FileServerOptions = {
  CORSEnabled: false,
  dir: ".",
  fallback: serveFallback,
  logger: serverLog,
  port: 4500
};

export async function fileServer(options: FileServerOptions = {}) {
  options = { ...defaultOptions, ...options };
  const addr = `0.0.0.0:${options.port}`;

  console.log(`fileServer listening on http://${addr}/`);
  await listenAndServe(addr, async req => {
    const fileName = req.url.replace(/\/$/, "");
    const filePath = options.dir + fileName;

    let response: Response;

    try {
      const fileInfo = await stat(filePath);
      if (fileInfo.isDirectory()) {
        // Bug with deno.stat: name and path not populated
        // Yuck!
        response = await serveDir(req, filePath, fileName);
      } else {
        response = await serveFile(req, filePath);
      }
    } catch (e) {
      response = await options.fallback(req, e);
    } finally {
      if (options.CORSEnabled) {
        setCORS(response);
      }
      options.logger(req, response);
      req.respond(response);
    }
  });
}
