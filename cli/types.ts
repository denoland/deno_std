// Copyright 2018-2024 the Deno authors. All rights reserved. MIT license.

type OptionTypeConstructor<T> = T extends boolean ? BooleanConstructor
  : T extends number ? NumberConstructor
  : T extends string ? StringConstructor
  : BooleanConstructor | NumberConstructor | StringConstructor;

export interface Option<T> {
  name: string;
  alias?: string;
  description?: string;
  default?: T;
  type?: OptionTypeConstructor<T>;
  negatable?: boolean;
  value?: {
    name: string;
    optional?: boolean;
    multiple?: boolean;
    requireEquals?: boolean;
  };
  fn?: (value: T) => T | void;
}

export interface Argument<T = unknown> {
  name: string;
  description?: string;
  multiple?: boolean;
  optional?: boolean;
  fn?: (value: T) => T | void;
}

export interface Command<T> {
  name: string;
  description?: string;
  options?: ReadonlyArray<Option<T>>;
  commands?: ReadonlyArray<Command<T>>;
  arguments?: ReadonlyArray<Argument>;
  fn?: (result: ParseResult) => void;
}

export interface Schema<T> extends Omit<Command<T>, "name"> {
  name?: string;
}

export interface ParseResult {
  options: Record<string, unknown>;
  arguments: Record<string, unknown>;
}
