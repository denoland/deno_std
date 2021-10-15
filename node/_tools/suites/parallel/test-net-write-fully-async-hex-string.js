// deno-fmt-ignore-file
// deno-lint-ignore-file

// Copyright Joyent and Node contributors. All rights reserved. MIT license.
// Taken from Node 16.11.1
// This file is automatically generated by "node/_tools/setup.ts". Do not modify this file manually

"use strict";
// Flags: --expose-gc

// Regression test for https://github.com/nodejs/node/issues/8251.
const common = require("../common");
const net = require("net");

const data = Buffer.alloc(1000000).toString("hex");

const server = net.createServer(common.mustCall(function (conn) {
  conn.resume();
})).listen(
  0,
  common.mustCall(function () {
    const conn = net.createConnection(
      this.address().port,
      common.mustCall(() => {
        let count = 0;

        function writeLoop() {
          if (count++ === 20) {
            conn.destroy();
            server.close();
            return;
          }

          while (conn.write(data, "hex"));
          global.gc(true);
          // The buffer allocated inside the .write() call should still be alive.
        }

        conn.on("drain", writeLoop);

        writeLoop();
      }),
    );
  }),
);
