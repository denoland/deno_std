import { BigSource, Big } from "./big/mod.ts";

export function toExponential(value: BigSource, dp?: number): string {
  return (value instanceof Big ? value : new Big(value)).toExponential(dp);
}
