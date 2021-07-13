// Copyright 2018-2021 the Deno authors. All rights reserved. MIT license.
export type Predicate<T> = (item: T) => boolean;
export type Selector<T, O = unknown> = (item: T) => O;
export type Grouping<V> = Record<string, Array<V>>;
