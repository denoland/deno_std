// Copyright 2018-2024 the Deno authors. All rights reserved. MIT license.

import {
  createExtractor,
  type Extractor,
  type Parser,
} from "./create_extractor.ts";

export const parseJson: Extractor = createExtractor({
  json: JSON.parse as Parser,
});
