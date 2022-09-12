// deno-fmt-ignore-file
// deno-lint-ignore-file

// Copyright Joyent and Node contributors. All rights reserved. MIT license.
// Taken from Node 18.8.0
// This file is automatically generated by "node/_tools/setup.ts". Do not modify this file manually

'use strict';
const common = require('../common');
const assert = require('assert');
const net = require('net');

const server = net.createServer(common.mustCall(function(s) {
  server.close();
  s.end();
})).listen(0, '127.0.0.1', common.mustCall(function() {
  const socket = net.connect(this.address().port, '127.0.0.1');
  socket.on('end', common.mustCall(() => {
    assert.strictEqual(socket.writable, true);
    socket.write('hello world');
  }));
}));
