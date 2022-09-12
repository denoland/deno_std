// deno-fmt-ignore-file
// deno-lint-ignore-file

// Copyright Joyent and Node contributors. All rights reserved. MIT license.
// Taken from Node 18.8.0
// This file is automatically generated by "node/_tools/setup.ts". Do not modify this file manually

/* eslint-disable node-core/required-modules */
/* eslint-disable node-core/require-common-first */

'use strict';

// We are not loading common because it will load the stream module,
// defeating the purpose of this test.

const { gzipSync } = require('zlib');

// Avoid regressions such as https://github.com/nodejs/node/issues/36615

// This must not throw
gzipSync('fooobar');
