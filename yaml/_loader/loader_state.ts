// Ported from js-yaml v3.13.1:
// https://github.com/nodeca/js-yaml/commit/665aadda42349dcae869f12040d9b10ef18d12da
// Copyright 2011-2015 by Vitaly Puzrin. All rights reserved. MIT license.
// Copyright 2018-2024 the Deno authors. All rights reserved. MIT license.

import type { YamlError } from "../_error.ts";
import type { Schema, TypeMap } from "../_schema.ts";
import { State } from "../_state.ts";
import type { Type } from "../_type.ts";
import type { Any, ArrayObject } from "../_utils.ts";

export interface LoaderStateOptions {
  /** specifies a schema to use. */
  schema?: Schema;
  /** function to call on warning messages. */
  onWarning?(this: null, e?: YamlError): void;
}

// deno-lint-ignore no-explicit-any
export type ResultType = any[] | Record<string, any> | string;

export class LoaderState extends State {
  input: string;
  documents: Any[] = [];
  length: number;
  lineIndent = 0;
  lineStart = 0;
  position = 0;
  line = 0;
  onWarning?: (...args: Any[]) => void;
  implicitTypes: Type[];
  typeMap: TypeMap;

  version?: string | null;
  checkLineBreaks = false;
  tagMap: ArrayObject = Object.create(null);
  anchorMap: ArrayObject = Object.create(null);
  tag?: string | null;
  anchor?: string | null;
  kind?: string | null;
  result: ResultType | null = "";

  constructor(
    input: string,
    {
      schema,
      onWarning,
    }: LoaderStateOptions,
  ) {
    super(schema);
    this.input = input;
    this.onWarning = onWarning;

    this.implicitTypes = (this.schema as Schema).compiledImplicit;
    this.typeMap = (this.schema as Schema).compiledTypeMap;

    this.length = input.length;
  }
}
