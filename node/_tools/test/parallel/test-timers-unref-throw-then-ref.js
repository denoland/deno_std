// deno-fmt-ignore-file
// deno-lint-ignore-file

// Copyright Joyent and Node contributors. All rights reserved. MIT license.
// Taken from Node 16.13.0
// This file is automatically generated by "node/_tools/setup.ts". Do not modify this file manually

'use strict';
const common = require('../common');
const assert = require('assert');

process.once('uncaughtException', common.mustCall((err) => {
  common.expectsError({
    message: 'Timeout Error'
  })(err);
}));

let called = false;
const t = setTimeout(() => {
  assert(!called);
  called = true;
  t.ref();
  throw new Error('Timeout Error');
}, 1).unref();

setTimeout(common.mustCall(), 1);
