// deno-fmt-ignore-file
// deno-lint-ignore-file

// Copyright Joyent and Node contributors. All rights reserved. MIT license.
// Taken from Node 16.13.0
// This file is automatically generated by "node/_tools/setup.ts". Do not modify this file manually

'use strict';

const common = require('../common');
const assert = require('assert');
const dgram = require('dgram');

{
  // Test bad signal.
  assert.throws(
    () => dgram.createSocket({ type: 'udp4', signal: {} }),
    {
      code: 'ERR_INVALID_ARG_TYPE',
      name: 'TypeError'
    });
}

{
  // Test close.
  const controller = new AbortController();
  const { signal } = controller;
  const server = dgram.createSocket({ type: 'udp4', signal });
  server.on('close', common.mustCall());
  controller.abort();
}

{
  // Test close with pre-aborted signal.
  const signal = AbortSignal.abort();
  const server = dgram.createSocket({ type: 'udp4', signal });
  server.on('close', common.mustCall());
}
