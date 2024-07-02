// Ported from js-yaml v3.13.1:
// https://github.com/nodeca/js-yaml/commit/665aadda42349dcae869f12040d9b10ef18d12da
// Copyright 2011-2015 by Vitaly Puzrin. All rights reserved. MIT license.
// Copyright 2018-2024 the Deno authors. All rights reserved. MIT license.
// This module is browser compatible.

import type { Any, ArrayObject } from "./_utils.ts";

export type KindType = "sequence" | "scalar" | "mapping";
/**
 * The style variation for `styles` option of {@linkcode stringify}
 */
export type StyleVariant =
  | "lowercase"
  | "uppercase"
  | "camelcase"
  | "decimal"
  | "dec"
  | 10
  | "binary"
  | "bin"
  | 2
  | "octal"
  | "oct"
  | 8
  | "hexadecimal"
  | "hex"
  | 16;
export type RepresentFn = (data: Any, style?: StyleVariant) => Any;

interface TypeOptions {
  kind: KindType;
  resolve?: (data: Any) => boolean;
  construct?: (data: string) => Any;
  instanceOf?: Any;
  predicate?: (data: Record<string, unknown>) => boolean;
  represent?: RepresentFn | ArrayObject<RepresentFn>;
  defaultStyle?: StyleVariant;
  styleAliases?: ArrayObject;
}

function compileStyleAliases(map?: Record<string, unknown[] | null>) {
  const result = {} as Record<string, string>;

  if (map) {
    Object.keys(map).forEach((style) => {
      map[style]!.forEach((alias) => {
        result[String(alias)] = style;
      });
    });
  }

  return result;
}

function checkTagFormat(tag: string): string {
  return tag;
}

export class Type {
  tag: string;
  kind: KindType | null = null;
  instanceOf: Any;
  predicate?: (data: Record<string, unknown>) => boolean;
  represent?: RepresentFn | ArrayObject<RepresentFn>;
  defaultStyle?: StyleVariant;
  styleAliases?: ArrayObject;
  loadKind?: KindType;

  constructor(tag: string, options?: TypeOptions) {
    this.tag = checkTagFormat(tag);
    if (options) {
      this.kind = options.kind;
      this.resolve = options.resolve || (() => true);
      this.construct = options.construct || ((data: Any): Any => data);
      this.instanceOf = options.instanceOf;
      this.predicate = options.predicate;
      this.represent = options.represent;
      this.defaultStyle = options.defaultStyle;
      this.styleAliases = compileStyleAliases(options.styleAliases);
    }
  }
  resolve: (data?: Any) => boolean = (): boolean => true;
  construct: (data?: Any) => Any = (data): Any => data;
}
