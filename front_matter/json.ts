// Copyright 2018-2024 the Deno authors. All rights reserved. MIT license.

import { parseJson } from "./parse_json.ts";

/**
 * @deprecated (will be removed in 0.222.0) Use {@linkcode parseJson} instead.
 */
export const extract = parseJson;
