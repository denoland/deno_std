import { BigSource, Big } from "./big/mod.ts";

export function abs(value: BigSource): string {
  return (value instanceof Big ? value : new Big(value)).abs().toString();
}
