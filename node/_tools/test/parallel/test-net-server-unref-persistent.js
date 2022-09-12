// deno-fmt-ignore-file
// deno-lint-ignore-file

// Copyright Joyent and Node contributors. All rights reserved. MIT license.
// Taken from Node 18.8.0
// This file is automatically generated by "node/_tools/setup.ts". Do not modify this file manually

'use strict';
const common = require('../common');
const net = require('net');
const server = net.createServer();

// Unref before listening
server.unref();
server.listen();

// If the timeout fires, that means the server held the event loop open
// and the unref() was not persistent. Close the server and fail the test.
setTimeout(common.mustNotCall(), 1000).unref();
