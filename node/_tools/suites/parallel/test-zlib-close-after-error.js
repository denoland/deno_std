// deno-fmt-ignore-file
// deno-lint-ignore-file

// Copyright Joyent and Node contributors. All rights reserved. MIT license.
// Taken from Node 16.13.0
// This file is automatically generated by "node/_tools/setup.ts". Do not modify this file manually

'use strict';
// https://github.com/nodejs/node/issues/6034

const common = require('../common');
const assert = require('assert');
const zlib = require('zlib');

const decompress = zlib.createGunzip(15);

decompress.on('error', common.mustCall((err) => {
  assert.strictEqual(decompress._closed, true);
  decompress.close();
}));

assert.strictEqual(decompress._closed, false);
decompress.write('something invalid');
