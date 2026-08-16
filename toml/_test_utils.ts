// Copyright 2018-2026 the Deno authors. MIT license.

type TestCaseValue = {
  type:
    | "string"
    | "integer"
    | "float"
    | "bool"
    | "datetime"
    | "datetime-local"
    | "date-local"
    | "time-local";
  value: string;
};
export type TestCase =
  | TestCaseValue
  | TestCase[]
  | { [key: string]: TestCase };

function isTestCaseValue(v: unknown): v is TestCaseValue {
  return typeof v === "object" && v !== null &&
    "type" in v && typeof v.type === "string" &&
    "value" in v && typeof v.value === "string";
}

export function convertTestCase(v: TestCase): unknown {
  if (isTestCaseValue(v)) {
    switch (v.type) {
      case "string":
        return v.value;
      case "integer":
        return parseInt(v.value, 10);
      case "float":
        return parseFloat(v.value.replace("inf", "Infinity"));
      case "bool":
        return v.value === "true";
      // TODO(4513ECHO): https://github.com/denoland/std/issues/6591
      case "datetime":
      case "datetime-local":
      case "date-local":
        return new Date(v.value);
      case "time-local":
        return v.value;
    }
  } else if (Array.isArray(v)) {
    return v.map(convertTestCase);
  } else {
    const obj: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(v)) {
      obj[key] = convertTestCase(value);
    }
    return obj;
  }
}
