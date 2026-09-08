// Copyright 2018-2026 the Deno authors. MIT license.
import {
  assert,
  assertEquals,
  assertStrictEquals,
  assertThrows,
} from "@std/assert";
import { BinarySearchTree } from "./binary_search_tree.ts";
import { ascend, descend } from "./comparators.ts";
import { type Container, MyMath } from "./_test_utils.ts";

Deno.test("BinarySearchTree throws if compare is not a function", () => {
  assertThrows(
    () => new BinarySearchTree({} as (a: number, b: number) => number),
    TypeError,
    "Cannot construct a BinarySearchTree: the 'compare' parameter is not a function, did you mean to call BinarySearchTree.from?",
  );
});

Deno.test("BinarySearchTree handles default ascend comparator", () => {
  const trees = [
    new BinarySearchTree(),
    new BinarySearchTree(),
  ] as const;
  const values: number[] = [-10, 9, -1, 100, 1, 0, -100, 10, -9];

  const expectedMin: number[][] = [
    [-10, -10, -10, -10, -10, -10, -100, -100, -100],
    [-9, -9, -100, -100, -100, -100, -100, -100, -100],
  ];
  const expectedMax: number[][] = [
    [-10, 9, 9, 100, 100, 100, 100, 100, 100],
    [-9, 10, 10, 10, 10, 100, 100, 100, 100],
  ];
  for (const [i, tree] of trees.entries()) {
    assertEquals(tree.size, 0);
    assertEquals(tree.isEmpty(), true);
    for (const [j, value] of values.entries()) {
      assertEquals(tree.find(value), null);
      assertEquals(tree.insert(value), true);
      assertEquals(tree.find(value), value);
      assertEquals(tree.size, j + 1);
      assertEquals(tree.isEmpty(), false);
      assertEquals(tree.min(), expectedMin?.[i]?.[j]);
      assertEquals(tree.max(), expectedMax?.[i]?.[j]);
    }
    for (const value of values) {
      assertEquals(tree.insert(value), false);
      assertEquals(tree.size, values.length);
      assertEquals(tree.isEmpty(), false);
      assertEquals(tree.min(), -100);
      assertEquals(tree.max(), 100);
    }
    values.reverse();
  }

  for (const tree of trees) {
    assertEquals(
      [...tree.lnrValues()],
      [-100, -10, -9, -1, 0, 1, 9, 10, 100],
    );
    assertEquals(tree.size, values.length);
    assertEquals(tree.isEmpty(), false);

    assertEquals(
      [...tree],
      [-100, -10, -9, -1, 0, 1, 9, 10, 100],
    );
    assertEquals(tree.size, values.length);
    assertEquals(tree.isEmpty(), false);

    assertEquals(
      [...tree.rnlValues()],
      [100, 10, 9, 1, 0, -1, -9, -10, -100],
    );
    assertEquals(tree.size, values.length);
    assertEquals(tree.isEmpty(), false);
  }

  assertEquals(
    [...trees[0].nlrValues()],
    [-10, -100, 9, -1, -9, 1, 0, 100, 10],
  );
  assertEquals(
    [...trees[1].nlrValues()],
    [-9, -100, -10, 10, 0, -1, 1, 9, 100],
  );
  for (const tree of trees) {
    assertEquals(tree.size, values.length);
    assertEquals(tree.isEmpty(), false);
  }

  assertEquals(
    [...trees[0].lrnValues()],
    [-100, -9, 0, 1, -1, 10, 100, 9, -10],
  );
  assertEquals(
    [...trees[1].lrnValues()],
    [-10, -100, -1, 9, 1, 0, 100, 10, -9],
  );
  for (const tree of trees) {
    assertEquals(tree.size, values.length);
    assertEquals(tree.isEmpty(), false);
  }

  assertEquals(
    [...trees[0].lvlValues()],
    [-10, -100, 9, -1, 100, -9, 1, 10, 0],
  );
  assertEquals(
    [...trees[1].lvlValues()],
    [-9, -100, 10, -10, 0, 100, -1, 1, 9],
  );
  for (const tree of trees) {
    assertEquals(tree.size, values.length);
    assertEquals(tree.isEmpty(), false);
  }

  for (const tree of trees) {
    const expected: number[] = [-100, -10, -9, -1, 0, 1, 9, 10, 100];
    for (const [j, value] of values.entries()) {
      assertEquals(tree.size, values.length - j);
      assertEquals(tree.isEmpty(), false);
      assertEquals(tree.find(value), value);

      assertEquals(tree.remove(value), true);
      expected.splice(expected.indexOf(value), 1);
      assertEquals([...tree], expected);
      assertEquals(tree.find(value), null);

      assertEquals(tree.remove(value), false);
      assertEquals([...tree], expected);
      assertEquals(tree.find(value), null);
    }
    assertEquals(tree.size, 0);
    assertEquals(tree.isEmpty(), true);
  }
});

Deno.test("BinarySearchTree handles descend comparator", () => {
  const trees = [
    new BinarySearchTree(descend),
    new BinarySearchTree(descend),
  ] as const;
  const values: number[] = [-10, 9, -1, 100, 1, 0, -100, 10, -9];

  const expectedMin: number[][] = [
    [-10, 9, 9, 100, 100, 100, 100, 100, 100],
    [-9, 10, 10, 10, 10, 100, 100, 100, 100, 100],
  ];
  const expectedMax: number[][] = [
    [-10, -10, -10, -10, -10, -10, -100, -100, -100],
    [-9, -9, -100, -100, -100, -100, -100, -100, -100],
  ];
  for (const [i, tree] of trees.entries()) {
    assertEquals(tree.size, 0);
    assertEquals(tree.isEmpty(), true);
    for (const [j, value] of values.entries()) {
      assertEquals(tree.find(value), null);
      assertEquals(tree.insert(value), true);
      assertEquals(tree.find(value), value);
      assertEquals(tree.size, j + 1);
      assertEquals(tree.isEmpty(), false);
      assertEquals(tree.min(), expectedMin?.[i]?.[j]);
      assertEquals(tree.max(), expectedMax?.[i]?.[j]);
    }
    for (const value of values) {
      assertEquals(tree.insert(value), false);
      assertEquals(tree.size, values.length);
      assertEquals(tree.isEmpty(), false);
      assertEquals(tree.min(), 100);
      assertEquals(tree.max(), -100);
    }
    values.reverse();
  }

  for (const tree of trees) {
    assertEquals(
      [...tree.lnrValues()],
      [100, 10, 9, 1, 0, -1, -9, -10, -100],
    );
    assertEquals(tree.size, values.length);
    assertEquals(tree.isEmpty(), false);

    assertEquals(
      [...tree],
      [100, 10, 9, 1, 0, -1, -9, -10, -100],
    );
    assertEquals(tree.size, values.length);
    assertEquals(tree.isEmpty(), false);

    assertEquals(
      [...tree.rnlValues()],
      [-100, -10, -9, -1, 0, 1, 9, 10, 100],
    );
    assertEquals(tree.size, values.length);
    assertEquals(tree.isEmpty(), false);
  }

  assertEquals(
    [...trees[0].nlrValues()],
    [-10, 9, 100, 10, -1, 1, 0, -9, -100],
  );
  assertEquals(
    [...trees[1].nlrValues()],
    [-9, 10, 100, 0, 1, 9, -1, -100, -10],
  );
  for (const tree of trees) {
    assertEquals(tree.size, values.length);
    assertEquals(tree.isEmpty(), false);
  }

  assertEquals(
    [...trees[0].lrnValues()],
    [10, 100, 0, 1, -9, -1, 9, -100, -10],
  );
  assertEquals(
    [...trees[1].lrnValues()],
    [100, 9, 1, -1, 0, 10, -10, -100, -9],
  );
  for (const tree of trees) {
    assertEquals(tree.size, values.length);
    assertEquals(tree.isEmpty(), false);
  }

  assertEquals(
    [...trees[0].lvlValues()],
    [-10, 9, -100, 100, -1, 10, 1, -9, 0],
  );
  assertEquals(
    [...trees[1].lvlValues()],
    [-9, 10, -100, 100, 0, -10, 1, -1, 9],
  );
  for (const tree of trees) {
    assertEquals(tree.size, values.length);
    assertEquals(tree.isEmpty(), false);
  }

  for (const tree of trees) {
    const expected: number[] = [100, 10, 9, 1, 0, -1, -9, -10, -100];
    for (const [j, value] of values.entries()) {
      assertEquals(tree.size, values.length - j);
      assertEquals(tree.isEmpty(), false);
      assertEquals(tree.find(value), value);

      assertEquals(tree.remove(value), true);
      expected.splice(expected.indexOf(value), 1);
      assertEquals([...tree], expected);
      assertEquals(tree.find(value), null);

      assertEquals(tree.remove(value), false);
      assertEquals([...tree], expected);
      assertEquals(tree.find(value), null);
    }
    assertEquals(tree.size, 0);
    assertEquals(tree.isEmpty(), true);
  }
});

Deno.test("BinarySearchTree contains objects", () => {
  const tree: BinarySearchTree<Container> = new BinarySearchTree((
    a: Container,
    b: Container,
  ) => ascend(a.id, b.id));
  const ids = [-10, 9, -1, 100, 1, 0, -100, 10, -9];

  for (const [i, id] of ids.entries()) {
    const newContainer: Container = { id, values: [] };
    assertEquals(tree.find(newContainer), null);
    assertEquals(tree.insert(newContainer), true);
    newContainer.values.push(i - 1, i, i + 1);
    assertStrictEquals(tree.find({ id, values: [] }), newContainer);
    assertEquals(tree.size, i + 1);
    assertEquals(tree.isEmpty(), false);
  }
  for (const [i, id] of ids.entries()) {
    const newContainer: Container = { id, values: [] };
    assertEquals(
      tree.find({ id } as Container),
      { id, values: [i - 1, i, i + 1] },
    );
    assertEquals(tree.insert(newContainer), false);
    assertEquals(
      tree.find({ id, values: [] }),
      { id, values: [i - 1, i, i + 1] },
    );
    assertEquals(tree.size, ids.length);
    assertEquals(tree.isEmpty(), false);
  }

  assertEquals(
    [...tree].map((container) => container.id),
    [-100, -10, -9, -1, 0, 1, 9, 10, 100],
  );
  assertEquals(tree.size, ids.length);
  assertEquals(tree.isEmpty(), false);

  const expected: number[] = [-100, -10, -9, -1, 0, 1, 9, 10, 100];
  for (const [i, id] of ids.entries()) {
    assertEquals(tree.size, ids.length - i);
    assertEquals(tree.isEmpty(), false);
    assertEquals(
      tree.find({ id, values: [] }),
      { id, values: [i - 1, i, i + 1] },
    );

    assertEquals(tree.remove({ id, values: [] }), true);
    expected.splice(expected.indexOf(id), 1);
    assertEquals([...tree].map((container) => container.id), expected);
    assertEquals(tree.find({ id, values: [] }), null);

    assertEquals(tree.remove({ id, values: [] }), false);
    assertEquals([...tree].map((container) => container.id), expected);
    assertEquals(tree.find({ id, values: [] }), null);
  }
  assertEquals(tree.size, 0);
  assertEquals(tree.isEmpty(), true);
});

Deno.test("BinarySearchTree.from() handles empty array-like objects", () => {
  const tree = BinarySearchTree.from<number>({ length: 0 });
  assertEquals([...tree], []);
  assertEquals(tree.size, 0);
});

Deno.test("BinarySearchTree.from() handles array-like objects", () => {
  const values = { 0: 3, 1: 1, 2: 3, 3: 2, length: 4 };
  const tree = BinarySearchTree.from(values);
  assertEquals([...tree], [1, 2, 3]);
  assertEquals(tree.size, 3);
});

Deno.test("BinarySearchTree.from() handles array-like objects with a custom comparator", () => {
  const values = { 0: 3, 1: 1, 2: 3, 3: 2, length: 4 };
  const tree = BinarySearchTree.from(values, { compare: descend });
  assertEquals([...tree], [3, 2, 1]);
  assertEquals(tree.size, 3);
});

Deno.test("BinarySearchTree.from() handles iterable", () => {
  const values: number[] = [-10, 9, -1, 100, 9, 1, 0, 9, -100, 10, -9];
  const originalValues: number[] = Array.from(values);
  const expected: number[] = [-100, -10, -9, -1, 0, 1, 9, 10, 100];
  let tree: BinarySearchTree<number> = BinarySearchTree.from(values);
  assertEquals(values, originalValues);
  assertEquals([...tree], expected);
  assertEquals([...tree.nlrValues()], [-10, -100, 9, -1, -9, 1, 0, 100, 10]);
  assertEquals([...tree.lvlValues()], [-10, -100, 9, -1, 100, -9, 1, 10, 0]);

  tree = BinarySearchTree.from(values, { compare: descend });
  assertEquals(values, originalValues);
  assertEquals([...tree].reverse(), expected);
  assertEquals([...tree.nlrValues()], [-10, 9, 100, 10, -1, 1, 0, -9, -100]);
  assertEquals([...tree.lvlValues()], [-10, 9, -100, 100, -1, 10, 1, -9, 0]);

  tree = BinarySearchTree.from(values, {
    map: (v: number) => 2 * v,
  });
  assertEquals([...tree], expected.map((v: number) => 2 * v));
  assertEquals([...tree.nlrValues()], [-20, -200, 18, -2, -18, 2, 0, 200, 20]);
  assertEquals([...tree.lvlValues()], [-20, -200, 18, -2, 200, -18, 2, 20, 0]);

  const math = new MyMath();
  tree = BinarySearchTree.from(values, {
    map: function (this: MyMath, v: number) {
      return this.multiply(3, v);
    },
    thisArg: math,
  });
  assertEquals(values, originalValues);
  assertEquals([...tree], expected.map((v: number) => 3 * v));
  assertEquals([...tree.nlrValues()], [-30, -300, 27, -3, -27, 3, 0, 300, 30]);
  assertEquals([...tree.lvlValues()], [-30, -300, 27, -3, 300, -27, 3, 30, 0]);

  tree = BinarySearchTree.from(values, {
    compare: descend,
    map: (v: number) => 2 * v,
  });
  assertEquals(values, originalValues);
  assertEquals([...tree].reverse(), expected.map((v: number) => 2 * v));
  assertEquals([...tree.nlrValues()], [-20, 18, 200, 20, -2, 2, 0, -18, -200]);
  assertEquals([...tree.lvlValues()], [-20, 18, -200, 200, -2, 20, 2, -18, 0]);

  tree = BinarySearchTree.from(values, {
    compare: descend,
    map: function (this: MyMath, v: number) {
      return this.multiply(3, v);
    },
    thisArg: math,
  });
  assertEquals(values, originalValues);
  assertEquals([...tree].reverse(), expected.map((v: number) => 3 * v));
  assertEquals([...tree.nlrValues()], [-30, 27, 300, 30, -3, 3, 0, -27, -300]);
  assertEquals([...tree.lvlValues()], [-30, 27, -300, 300, -3, 30, 3, -27, 0]);
});

Deno.test("BinarySearchTree.from() handles default ascend comparator", () => {
  const values: number[] = [-10, 9, -1, 100, 9, 1, 0, 9, -100, 10, -9];
  const expected: number[] = [-100, -10, -9, -1, 0, 1, 9, 10, 100];
  const originalTree: BinarySearchTree<number> = new BinarySearchTree();
  for (const value of values) originalTree.insert(value);
  let tree: BinarySearchTree<number> = BinarySearchTree.from(originalTree);
  assertEquals([...originalTree], expected);
  assertEquals([...tree], expected);
  assertEquals(tree.size, originalTree.size);
  assertEquals([...tree.nlrValues()], [...originalTree.nlrValues()]);
  assertEquals([...tree.lvlValues()], [...originalTree.lvlValues()]);

  tree = BinarySearchTree.from(originalTree, { compare: descend });
  assertEquals([...originalTree], expected);
  assertEquals([...tree].reverse(), expected);
  assertEquals([...tree.nlrValues()], expected);
  assertEquals([...tree.lvlValues()], expected);

  tree = BinarySearchTree.from(originalTree, {
    map: (v: number) => 2 * v,
  });
  assertEquals([...originalTree], expected);
  assertEquals([...tree], expected.map((v: number) => 2 * v));

  const math = new MyMath();
  tree = BinarySearchTree.from(originalTree, {
    map: function (this: MyMath, v: number) {
      return this.multiply(3, v);
    },
    thisArg: math,
  });
  assertEquals([...originalTree], expected);
  assertEquals([...tree], expected.map((v: number) => 3 * v));

  tree = BinarySearchTree.from(originalTree, {
    compare: descend,
    map: (v: number) => 2 * v,
  });
  assertEquals([...originalTree], expected);
  assertEquals([...tree].reverse(), expected.map((v: number) => 2 * v));

  tree = BinarySearchTree.from(originalTree, {
    compare: descend,
    map: function (this: MyMath, v: number) {
      return this.multiply(3, v);
    },
    thisArg: math,
  });
  assertEquals([...originalTree], expected);
  assertEquals([...tree].reverse(), expected.map((v: number) => 3 * v));
});

Deno.test("BinarySearchTree.from() deep-copies nodes so mutating the copy leaves the original intact", () => {
  const values = [3, 10, 13, 4, 6, 7, 1, 14];
  const original = BinarySearchTree.from(values);
  const copy = BinarySearchTree.from(original);

  // Removing from the copy must not affect the original.
  assertStrictEquals(copy.remove(7), true);
  assertStrictEquals(original.find(7), 7);
  assertEquals([...original], [1, 3, 4, 6, 7, 10, 13, 14]);
  assertEquals([...copy], [1, 3, 4, 6, 10, 13, 14]);

  // Removing from the original must not affect the copy.
  assertStrictEquals(original.remove(1), true);
  assertStrictEquals(copy.find(1), 1);
  assertEquals([...original], [3, 4, 6, 7, 10, 13, 14]);
  assertEquals([...copy], [1, 3, 4, 6, 10, 13, 14]);
});

Deno.test("BinarySearchTree.from() handles descend comparator", () => {
  const values: number[] = [-10, 9, -1, 100, 9, 1, 0, 9, -100, 10, -9];
  const expected: number[] = [100, 10, 9, 1, 0, -1, -9, -10, -100];
  const originalTree = new BinarySearchTree<number>(descend);
  for (const value of values) originalTree.insert(value);
  let tree: BinarySearchTree<number> = BinarySearchTree.from(originalTree);
  assertEquals([...originalTree], expected);
  assertEquals([...tree], expected);
  assertEquals(tree.size, originalTree.size);
  assertEquals([...tree.nlrValues()], [...originalTree.nlrValues()]);
  assertEquals([...tree.lvlValues()], [...originalTree.lvlValues()]);

  tree = BinarySearchTree.from(originalTree, { compare: ascend });
  assertEquals([...originalTree], expected);
  assertEquals([...tree].reverse(), expected);
  assertEquals([...tree.nlrValues()], expected);
  assertEquals([...tree.lvlValues()], expected);

  tree = BinarySearchTree.from(originalTree, {
    map: (v: number) => 2 * v,
  });
  assertEquals([...originalTree], expected);
  assertEquals([...tree], expected.map((v: number) => 2 * v));

  const math = new MyMath();
  tree = BinarySearchTree.from(originalTree, {
    map: function (this: MyMath, v: number) {
      return this.multiply(3, v);
    },
    thisArg: math,
  });
  assertEquals([...originalTree], expected);
  assertEquals([...tree], expected.map((v: number) => 3 * v));

  tree = BinarySearchTree.from(originalTree, {
    compare: ascend,
    map: (v: number) => 2 * v,
  });
  assertEquals([...originalTree], expected);
  assertEquals([...tree].reverse(), expected.map((v: number) => 2 * v));

  tree = BinarySearchTree.from(originalTree, {
    compare: ascend,
    map: function (this: MyMath, v: number) {
      return this.multiply(3, v);
    },
    thisArg: math,
  });
  assertEquals([...originalTree], expected);
  assertEquals([...tree].reverse(), expected.map((v: number) => 3 * v));
});

Deno.test("BinarySearchTree handles README example", () => {
  const values = [3, 10, 13, 4, 6, 7, 1, 14];
  const tree = new BinarySearchTree<number>();
  values.forEach((value) => tree.insert(value));
  assertEquals([...tree], [1, 3, 4, 6, 7, 10, 13, 14]);
  assertEquals(tree.min(), 1);
  assertEquals(tree.max(), 14);
  assertEquals(tree.find(42), null);
  assertEquals(tree.find(7), 7);
  assertEquals(tree.remove(42), false);
  assertEquals(tree.remove(7), true);
  assertEquals([...tree], [1, 3, 4, 6, 10, 13, 14]);

  const invertedTree = new BinarySearchTree<number>(descend);
  values.forEach((value) => invertedTree.insert(value));
  assertEquals([...invertedTree], [14, 13, 10, 7, 6, 4, 3, 1]);
  assertEquals(invertedTree.min(), 14);
  assertEquals(invertedTree.max(), 1);
  assertEquals(invertedTree.find(42), null);
  assertEquals(invertedTree.find(7), 7);
  assertEquals(invertedTree.remove(42), false);
  assertEquals(invertedTree.remove(7), true);
  assertEquals([...invertedTree], [14, 13, 10, 6, 4, 3, 1]);

  const words = new BinarySearchTree<string>((a, b) =>
    ascend(a.length, b.length) || ascend(a, b)
  );
  ["truck", "car", "helicopter", "tank", "train", "suv", "semi", "van"]
    .forEach((value) => words.insert(value));
  assertEquals([...words], [
    "car",
    "suv",
    "van",
    "semi",
    "tank",
    "train",
    "truck",
    "helicopter",
  ]);
  assertEquals(words.min(), "car");
  assertEquals(words.max(), "helicopter");
  assertEquals(words.find("scooter"), null);
  assertEquals(words.find("tank"), "tank");
  assertEquals(words.remove("scooter"), false);
  assertEquals(words.remove("tank"), true);
  assertEquals([...words], [
    "car",
    "suv",
    "van",
    "semi",
    "train",
    "truck",
    "helicopter",
  ]);
});

Deno.test("BinarySearchTree.max() handles null", () => {
  const tree = BinarySearchTree.from([1]);
  assert(!tree.isEmpty());
  tree.clear();
  assertEquals(tree.max(), null);
});

Deno.test("BinarySearchTree.clear()", () => {
  const tree = BinarySearchTree.from([1]);
  tree.clear();
  assert(tree.isEmpty());
});
