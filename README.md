# Deno Standard Library

[![codecov](https://codecov.io/gh/denoland/deno_std/branch/main/graph/badge.svg?token=w6s3ODtULz)](https://codecov.io/gh/denoland/deno_std)
[![ci](https://github.com/denoland/deno_std/actions/workflows/ci.yml/badge.svg)](https://github.com/denoland/deno_std/actions/workflows/ci.yml)

High-quality APIs for [Deno](https://deno.com/) and the web. Use fearlessly.

> **NOTE:** The standard library is also available on JSR - check out the
> [`@std` scope on JSR here](https://jsr.io/@std).

## Get Started

```ts
import { copy } from "https://deno.land/std@$STD_VERSION/fs/copy.ts";

await copy("./foo", "./bar");
```

See [here](#recommended-usage) for recommended usage patterns.

## Documentation

Check out the documentation [here](https://deno.land/std?doc).

## Recommended Usage

1. Include the version of the library in the import specifier.

   Good:
   ```ts
   import { copy } from "https://deno.land/std@$STD_VERSION/fs/copy.ts";
   ```

1. Only import modules that you require.

   Bad (when using only one function):
   ```ts
   import * as fs from "https://deno.land/std@$STD_VERSION/fs/mod.ts";
   ```

   Good (when using only one function):
   ```ts
   import { copy } from "https://deno.land/std@$STD_VERSION/fs/copy.ts";
   ```

   Good (when using multiple functions):
   ```ts
   import * as fs from "https://deno.land/std@$STD_VERSION/fs/mod.ts";
   ```

1. Do not import symbols with a name _prefixed_ by an underscore (they're not
   intended for public use).

   Bad:
   ```ts, ignore
   import { _format } from "https://deno.land/std@$STD_VERSION/path/_common/format.ts";
   ```

1. Do not import modules with a directory or filename _prefixed_ by an
   underscore (they're not intended for public use).

   Bad:
   ```ts, ignore
   import { createLPS } from "https://deno.land/std@$STD_VERSION/streams/_common.ts";
   ```

   Good:
   ```ts
   import { TextLineStream } from "https://deno.land/std@$STD_VERSION/streams/text_line_stream.ts";
   ```

1. Do not import test modules or test data.

   Bad:
   ```ts
   import { test } from "https://deno.land/std@$STD_VERSION/front_matter/test.ts";
   ```

## Stability

| Sub-module      | Status   |
| --------------- | -------- |
| archive         | Unstable |
| assert          | Stable   |
| async           | Stable   |
| bytes           | Stable   |
| cli             | Unstable |
| collections     | Stable   |
| console         | Unstable |
| crypto          | Stable   |
| csv             | Stable   |
| data_structures | Unstable |
| datetime        | Unstable |
| dotenv          | Unstable |
| encoding        | Stable   |
| expect          | Unstable |
| flags           | Unstable |
| fmt             | Stable   |
| front_matter    | Stable   |
| fs              | Stable   |
| html            | Unstable |
| http            | Unstable |
| ini             | Unstable |
| io              | Unstable |
| json            | Stable   |
| jsonc           | Stable   |
| log             | Unstable |
| media_types     | Stable   |
| msgpack         | Unstable |
| net             | Unstable |
| path            | Stable   |
| permissions     | Unstable |
| regexp          | Unstable |
| semver          | Unstable |
| streams         | Stable   |
| testing         | Stable   |
| text            | Unstable |
| toml            | Stable   |
| ulid            | Unstable |
| url             | Unstable |
| uuid            | Stable   |
| webgpu          | Unstable |
| yaml            | Stable   |

> For background and discussions regarding the stability of the following
> sub-modules, see [#3489](https://github.com/denoland/deno_std/issues/3489).

## Design

## Minimal Exports

Files are structured to minimize the number of dependencies they incur and the
amount of effort required to manage them, both for the maintainer and the user.
In most cases, only a single function or class, alongside its related types, are
exported. In other cases, functions that incur negligible dependency overhead
will be grouped together in the same file.

## Deprecation Policy

We deprecate the APIs in the Standard Library when they get covered by new
JavaScript language APIs or new Web Standard APIs. These APIs are usually
removed after 3 minor versions.

If you still need to use such APIs after the removal for some reason (for
example, the usage in Fresh island), please use the URL pinned to the version
where they are still available.

For example, if you want to keep using `readableStreamFromIterable`, which was
deprecated and removed in favor of `ReadableStream.from` in `v0.195.0`, please
use the import URL pinned to `v0.194.0`:

```ts
import { readableStreamFromIterable } from "https://deno.land/std@0.194.0/streams/readable_stream_from_iterable.ts";
```

## Contributing

Check out the contributing guidelines [here](.github/CONTRIBUTING.md).

## Releases

The Standard Library is versioned independently of the Deno CLI. This will
change once the Standard Library is stabilized. See
[here](https://deno.com/versions.json) for the compatibility of different
versions of the Deno Standard Library and the Deno CLI.

A new minor version of the Standard Library is published at the same time as
every new version of the Deno CLI (including patch versions).

## Badge

[![Built with the Deno Standard Library](./badge.svg)](https://deno.land/std)

```html
<a href="https://deno.land/std">
  <img
    width="135"
    height="20"
    src="https://raw.githubusercontent.com/denoland/deno_std/main/badge.svg"
    alt="Built with the Deno Standard Library"
  />
</a>
```

```md
[![Built with the Deno Standard Library](https://raw.githubusercontent.com/denoland/deno_std/main/badge.svg)](https://deno.land/std)
```
