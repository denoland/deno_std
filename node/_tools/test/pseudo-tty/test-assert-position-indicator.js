// deno-fmt-ignore-file
// deno-lint-ignore-file

// Copyright Joyent and Node contributors. All rights reserved. MIT license.
// Taken from Node 16.13.0
// This file is automatically generated by "node/_tools/setup.ts". Do not modify this file manually

'use strict';
require('../common');
const assert = require('assert');

process.env.NODE_DISABLE_COLORS = true;
process.stderr.columns = 20;

// Confirm that there is no position indicator.
assert.throws(
  () => { assert.deepStrictEqual('a'.repeat(30), 'a'.repeat(31)); },
  (err) => !err.message.includes('^')
);

// Confirm that there is a position indicator.
assert.throws(
  () => { assert.deepStrictEqual('aaaa', 'aaaaa'); },
  (err) => err.message.includes('^')
);
