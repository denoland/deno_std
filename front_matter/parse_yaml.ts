// Copyright 2018-2024 the Deno authors. All rights reserved. MIT license.

import {
  createExtractor,
  type Extractor,
  type Parser,
} from "./create_extractor.ts";
import { parse } from "../yaml/parse.ts";

export const parseYaml: Extractor = createExtractor({
  ["yaml"]: parse as Parser,
});
