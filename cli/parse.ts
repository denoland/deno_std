// Copyright 2018-2024 the Deno authors. All rights reserved. MIT license.

import type { Argument, Option, ParseResult, Schema } from "./types.ts";

interface FlagRegExpGroup {
  doubleDash?: "-";
  negated?: "no-";
  name: string;
  value?: string;
}
const FLAG_REGEXP =
  /^(?:-(?:(?<doubleDash>-)(?<negated>no-)?)?)(?<name>.+?)(?:=(?<value>.+?))?$/s;
const QUOTED_VALUE_REGEXP = /^('|")(?<value>.*)\1$/;

function validateCommand<T>(schema: Schema<T>) {
  if (schema.options) {
    for (const option of schema.options) {
      if (option.default !== undefined) {
        switch (option.type) {
          case Boolean: {
            if (typeof option.default !== "boolean") {
              throw new Error(`default value must be a boolean.`);
            }
            break;
          }
          case Number: {
            if (typeof option.default !== "number" || isNaN(option.default)) {
              throw new Error(`default value must be a number.`);
            }
            break;
          }
          case String: {
            if (typeof option.default !== "string") {
              throw new Error(`default value must be a string.`);
            }
            break;
          }
        }
      }
    }
  }
}
function validateOption<T>(option: Option<T>, groups: FlagRegExpGroup) {
  if (!option.value) {
    if (groups.value) {
      throw new Error(
        `option value is not defined: '${
          groups.doubleDash ? `--${option.name}` : `-${option.alias}`
        }'`,
      );
    }
  }
  if (!option.value?.optional && option.value?.requireEquals && !groups.value) {
    throw new Error(
      `option requires equal before value: '${
        groups.doubleDash ? `--${option.name}` : `-${option.alias}`
      }'.`,
    );
  }
}

/**
 * sets value in result.options and calls option.value.fn if defined
 */
function setOptionValue<T>(
  option: Option<T>,
  value: T,
  result: ParseResult,
) {
  if (option.value?.multiple) {
    result.options[option.name] ??= [];
    const array = result.options[option.name] as unknown[];
    array.push(value);
    value = array as T;
  }
  value = option?.fn?.(value) ?? value;
  result.options[option.name] = value;
}
/**
 * sets the next value (or values if option value is multiple) in entries as value in result for the passed option.
 */
function setNextOptionValue<T>(
  entries: IterableIterator<[number, string]>,
  option: Option<T>,
  result: ParseResult,
) {
  for (const [_, arg] of entries) {
    if (arg === undefined) {
      if (!option.value?.optional) {
        throw new Error(`option requires a value: '--${option.name}'.`);
      }
      return;
    }
    const value = parseValue(option, arg) as T;
    setOptionValue(option, value, result);
    if (!option.value?.multiple) break;
  }
}

/**
 * handles command
 * @example
 * ```sh
 * app run
 * ```
 */
function handleCommand<T>(
  entries: IterableIterator<[number, string]>,
  schema: Schema<T>,
  arg: string,
) {
  const command = schema.commands?.find((it) => it.name === arg);
  if (!command) throw new Error(`command not defined: ${arg}`);
  return parseWithIterator(entries, command);
}
/**
 * handles double dash option
 * @example
 * ```sh
 * --key
 * --key=value
 * --key value
 * ```
 */
function handleDoubleDashOption<T>(
  entries: IterableIterator<[number, string]>,
  schema: Schema<T>,
  groups: FlagRegExpGroup,
  result: ParseResult,
) {
  const option = schema.options?.find((it) => it.name === groups.name);
  if (!option) {
    throw new Error(
      `option is not defined: '${
        groups.doubleDash ? "--" : "-"
      }${groups.name}'`,
    );
  }

  // if no value is set already, set default, true, or false if negated or an empty array if is multiple
  result.options[option.name] ??= option.default ??
    (option.value?.multiple ? [] : (groups.negated ? false : true));

  validateOption(option, groups);
  if (!option.value) return;

  if (groups.value) {
    const value = parseValue(option, groups.value) as T;
    setOptionValue(option, value, result);
    return;
  }

  setNextOptionValue(entries, option, result);
}
/**
 * handles single dash option
 * @example
 * ```sh
 * -v
 * -v=3
 * -vvv
 * -vxyz
 * -vxyz=bar
 * -v bar
 * ```
 */
function handleSingleDashOption<T>(
  entries: IterableIterator<[number, string]>,
  schema: Schema<T>,
  groups: FlagRegExpGroup,
  result: ParseResult,
) {
  for (const char of groups.name) {
    const option = schema.options?.find((it) => it.alias === char);
    if (!option) throw new Error(`option not defined: ${char}`);

    // if no value is set already, set default, true, or false if negated or an empty array if is multiple
    result.options[option.name] ??= option.default ??
      (option.value?.multiple ? [] : (groups.negated ? false : true));

    validateOption(option, groups);

    if (groups.value) {
      const value = parseValue(option, groups.value) as T;
      setOptionValue(option, value, result);
    }

    if (option.value) {
      setNextOptionValue(entries, option, result);
    }

    const value = result.options[option.name] as T;
    result.options[option.name] = option?.fn?.(value) ?? value;
  }
}
/**
 * handles argument that are not part of any option
 * @example
 * arg1 arg2 arg3
 */
function handleArgument(argument: Argument, arg: string, result: ParseResult) {
  if (argument.multiple) {
    result.arguments[argument.name] ??= [];
    const array = result.arguments[argument.name] as unknown[];
    array.push(arg);
    result.arguments[argument.name] = argument.fn?.(array) ?? array;
  } else {
    const value = argument.fn?.(arg) ?? arg;
    result.arguments[argument.name] = value;
  }
}
/**
 * handles argument after double dash
 * @example
 * -- arg1 arg2 arg3
 */
function handleDoubleDashArguments(
  entries: IterableIterator<[number, string]>,
  result: ParseResult,
) {
  const array: string[] = result.arguments["--"] = [];
  for (const [_, arg] of entries) array.push(arg);
}

function parseBooleanValue(value: string) {
  if (value === "true") return true;
  else if (value === "false") return false;
  else throw new Error(`value must be either 'true' or 'false'.`);
}
function parseNumberValue(value: string) {
  const number = Number(value);
  if (isNaN(number)) throw new Error(`value must be a number.`);
  return number;
}

function parseValue<T>(option: Option<T>, value: string) {
  // strip quotes if value starts and ends with quotes
  const groups = value.match(QUOTED_VALUE_REGEXP)?.groups;
  if (groups) value = groups.value as string;

  switch (option.type) {
    case Boolean:
      return parseBooleanValue(value);
    case Number:
      return parseNumberValue(value);
    case String:
    default:
      return String(value);
  }
}

function parseWithIterator<T>(
  entries: IterableIterator<[number, string]>,
  schema: Schema<T>,
): ParseResult {
  validateCommand(schema);

  const result = { options: {}, arguments: {} } as ParseResult;

  const missingArguments = schema.arguments?.filter((it) => !it.optional) ??
    [];

  let parsedArgumentIndex = 0;

  for (const [_, arg] of entries) {
    if (arg === "--") {
      handleDoubleDashArguments(entries, result);
      break;
    }

    const groups = arg.match(FLAG_REGEXP)?.groups as unknown as FlagRegExpGroup;
    if (!groups) {
      const argument = schema.arguments?.at(parsedArgumentIndex);
      if (argument) {
        handleArgument(argument, arg, result);
        if (!argument.multiple) parsedArgumentIndex += 1;
        missingArguments.splice(missingArguments.indexOf(argument), 1);
        continue;
      }
      handleCommand(entries, schema, arg);
      break;
    }
    if (groups.doubleDash) {
      handleDoubleDashOption(entries, schema, groups, result);
    } else {
      handleSingleDashOption(entries, schema, groups, result);
    }
  }

  if (missingArguments.length) {
    throw new Error(
      `missing arguments: ${missingArguments.map((it) => it.name).join(", ")}`,
    );
  }

  return schema.fn?.(result) ?? result;
}

export function parse<T>(args: string[], schema: Schema<T>) {
  return parseWithIterator(args.entries(), schema);
}
