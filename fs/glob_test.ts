const { mkdir, open } = Deno;
import { FileInfo } from "deno";
import { test, assert } from "../testing/mod.ts";
import { glob } from "./glob.ts";
import { join } from "./path.ts";
import { testWalk } from "./walk_test.ts";
import { walk, walkSync, WalkOptions } from "./walk.ts";

async function touch(path: string): Promise<void> {
  await open(path, "w");
}

async function walkArray(
  dirname: string = ".",
  options: WalkOptions = {}
): Promise<Array<string>> {
  const arr: string[] = [];
  for await (const f of walk(dirname, { ...options })) {
    arr.push(f.path.replace(/\\/g, "/"));
  }
  arr.sort();
  const arr_sync = Array.from(walkSync(dirname, options), (f: FileInfo) =>
    f.path.replace(/\\/g, "/")
  ).sort();
  assert.equal(arr, arr_sync);
  return arr;
}

test({
  name: "glob: glob to regex",
  fn() {
    assert.equal(glob("unicorn.*")[0] instanceof RegExp, true);
    assert.equal(glob("unicorn.*")[0].test("poney.ts"), false);
    assert.equal(glob("unicorn.*")[0].test("unicorn.py"), true);
    assert.equal(glob("*.ts")[0].test("poney.ts"), true);
    assert.equal(glob("*.ts")[0].test("unicorn.js"), false);
    assert.equal(
      glob(join("unicorn","**","cathedral.ts"))[0].test(
        join("unicorn", "in", "the", "cathedral.ts")
      ),
      true
    );
    assert.equal(
      glob(join("unicorn","**","cathedral.ts"))[0].test(join("unicorn","in","the","kitchen.ts")),
      false
    );
    assert.equal(
      glob(join("unicorn","**","bathroom.*"))[0].test(join("unicorn","sleeping","in","bathroom.py")),
      true
    );
    assert.equal(
      glob(join("unicorn","!(sleeping)","bathroom.ts"), { extended: true })[0].test(
        join("unicorn","flying","bathroom.ts")
      ),
      true
    );
    assert.equal(
      glob(join("unicorn","(!sleeping)","bathroom.ts"), { extended: true })[0].test(
        join("unicorn","sleeping","bathroom.ts")
      ),
      false
    );
  }
});

testWalk(
  async (d: string) => {
    await mkdir(d + "/a");
    await touch(d + "/a/x.ts");
  },
  async function globInWalk() {
    const arr = await walkArray(".", { match: glob("*.ts") });
    assert.equal(arr.length, 1);
    assert.equal(arr[0], "./a/x.ts");
  }
);

testWalk(
  async (d: string) => {
    await mkdir(d + "/a");
    await mkdir(d + "/b");
    await touch(d + "/a/x.ts");
    await touch(d + "/b/z.ts");
    await touch(d + "/b/z.js");
  },
  async function globInWalkWildcardFiles() {
    const arr = await walkArray(".", { match: glob("*.ts") });
    assert.equal(arr.length, 2);
    assert.equal(arr[0], "./a/x.ts");
    assert.equal(arr[1], "./b/z.ts");
  }
);

testWalk(
  async (d: string) => {
    await touch(d + "x.ts");
    await touch(d + "x.js");
    await touch(d + "b.js");
  },
  async function globInWalkWildcardExtension() {
    const arr = await walkArray(".", { match: glob("x.*") });
    assert.equal(arr.length, 2);
    assert.equal(arr[0], "./x.ts");
    assert.equal(arr[1], "./x.js");
  }
);

testWalk(
  async (d: string) => {
    await mkdir(d + "/a");
    await mkdir(d + "/a/yo");
    await touch(d + "/a/yo/x.ts");
  },
  async function globInWalkFolderWildcard() {
    const arr = await walkArray(".", { match: glob(join(".","a","**","*.ts")) });
    assert.equal(arr.length, 1);
    assert.equal(arr[0], "./a/yo/x.ts");
  }
);
