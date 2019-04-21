// Copyright 2018-2019 the Deno authors. All rights reserved. MIT license.

import { green, red, gray, yellow, italic } from "../colors/mod.ts";
export type TestFunction = () => void | Promise<void>;

export interface TestDefinition {
  fn: TestFunction;
  name: string;
}

// Replacement of the global `console` function to be in silent mode
const noopConsole = function() {};

// Save Object of the global `console` in case of silent mode
let defaultConsole = {};

function enableConsole(): void {
  for (const key in defaultConsole) {
    console[key] = defaultConsole[key];
  }
}

function disableConsole(): void {
  for (const key in console) {
    if (console[key] instanceof Function) {
      defaultConsole[key] = console[key];
      console[key] = noopConsole;
    }
  }
}

const encoder = new TextEncoder();
function print(txt: string, carriageReturn: boolean = true): void {
  if (carriageReturn) {
    txt += "\n";
  }
  Deno.stdout.writeSync(encoder.encode(`${txt}`));
}

let filterRegExp: RegExp | null;
const candidates: TestDefinition[] = [];
let filtered = 0;

// Must be called before any test() that needs to be filtered.
export function setFilter(s: string): void {
  filterRegExp = new RegExp(s, "i");
}

function filter(name: string): boolean {
  if (filterRegExp) {
    return filterRegExp.test(name);
  } else {
    return true;
  }
}

export function test(t: TestDefinition | TestFunction): void {
  const fn: TestFunction = typeof t === "function" ? t : t.fn;
  const name: string = t.name;

  if (!name) {
    throw new Error("Test function may not be anonymous");
  }
  if (filter(name)) {
    candidates.push({ fn, name });
  } else {
    filtered++;
  }
}

const RED_FAILED = red("FAILED");
const GREEN_OK = green("OK");

interface TestStats {
  filtered: number;
  ignored: number;
  measured: number;
  passed: number;
  failed: number;
}

interface TestResult {
  timeElapsed?: number;
  name: string;
  error?: Error;
  ok: boolean;
  printed: boolean;
}

interface TestResults {
  keys: Map<string, number>;
  cases: Map<number, TestResult>;
}

function createTestResults(tests: TestDefinition[]): TestResults {
  return tests.reduce(
    (acc: TestResults, { name }: TestDefinition, i: number): TestResults => {
      acc.keys.set(name, i);
      acc.cases.set(i, { name, printed: false, ok: false, error: undefined });
      return acc;
    },
    { cases: new Map(), keys: new Map() }
  );
}

function promptTestTime(time: number = 0) {
  let timeStr = "";
  if (time >= 1000) {
    timeStr = `${time / 1000}s`;
  } else {
    timeStr = `${time}ms`;
  }
  return gray(italic(`(${timeStr})`));
}

function report(result: TestResult): void {
  if (result.ok) {
    print(
      `${GREEN_OK}     ${result.name} ${promptTestTime(result.timeElapsed)}`
    );
  } else if (result.error) {
    print(`${RED_FAILED} ${result.name}\n${result.error.stack}`);
  } else {
    print(`test ${result.name} ... unresolved`);
  }
  result.printed = true;
}

function printResults(
  stats: TestStats,
  results: TestResults,
  flush: boolean,
  exitOnFail: boolean,
  timeElapsed: number
): void {
  if (flush) {
    for (const result of results.cases.values()) {
      if (!result.printed) {
        report(result);
        if (result.error && exitOnFail) {
          break;
        }
      }
    }
  }
  // Attempting to match the output of Rust's test runner.
  print(
    `\ntest result: ${stats.failed ? RED_FAILED : GREEN_OK}. ` +
      `${stats.passed} passed; ${stats.failed} failed; ` +
      `${stats.ignored} ignored; ${stats.measured} measured; ` +
      `${stats.filtered} filtered out ` +
      `${promptTestTime(timeElapsed)}\n`
  );
}

function previousPrinted(name: string, results: TestResults): boolean {
  const curIndex: number = results.keys.get(name)!;
  if (curIndex === 0) {
    return true;
  }
  return results.cases.get(curIndex - 1)!.printed;
}

async function createTestCase(
  stats: TestStats,
  results: TestResults,
  exitOnFail: boolean,
  { fn, name }: TestDefinition
): Promise<void> {
  const result: TestResult = results.cases.get(results.keys.get(name)!)!;
  try {
    const start = performance.now();
    await fn();
    const end = performance.now();
    stats.passed++;
    result.ok = true;
    result.timeElapsed = end - start;
  } catch (err) {
    stats.failed++;
    result.error = err;
    if (exitOnFail) {
      throw err;
    }
  }
  if (previousPrinted(name, results)) {
    report(result);
  }
}

function initTestCases(
  stats: TestStats,
  results: TestResults,
  tests: TestDefinition[],
  exitOnFail: boolean
): Array<Promise<void>> {
  return tests.map(createTestCase.bind(null, stats, results, exitOnFail));
}

async function runTestsParallel(
  stats: TestStats,
  results: TestResults,
  tests: TestDefinition[],
  exitOnFail: boolean
): Promise<void> {
  try {
    await Promise.all(initTestCases(stats, results, tests, exitOnFail));
  } catch (_) {
    // The error was thrown to stop awaiting all promises if exitOnFail === true
    // stats.failed has been incremented and the error stored in results
  }
}

async function runTestsSerial(
  stats: TestStats,
  tests: TestDefinition[],
  exitOnFail: boolean,
  disableLog: boolean
): Promise<void> {
  for (const { fn, name } of tests) {
    // Displaying the currently running test if silent mode
    if (disableLog) {
      print(`${yellow("RUNNING")} ${name}`, false);
    }
    try {
      let start, end;
      start = performance.now();
      await fn();
      end = performance.now();
      if (disableLog) {
        // Rewriting the current prompt line to erase `running ....`
        print("\x1b[2K\r", false);
      }
      stats.passed++;
      print(GREEN_OK + "     " + name + " " + promptTestTime(end - start));
    } catch (err) {
      if (disableLog) {
        print("\x1b[2K\r", false);
      }
      print(`${RED_FAILED} ${name}`);
      print(err.stack);
      stats.failed++;
      if (exitOnFail) {
        break;
      }
    }
  }
}

/** Defines options for controlling execution details of a test suite. */
export interface RunOptions {
  parallel?: boolean;
  exitOnFail?: boolean;
  only?: RegExp;
  skip?: RegExp;
  disableLog?: boolean;
}

/**
 * Runs specified test cases.
 * Parallel execution can be enabled via the boolean option; default: serial.
 */
export async function runTests({
  parallel = false,
  exitOnFail = false,
  only = /[^\s]/,
  skip = /^\s*$/,
  disableLog = false
}: RunOptions = {}): Promise<void> {
  const tests: TestDefinition[] = candidates.filter(
    ({ name }): boolean => only.test(name) && !skip.test(name)
  );
  const stats: TestStats = {
    measured: 0,
    ignored: candidates.length - tests.length,
    filtered: filtered,
    passed: 0,
    failed: 0
  };
  const results: TestResults = createTestResults(tests);
  print(`running ${tests.length} tests`);
  const start = performance.now();
  if (disableLog) {
    disableConsole();
  }
  if (parallel) {
    await runTestsParallel(stats, results, tests, exitOnFail);
  } else {
    await runTestsSerial(stats, tests, exitOnFail, disableLog);
  }
  const end = performance.now();
  if (disableLog) {
    enableConsole();
  }
  printResults(stats, results, parallel, exitOnFail, end - start);
  if (stats.failed) {
    // Use setTimeout to avoid the error being ignored due to unhandled
    // promise rejections being swallowed.
    setTimeout((): void => {
      console.error(`There were ${stats.failed} test failures.`);
      Deno.exit(1);
    }, 0);
  }
}

/**
 * Runs specified test cases if the enclosing script is main.
 * Execution mode is toggleable via opts.parallel, defaults to false.
 */
export async function runIfMain(
  meta: ImportMeta,
  opts?: RunOptions
): Promise<void> {
  if (meta.main) {
    return runTests(opts);
  }
}
