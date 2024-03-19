// Copyright 2018-2024 the Deno authors. All rights reserved. MIT license.

import { parseYaml } from "./parse_yaml.ts";

/**
 * @deprecated (will be removed in 0.222.0) Use {@linkcode parseYaml} instead.
 */
export const extract = parseYaml;
