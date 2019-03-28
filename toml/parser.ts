// Copyright 2018-2019 the Deno authors. All rights reserved. MIT license.
import { existsSync } from "../fs/exists.ts";
import { deepAssign } from "../util/deep_assign.ts";

class KeyValuePair {
  key: string;
  value: unknown;
}
class ParserGroup {
  type: string;
  name: string;
  arrValues: unknown[] = [];
  objValues: object = {};
}
class ParserContext {
  currentGroup?: ParserGroup;
  output: object = {};
}
class Parser {
  tomlLines: string[];
  context: ParserContext;
  constructor(tomlString: string) {
    this.tomlLines = this._split(tomlString);
    this.context = new ParserContext();
  }
  _sanitize(): void {
    const out = [];
    for (let i = 0; i < this.tomlLines.length; i++) {
      const s = this.tomlLines[i].split("#")[0];
      if (s !== "") {
        out.push(s);
      }
    }
    this.tomlLines = out;
    this._mergeMultilines();
  }

  _mergeMultilines(): void {
    function arrayStart(line: string): boolean {
      const reg = /.*=\s*\[/g;
      return reg.test(line) && !(line[line.length - 1] === "]");
    }

    function arrayEnd(line: string): boolean {
      return line[line.length - 1] === "]";
    }

    function stringStart(line: string): boolean {
      const m = line.match(/.*=\s*(?:\"\"\"|''')/);
      if (!m) {
        return false;
      }
      return !line.endsWith(`"""`) || !line.endsWith(`'''`);
    }

    function stringEnd(line: string): boolean {
      return line.endsWith(`'''`) || line.endsWith(`"""`);
    }

    function isLiteralString(line: string): boolean {
      return line.match(/'''/) ? true : false;
    }

    let merged = [],
      acc = [],
      isLiteral = false,
      capture = false,
      captureType = "",
      merge = false;

    for (let i = 0; i < this.tomlLines.length; i++) {
      const line = this.tomlLines[i];
      const trimmed = line.trim();
      if (!capture && arrayStart(trimmed)) {
        capture = true;
        captureType = "array";
      } else if (!capture && stringStart(trimmed)) {
        isLiteral = isLiteralString(trimmed);
        capture = true;
        captureType = "string";
      } else if (capture && arrayEnd(trimmed)) {
        merge = true;
      } else if (capture && stringEnd(trimmed)) {
        merge = true;
      }

      if (capture) {
        acc.push(line);
      } else {
        merged.push(line);
      }

      if (merge) {
        capture = false;
        merge = false;
        if (captureType === "string") {
          // see TOML specs for literal parsing
          if (!isLiteral) {
            for (let i = 0; i < acc.length; i++) {
              acc[i] = acc[i].trim();
            }
          }
          merged.push(
            acc
              .join("\n")
              .replace(/"""/g, '"')
              .replace(/'''/g, `'`)
              .replace(/\n/g, "\\n")
          );
          isLiteral = false;
        } else {
          merged.push(acc.join(""));
        }
        captureType = "";
        acc = [];
      }
    }
    this.tomlLines = merged;
  }
  _unflat(keys: string[], values: object = {}, cObj: object = {}): object {
    let out = {};
    if (keys.length === 0) {
      return cObj;
    } else {
      if (Object.keys(cObj).length === 0) {
        cObj = values;
      }
      let key = keys.pop();
      out[key] = cObj;
      return this._unflat(keys, values, out);
    }
  }
  _groupToOutput(): void {
    const arrProperty = this.context.currentGroup.name.split(".");
    let u = this._unflat(arrProperty, this.context.currentGroup.objValues);
    deepAssign(this.context.output, u);
    delete this.context.currentGroup;
  }
  _split(str: string): string[] {
    let out = [];
    out.push(...str.split("\n"));
    return out;
  }
  _isGroup(line: string): boolean {
    const t = line.trim();
    return t[0] === "[" && t[t.length - 1] === "]";
  }
  _isDeclaration(line: string): boolean {
    return line.split("=").length > 1;
  }
  _createGroup(line: string): void {
    const captureReg = /\[(.*)\]/;
    if (this.context.currentGroup) {
      this._groupToOutput();
    }
    let g = new ParserGroup();
    g.name = line.match(captureReg)[1];
    if (g.name.match(/\[.*\]/)) {
      g.type = "array";
      g.name = g.name.match(captureReg)[1];
    } else {
      g.type = "object";
    }
    this.context.currentGroup = g;
  }
  _processDeclaration(line: string): KeyValuePair {
    let kv = new KeyValuePair();
    const idx = line.indexOf("=");
    kv.key = line.substring(0, idx).trim();
    kv.value = this._parseData(line.slice(idx + 1));
    return kv;
  }
  _parseData(dataString: string): unknown {
    dataString = dataString.trim();
    if (this._isDate(dataString)) {
      return new Date(dataString);
    }
    if (this._isLocalTime(dataString)) {
      return eval(`"${dataString}"`);
    }
    if (dataString === "inf" || dataString === "+inf") {
      return Infinity;
    }
    if (dataString === "-inf") {
      return -Infinity;
    }
    if (
      dataString === "nan" ||
      dataString === "+nan" ||
      dataString === "-nan"
    ) {
      return NaN;
    }
    // inline table
    if (dataString[0] === "{" && dataString[dataString.length - 1] === "}") {
      const reg = /([a-zA-Z0-9-_\.]*) (=)/gi;
      let result;
      while ((result = reg.exec(dataString))) {
        let ogVal = result[0];
        let newVal = ogVal
          .replace(result[1], `"${result[1]}"`)
          .replace(result[2], ":");
        dataString = dataString.replace(ogVal, newVal);
      }
      // TODO : unflat if necessary
      return JSON.parse(dataString);
    }
    // If binary / octal / hex
    if (
      dataString[0] === "0" &&
      (dataString[1] === "b" || dataString[1] === "o" || dataString[1] === "x")
    ) {
      return dataString;
    }

    if (this._isParsableNumber(dataString)) {
      return eval(dataString.replace(/_/g, ""));
    }

    // Handle First and last EOL for multiline strings
    if (dataString.startsWith(`"\\n`)) {
      dataString = dataString.replace(`"\\n`, `"`);
    } else if (dataString.startsWith(`'\\n`)) {
      dataString = dataString.replace(`'\\n`, `'`);
    }
    if (dataString.endsWith(`\\n"`)) {
      dataString = dataString.replace(`\\n"`, `"`);
    } else if (dataString.endsWith(`\\n'`)) {
      dataString = dataString.replace(`\\n'`, `'`);
    }

    return eval(dataString);
  }
  _isLocalTime(str: string): boolean {
    const reg = /(\d{2}):(\d{2}):(\d{2})/;
    return reg.test(str);
  }
  _isParsableNumber(dataString: string): boolean {
    let d = dataString.replace(/_/g, "");
    return !isNaN(parseFloat(d));
  }
  _isDate(dateStr: string): boolean {
    const reg = /\d{4}-\d{2}-\d{2}/;
    return reg.test(dateStr);
  }
  _parseLines(): void {
    for (let i = 0; i < this.tomlLines.length; i++) {
      const line = this.tomlLines[i];
      if (this._isGroup(line)) {
        this._createGroup(line);
        continue;
      }
      if (this._isDeclaration(line)) {
        let kv = this._processDeclaration(line);
        if (!this.context.currentGroup) {
          this.context.output[kv.key] = kv.value;
        } else {
          if (this.context.currentGroup.type === "array") {
            // TODO (zekth) : handle array [[fruit]]
            let out = {};
            out[kv.key] = kv.value;
            this.context.currentGroup.arrValues.push(out);
          } else {
            this.context.currentGroup.objValues[kv.key] = kv.value;
          }
        }
      }
    }
    if (this.context.currentGroup) {
      this._groupToOutput();
    }
  }
  parse(): object {
    this._sanitize();
    this._parseLines();
    return this.context.output;
  }
}

export function parse(tomlString: string): object {
  // File is potentially using EOL CRLF
  tomlString = tomlString.replace(/\r\n/g, "\n");
  return new Parser(tomlString).parse();
}
export function parseFile(filePath: string): object {
  if (!existsSync(filePath)) {
    throw new Error("File not found");
  }
  const decoder = new TextDecoder();
  const strFile = decoder.decode(Deno.readFileSync(filePath));
  return parse(strFile);
}
