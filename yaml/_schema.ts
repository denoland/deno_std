// Ported from js-yaml v3.13.1:
// https://github.com/nodeca/js-yaml/commit/665aadda42349dcae869f12040d9b10ef18d12da
// Copyright 2011-2015 by Vitaly Puzrin. All rights reserved. MIT license.
// Copyright 2018-2024 the Deno authors. All rights reserved. MIT license.
// This module is browser compatible.

import { YamlError } from "./_error.ts";
import type { KindType, Type } from "./_type.ts";
import type { Any, ArrayObject } from "./_utils.ts";

function compileList(
  schema: Schema,
  name: "implicit" | "explicit",
  result: Type[],
): Type[] {
  const exclude: number[] = [];

  for (const includedSchema of schema.include) {
    result = compileList(includedSchema, name, result);
  }

  for (const currentType of schema[name]) {
    for (const [previousIndex, previousType] of result.entries()) {
      if (
        previousType.tag === currentType.tag &&
        previousType.kind === currentType.kind
      ) {
        exclude.push(previousIndex);
      }
    }

    result.push(currentType);
  }

  return result.filter((_type, index): unknown => !exclude.includes(index));
}

export type TypeMap = { [k in KindType | "fallback"]: ArrayObject<Type> };
function compileMap(...typesList: Type[][]): TypeMap {
  const result: TypeMap = {
    fallback: {},
    mapping: {},
    scalar: {},
    sequence: {},
  };

  for (const types of typesList) {
    for (const type of types) {
      if (type.kind !== null) {
        result[type.kind][type.tag] = result["fallback"][type.tag] = type;
      }
    }
  }
  return result;
}

export class Schema implements SchemaDefinition {
  static SCHEMA_DEFAULT?: Schema;

  implicit: Type[];
  explicit: Type[];
  include: Schema[];

  compiledImplicit: Type[];
  compiledExplicit: Type[];
  compiledTypeMap: TypeMap;

  constructor(definition: SchemaDefinition) {
    this.explicit = definition.explicit || [];
    this.implicit = definition.implicit || [];
    this.include = definition.include || [];

    for (const type of this.implicit) {
      if (type.loadKind && type.loadKind !== "scalar") {
        throw new YamlError(
          "There is a non-scalar type in the implicit list of a schema. Implicit resolving of such types is not supported.",
        );
      }
    }

    this.compiledImplicit = compileList(this, "implicit", []);
    this.compiledExplicit = compileList(this, "explicit", []);
    this.compiledTypeMap = compileMap(
      this.compiledImplicit,
      this.compiledExplicit,
    );
  }
}

export interface SchemaDefinition {
  implicit?: Any[];
  explicit?: Type[];
  include?: Schema[];
}
