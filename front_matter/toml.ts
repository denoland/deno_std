// Copyright 2018-2024 the Deno authors. All rights reserved. MIT license.

import { parseToml } from "./parse_toml.ts";

/**
 * @deprecated (will be removed in 0.222.0) Use {@linkcode parseToml} instead.
 */
export const extract = parseToml;
