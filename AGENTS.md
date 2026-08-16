# Deno Standard Library

The Deno Standard Library is a collection of high-quality packages for Deno and
the web, distributed via JSR as `@std/*`. It supports multiple runtimes: Deno,
Node.js, Bun, browsers, and Cloudflare Workers.

## Repository Structure

- Each top-level directory is a package (e.g., `async/`, `http/`,
  `collections/`)
- `_tools/` contains internal CI/dev tooling (lint plugins, doc checkers, etc.)
- Root `deno.json` defines the workspace, tasks, compiler options, and imports
  (mapping all `@std/*` packages and dev dependencies)

### Package Layout

Every package follows this structure:

```
<package>/
├── deno.json              # Name (@std/<package>), version, exports
├── mod.ts                 # Public entry point
├── <api>.ts               # Implementation (one function/class per file)
├── <api>_test.ts          # Tests for the corresponding source file
└── unstable_<api>.ts      # Experimental APIs (stable packages only)
```

- **Minimal exports**: each file exports a single function/class and related
  types
- **Unstable APIs** (`unstable_*.ts`): used in packages with version >= 1.0.0;
  must have `@experimental` TSDoc tag; must NOT be exported from `mod.ts`
- Packages with version < 1.0.0 have no unstable file restrictions

## Quality Gate

Run `deno task ok` before submitting. This runs:

- `deno task lint` — `deno lint` (includes the custom style-guide plugin at
  `_tools/lint_plugin.ts`) plus:
  - `lint:circular` — circular dependency detection
  - `lint:tools-types` — type-checks `_tools/`
  - `lint:mod-exports` — validates `mod.ts` exports
  - `lint:export-names` — verifies export naming
  - `lint:docs` — validates JSDoc completeness
  - `lint:unstable-deps` — ensures stable entrypoints don't import unstable
    modules
- `deno fmt --check`
- `deno task test:browser` (browser compatibility check)
- `deno task test` (full test suite with coverage and doc tests)

Spell checking (`deno task typos`) runs separately in CI.

## PR Conventions

### Title Format

PR titles must follow semantic format with a package scope:

```
feat(http): add streaming response support
fix(csv): handle escaped quotes correctly
docs(fmt): update docstrings
deprecation(encoding): base32hex
```

The scope must match an existing package name. New packages must first add their
name to the `scopes` list in `.github/workflows/title.yml`.

### Commit Messages

Follow the same semantic format as PR titles.

## Testing

- Framework: `Deno.test()` with `@std/assert` for assertions
- Test names: descriptive, include the symbol and criteria
  - `delay() resolves immediately with ms = 0`
  - `ensureDirSync() creates dir if it does not exist`
- Each source file gets a corresponding `_test.ts` file
- Do NOT use `@std/assert` in implementation code — only in tests

## Documentation Requirements

All public symbols must have JSDoc with:

1. Short description
2. `@typeParam` for each type parameter
3. `@param` for each parameter
4. `@returns` for return value
5. At least one `@example` with a title and runnable code snippet

Example snippets must be reproducible and use `@std/assert` assertions. Use
`ignore` directive to skip running a snippet, `expect-error` for expected
failures, `no-assert` to exempt a snippet from requiring assertions.

`deno task test` (via `--doc`) also type-checks TypeScript code fences in
markdown files such as README.md; mark snippets that cannot run in CI by tagging
the fence `ts ignore` instead of `ts`.

Module files (`mod.ts`) need a `@module` tag.

## Error Message Style

Follow
[Error Messages in CONTRIBUTING.md](./.github/CONTRIBUTING.md#error-messages)
when writing user-facing error messages.

## Error Classes

Follow
[Error Classes in CONTRIBUTING.md](./.github/CONTRIBUTING.md#error-classes) when
choosing which error class to throw.

## CI Pipeline

Tests run on Ubuntu, Windows, and macOS against Deno v1.x and v2.x. Canary is
covered by a scheduled nightly workflow, not PR CI. Cross-runtime testing
includes Node.js and Bun. Timezone-sensitive tests run across Sydney, London,
and Toronto.

## Versioning and Releases

- Packages >= 1.0.0: follow semver
- Packages < 1.0.0: follow semver proposal
  (https://github.com/semver/semver/pull/923)
- Release tags: `release-YYYY.MM.DD`
- Publishing: `workspace_publish` workflow pushes to JSR

## Deprecation Policy

Deprecated APIs use the format:

```ts
/**
 * @deprecated This will be removed in X.Y.Z. Use {@linkcode bar} instead.
 */
```

Deprecated symbols are removed in the next major version. PRs use the title
format `deprecation(<package>): <symbol>`.
