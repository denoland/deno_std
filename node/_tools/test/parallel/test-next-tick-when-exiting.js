// deno-fmt-ignore-file
// deno-lint-ignore-file

// Copyright Joyent and Node contributors. All rights reserved. MIT license.
// Taken from Node 18.12.0
// This file is automatically generated by "node/_tools/setup.ts". Do not modify this file manually

'use strict';

const common = require('../common');
const assert = require('assert');

process.on('exit', () => {
  assert.strictEqual(process._exiting, true);

  process.nextTick(
    common.mustNotCall('process is exiting, should not be called')
  );
});

process.exit();
