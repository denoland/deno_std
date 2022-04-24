// deno-fmt-ignore-file
// deno-lint-ignore-file

// Copyright Joyent and Node contributors. All rights reserved. MIT license.
// Taken from Node 16.13.0
// This file is automatically generated by "node/_tools/setup.ts". Do not modify this file manually

'use strict';
const common = require('../common');
const assert = require('assert');
const net = require('net');

// TODO(cmorten): reenable for windows once named pipes are supported
// REF: https://github.com/denoland/deno/issues/10244
if (common.isWindows) {
  return;
}

{
  const fp = '/tmp/fadagagsdfgsdf';
  const c = net.connect(fp);

  c.on('connect', common.mustNotCall());
  c.on('error', common.expectsError({
    code: 'ENOENT',
    message: `connect ENOENT ${fp}`
  }));
}

{
  assert.throws(
    () => net.createConnection({ path: {} }),
    { code: 'ERR_INVALID_ARG_TYPE' }
  );
}
