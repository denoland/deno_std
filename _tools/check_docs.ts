// Copyright 2018-2024 the Deno authors. All rights reserved. MIT license.

/**
 * This script checks that all public symbols documentation aligns with the
 * {@link ./CONTRIBUTING.md#documentation | documentation guidelines}.
 *
 * TODO(lucacasonato): Add support for variables, interfaces, namespaces, and type aliases.
 */
import {
  type ClassConstructorDef,
  type ClassMethodDef,
  type ClassPropertyDef,
  doc,
  type DocNode,
  type DocNodeBase,
  type DocNodeClass,
  type DocNodeFunction,
  type DocNodeInterface,
  type DocNodeModuleDoc,
  type JsDoc,
  type JsDocTagDocRequired,
  type Location,
  type TsTypeDef,
} from "@deno/doc";

type DocNodeWithJsDoc<T = DocNodeBase> = T & {
  jsDoc: JsDoc;
};

const ENTRY_POINTS = [
  "../assert/mod.ts",
  "../async/mod.ts",
  "../bytes/mod.ts",
  "../cache/mod.ts",
  "../cli/mod.ts",
  "../crypto/mod.ts",
  "../collections/mod.ts",
  "../csv/mod.ts",
  "../data_structures/mod.ts",
  "../datetime/mod.ts",
  "../dotenv/mod.ts",
  "../encoding/mod.ts",
  "../expect/mod.ts",
  "../fmt/bytes.ts",
  "../fmt/colors.ts",
  "../fmt/duration.ts",
  "../fmt/printf.ts",
  "../front_matter/mod.ts",
  "../fs/mod.ts",
  "../html/mod.ts",
  "../http/mod.ts",
  "../ini/mod.ts",
  "../internal/mod.ts",
  "../io/mod.ts",
  "../json/mod.ts",
  "../jsonc/mod.ts",
  "../media_types/mod.ts",
  "../msgpack/mod.ts",
  "../net/mod.ts",
  "../path/mod.ts",
  "../path/posix/mod.ts",
  "../path/windows/mod.ts",
  "../random/mod.ts",
  "../regexp/mod.ts",
  "../semver/mod.ts",
  "../streams/mod.ts",
  "../text/mod.ts",
  "../testing/bdd.ts",
  "../testing/mock.ts",
  "../testing/snapshot.ts",
  "../testing/time.ts",
  "../testing/types.ts",
  "../toml/mod.ts",
  "../ulid/mod.ts",
  "../url/mod.ts",
  "../uuid/mod.ts",
  "../webgpu/mod.ts",
  "../yaml/mod.ts",
] as const;

const TS_SNIPPET = /```ts[\s\S]*?```/g;
const ASSERTION_IMPORT =
  /from "@std\/(assert(\/[a-z-]+)?|testing\/(mock|snapshot|types))"/g;
const NEWLINE = "\n";
const diagnostics: DocumentError[] = [];
const snippetPromises: Promise<void>[] = [];

class DocumentError extends Error {
  constructor(
    message: string,
    document: { location: Location },
  ) {
    super(message, {
      cause: `${document.location.filename}:${document.location.line}`,
    });
    this.name = this.constructor.name;
  }
}

function assert(
  condition: boolean,
  message: string,
  document: { location: Location },
) {
  if (!condition) {
    diagnostics.push(new DocumentError(message, document));
  }
}

function isExported(document: DocNodeBase) {
  return document.declarationKind === "export";
}

function isVoidOrPromiseVoid(returnType: TsTypeDef) {
  return isVoid(returnType) ||
    (returnType.kind === "typeRef" &&
      returnType.typeRef.typeName === "Promise" &&
      returnType.typeRef.typeParams?.length === 1 &&
      isVoid(returnType.typeRef.typeParams[0]!));
}

function isTypeAsserts(returnType: TsTypeDef) {
  return returnType.kind === "typePredicate" &&
    returnType.typePredicate.asserts;
}

function isVoid(returnType: TsTypeDef) {
  return returnType.kind === "keyword" && returnType.keyword === "void";
}

function assertHasReturnTag(document: { jsDoc: JsDoc; location: Location }) {
  const tag = document.jsDoc.tags?.find((tag) => tag.kind === "return");
  if (tag === undefined) {
    diagnostics.push(
      new DocumentError("Symbol must have a @return or @returns tag", document),
    );
  } else {
    assert(
      // @ts-ignore doc is defined
      tag.doc !== undefined,
      "@return tag must have a description",
      document,
    );
  }
}

function assertHasParamTag(
  document: { jsDoc: JsDoc; location: Location },
  param: string,
) {
  const tag = document.jsDoc.tags?.find((tag) =>
    tag.kind === "param" && tag.name === param
  );
  if (!tag) {
    diagnostics.push(
      new DocumentError(`Symbol must have a @param tag for ${param}`, document),
    );
  } else {
    assert(
      // @ts-ignore doc is defined
      tag.doc !== undefined,
      `@param tag for ${param} must have a description`,
      document,
    );
  }
}

async function assertSnippetEvals(
  snippet: string,
  document: { jsDoc: JsDoc; location: Location },
) {
  const command = new Deno.Command(Deno.execPath(), {
    args: [
      "eval",
      "--ext=ts",
      "--unstable-webgpu",
      "--no-lock",
      snippet,
    ],
    stderr: "piped",
  });
  const timeoutId = setTimeout(() => {
    console.warn(
      `Snippet at ${document.location.filename}:${document.location.line} has been running for more than 10 seconds...`,
    );
    console.warn(snippet);
  }, 10_000);
  try {
    const { success, stderr } = await command.output();
    const error = new TextDecoder().decode(stderr);
    assert(
      success,
      `Failed to execute snippet: \n${snippet}\n${error}`,
      document,
    );
  } finally {
    clearTimeout(timeoutId);
  }
}

function assertSnippetsWork(
  doc: string,
  document: { jsDoc: JsDoc; location: Location },
  required = true,
) {
  const snippets = doc.match(TS_SNIPPET);
  if (snippets === null) {
    if (required) {
      diagnostics.push(
        new DocumentError(
          "@example tag must have a TypeScript code snippet",
          document,
        ),
      );
      return;
    } else {
      return;
    }
  }
  for (let snippet of snippets) {
    const delim = snippet.split(NEWLINE)[0];
    if (delim?.includes("no-eval")) continue;
    // Trim the code block delimiters
    snippet = snippet.split(NEWLINE).slice(1, -1).join(NEWLINE);
    if (!delim?.includes("no-assert")) {
      assert(
        snippet.match(ASSERTION_IMPORT) !== null,
        "Snippet must contain assertion from '@std/assert'",
        document,
      );
    }
    snippetPromises.push(assertSnippetEvals(snippet, document));
  }
}

function assertHasExampleTag(
  document: { jsDoc: JsDoc; location: Location },
) {
  const tags = document.jsDoc.tags?.filter((tag) =>
    tag.kind === "example"
  ) as JsDocTagDocRequired[];
  if (tags === undefined || tags.length === 0) {
    diagnostics.push(
      new DocumentError("Symbol must have an @example tag", document),
    );
    return;
  }
  for (const tag of tags) {
    assert(
      tag.doc !== undefined,
      "@example tag must have a title and TypeScript code snippet",
      document,
    );
    /**
     * Otherwise, if the example title is undefined, it is given the title
     * "Example #" by default.
     */
    assert(
      !tag.doc.startsWith("```ts"),
      "@example tag must have a title",
      document,
    );
    assertSnippetsWork(tag.doc, document);
  }
}

function assertHasTypeParamTags(
  document: { jsDoc: JsDoc; location: Location },
  typeParamName: string,
) {
  const tag = document.jsDoc.tags?.find((tag) =>
    tag.kind === "template" && tag.name === typeParamName
  );
  if (tag === undefined) {
    diagnostics.push(
      new DocumentError(
        `Symbol must have a @typeParam tag for ${typeParamName}`,
        document,
      ),
    );
  } else {
    assert(
      // @ts-ignore doc is defined
      tag.doc !== undefined,
      `@typeParam tag for ${typeParamName} must have a description`,
      document,
    );
  }
}

/**
 * Asserts that a function document has:
 * - A `@typeParam` tag for each type parameter.
 * - A {@linkcode https://jsdoc.app/tags-param | @param} tag for each parameter.
 * - A {@linkcode https://jsdoc.app/tags-returns | @returns} tag.
 * - At least one {@linkcode https://jsdoc.app/tags-example | @example} tag with
 *   a code snippet that executes successfully.
 */
function assertFunctionDocs(
  document: DocNodeWithJsDoc<DocNodeFunction | ClassMethodDef>,
) {
  assertSnippetsWork(document.jsDoc.doc!, document, false);
  for (const param of document.functionDef.params) {
    if (param.kind === "identifier") {
      assertHasParamTag(document, param.name);
    }
    if (param.kind === "assign" && param.left.kind === "identifier") {
      assertHasParamTag(document, param.left.name);
    }
  }
  for (const typeParam of document.functionDef.typeParams) {
    assertHasTypeParamTags(document, typeParam.name);
  }
  if (
    document.functionDef.returnType !== undefined &&
    !isVoidOrPromiseVoid(document.functionDef.returnType) &&
    !isTypeAsserts(document.functionDef.returnType)
  ) {
    assertHasReturnTag(document);
  }
  assertHasExampleTag(document);
}

/**
 * Asserts that a class document has:
 * - A `@typeParam` tag for each type parameter.
 * - At least one {@linkcode https://jsdoc.app/tags-example | @example} tag with
 *   a code snippet that executes successfully.
 * - Documentation on all properties, methods, and constructors.
 */
function assertClassDocs(document: DocNodeWithJsDoc<DocNodeClass>) {
  assertSnippetsWork(document.jsDoc.doc!, document, false);
  for (const typeParam of document.classDef.typeParams) {
    assertHasTypeParamTags(document, typeParam.name);
  }
  assertHasExampleTag(document);

  for (const property of document.classDef.properties) {
    if (property.jsDoc === undefined) continue; // this is caught by `deno doc --lint`
    if (property.accessibility !== undefined) {
      diagnostics.push(
        new DocumentError(
          "Do not use `public`, `protected`, or `private` fields in classes",
          property,
        ),
      );
      continue;
    }
    assertClassPropertyDocs(
      property as DocNodeWithJsDoc<ClassPropertyDef>,
    );
  }
  for (const method of document.classDef.methods) {
    if (method.jsDoc === undefined) continue; // this is caught by `deno doc --lint`
    if (method.accessibility !== undefined) {
      diagnostics.push(
        new DocumentError(
          "Do not use `public`, `protected`, or `private` methods in classes",
          method,
        ),
      );
    }
    assertFunctionDocs(method as DocNodeWithJsDoc<ClassMethodDef>);
  }
  for (const constructor of document.classDef.constructors) {
    if (constructor.jsDoc === undefined) continue; // this is caught by `deno doc --lint`
    if (constructor.accessibility !== undefined) {
      diagnostics.push(
        new DocumentError(
          "Do not use `public`, `protected`, or `private` constructors in classes",
          constructor,
        ),
      );
    }
    assertConstructorDocs(
      constructor as DocNodeWithJsDoc<ClassConstructorDef>,
    );
  }
}

/**
 * Asserts that a class property document has:
 * - At least one {@linkcode https://jsdoc.app/tags-example | @example} tag with
 *   a code snippet that executes successfully.
 */
function assertClassPropertyDocs(
  property: DocNodeWithJsDoc<ClassPropertyDef>,
) {
  assertHasExampleTag(property);
}

/**
 * Checks a constructor document for:
 * - No TypeScript parameters marked with `public`, `protected`, or `private`.
 * - A {@linkcode https://jsdoc.app/tags-param | @param} tag for each parameter.
 * - At least one {@linkcode https://jsdoc.app/tags-example | @example} tag with
 *   a code snippet that executes successfully.
 */
function assertConstructorDocs(
  constructor: DocNodeWithJsDoc<ClassConstructorDef>,
) {
  for (const param of constructor.params) {
    assert(
      param.accessibility === undefined,
      "Do not use `public`, `protected`, or `private` parameters in constructors",
      constructor,
    );
    if (param.kind === "identifier") {
      assertHasParamTag(constructor, param.name);
    }
    if (param.kind === "assign" && param.left.kind === "identifier") {
      assertHasParamTag(constructor, param.left.name);
    }
  }
}

/**
 * Checks a module document for:
 * - Code snippets that execute successfully.
 */
function assertModuleDoc(document: DocNodeWithJsDoc<DocNodeModuleDoc>) {
  assertSnippetsWork(document.jsDoc.doc!, document);
}

/**
 * Ensures an interface document:
 * - Has `@default` tags for all optional properties.
 */
// deno-lint-ignore no-unused-vars
function assertHasDefaultTags(document: DocNodeWithJsDoc<DocNodeInterface>) {
  for (const prop of document.interfaceDef.properties) {
    if (!prop.optional) continue;
    if (!prop.jsDoc?.tags?.find((tag) => tag.kind === "default")) {
      diagnostics.push(
        new DocumentError(
          "Optional interface properties should have default values",
          document,
        ),
      );
    }
  }
}

// deno-lint-ignore no-unused-vars
function assertInterfaceDocs(document: DocNodeWithJsDoc<DocNodeInterface>) {
  // TODO(iuioiua): This is currently disabled deliberately, as it throws errors
  // for interface properties that don't have a `@default` tag. Re-enable this
  // when checking for `@default` tags again, or when a solution is found for
  // ignoring some properties (those that don't require a `@default` tag).
  // assertHasDefaultTags(document);
}

function resolve(specifier: string, referrer: string): string {
  if (specifier.startsWith("@std/")) {
    specifier = specifier.replace("@std/", "../").replaceAll("-", "_");
    const parts = specifier.split("/");
    if (parts.length === 2) {
      specifier += "/mod.ts";
    } else if (parts.length > 2) {
      specifier += ".ts";
    }
  }
  return new URL(specifier, referrer).href;
}

async function checkDocs(specifier: string) {
  const docs = await doc(specifier, { resolve });
  for (const d of docs.filter(isExported)) {
    if (d.jsDoc === undefined) continue; // this is caught by other checks
    const document = d as DocNodeWithJsDoc<DocNode>;
    switch (document.kind) {
      case "moduleDoc": {
        assertModuleDoc(document);
        break;
      }
      case "function": {
        assertFunctionDocs(document);
        break;
      }
      case "class": {
        assertClassDocs(document);
        break;
      }
      case "interface":
        assertInterfaceDocs(document);
    }
  }
}

const ENTRY_POINT_URLS = ENTRY_POINTS.map((entry) =>
  new URL(entry, import.meta.url).href
);

const lintStatus = await new Deno.Command(Deno.execPath(), {
  args: ["doc", "--lint", ...ENTRY_POINT_URLS],
  stdin: "inherit",
  stdout: "inherit",
  stderr: "inherit",
}).output();
if (!lintStatus.success) {
  console.error(
    `%c[error] %c'deno doc --lint' failed`,
    "color: red",
    "",
  );
  Deno.exit(1);
}

const promises = [];
for (const url of ENTRY_POINT_URLS) {
  promises.push(checkDocs(url));
}

await Promise.all(promises);
await Promise.all(snippetPromises);
if (diagnostics.length > 0) {
  for (const error of diagnostics) {
    console.error(
      `%c[error] %c${error.message} %cat ${error.cause}`,
      "color: red",
      "",
      "color: gray",
    );
  }

  console.log(`%c${diagnostics.length} errors found`, "color: red");
  Deno.exit(1);
}
