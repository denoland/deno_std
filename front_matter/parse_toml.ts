// Copyright 2018-2024 the Deno authors. All rights reserved. MIT license.

import {
  createExtractor,
  type Extractor,
  type Parser,
} from "./create_extractor.ts";
import { parse } from "../toml/parse.ts";

export const parseToml: Extractor = createExtractor({
  ["toml"]: parse as Parser,
});
