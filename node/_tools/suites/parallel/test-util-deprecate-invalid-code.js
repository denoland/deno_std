// deno-fmt-ignore-file
// deno-lint-ignore-file

// Copyright Joyent and Node contributors. All rights reserved. MIT license.
// Taken from Node 16.13.0
// This file is automatically generated by "node/_tools/setup.ts". Do not modify this file manually

'use strict';

const common = require('../common');
const assert = require('assert');
const util = require('util');

[1, true, false, null, {}].forEach((notString) => {
  assert.throws(() => util.deprecate(() => {}, 'message', notString), {
    code: 'ERR_INVALID_ARG_TYPE',
    name: 'TypeError',
    message: 'The "code" argument must be of type string.' +
             common.invalidArgTypeHelper(notString)
  });
});
