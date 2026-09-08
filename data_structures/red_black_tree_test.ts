// Copyright 2018-2026 the Deno authors. MIT license.
import { assertEquals, assertStrictEquals, assertThrows } from "@std/assert";
import { RedBlackTree } from "./red_black_tree.ts";
import { ascend, descend } from "./comparators.ts";
import { type Container, MyMath } from "./_test_utils.ts";

Deno.test("RedBlackTree throws if compare is not a function", () => {
  assertThrows(
    () => new RedBlackTree({} as (a: number, b: number) => number),
    TypeError,
    "Cannot construct a RedBlackTree: the 'compare' parameter is not a function, did you mean to call RedBlackTree.from?",
  );
});

Deno.test("RedBlackTree works as expected with default ascend comparator", () => {
  const trees = [
    new RedBlackTree(),
    new RedBlackTree(),
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
    [-1, -10, -100, -9, 9, 1, 0, 100, 10],
  );
  assertEquals(
    [...trees[1].nlrValues()],
    [-9, -100, -10, 1, 0, -1, 10, 9, 100],
  );
  for (const tree of trees) {
    assertEquals(tree.size, values.length);
    assertEquals(tree.isEmpty(), false);
  }

  assertEquals(
    [...trees[0].lrnValues()],
    [-100, -9, -10, 0, 1, 10, 100, 9, -1],
  );
  assertEquals(
    [...trees[1].lrnValues()],
    [-10, -100, -1, 0, 9, 100, 10, 1, -9],
  );
  for (const tree of trees) {
    assertEquals(tree.size, values.length);
    assertEquals(tree.isEmpty(), false);
  }

  assertEquals(
    [...trees[0].lvlValues()],
    [-1, -10, 9, -100, -9, 1, 100, 0, 10],
  );
  assertEquals(
    [...trees[1].lvlValues()],
    [-9, -100, 1, -10, 0, 10, -1, 9, 100],
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

Deno.test("RedBlackTree works as exepcted with descend comparator", () => {
  const trees = [
    new RedBlackTree(descend),
    new RedBlackTree(descend),
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
    [-1, 9, 100, 10, 1, 0, -10, -9, -100],
  );
  assertEquals(
    [...trees[1].nlrValues()],
    [-9, 1, 10, 100, 9, 0, -1, -100, -10],
  );
  for (const tree of trees) {
    assertEquals(tree.size, values.length);
    assertEquals(tree.isEmpty(), false);
  }

  assertEquals(
    [...trees[0].lrnValues()],
    [10, 100, 0, 1, 9, -9, -100, -10, -1],
  );
  assertEquals(
    [...trees[1].lrnValues()],
    [100, 9, 10, -1, 0, 1, -10, -100, -9],
  );
  for (const tree of trees) {
    assertEquals(tree.size, values.length);
    assertEquals(tree.isEmpty(), false);
  }

  assertEquals(
    [...trees[0].lvlValues()],
    [-1, 9, -10, 100, 1, -9, -100, 10, 0],
  );
  assertEquals(
    [...trees[1].lvlValues()],
    [-9, 1, -100, 10, 0, -10, 100, 9, -1],
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

Deno.test("RedBlackTree works with object items", () => {
  const tree: RedBlackTree<Container> = new RedBlackTree((
    a: Container,
    b: Container,
  ) => ascend(a.id, b.id));
  const ids: number[] = [-10, 9, -1, 100, 1, 0, -100, 10, -9];

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

Deno.test("RedBlackTree.from() handles empty array-like objects", () => {
  const tree = RedBlackTree.from<number>({ length: 0 });
  assertEquals([...tree], []);
  assertEquals(tree.size, 0);
});

Deno.test("RedBlackTree.from() handles array-like objects", () => {
  const values = { 0: 3, 1: 1, 2: 3, 3: 2, length: 4 };
  const tree = RedBlackTree.from(values);
  assertEquals([...tree], [1, 2, 3]);
  assertEquals(tree.size, 3);
});

Deno.test("RedBlackTree.from() handles array-like objects with a custom comparator", () => {
  const values = { 0: 3, 1: 1, 2: 3, 3: 2, length: 4 };
  const tree = RedBlackTree.from(values, { compare: descend });
  assertEquals([...tree], [3, 2, 1]);
  assertEquals(tree.size, 3);
});

Deno.test("RedBlackTree.from() handles Iterable", () => {
  const values: number[] = [-10, 9, -1, 100, 9, 1, 0, 9, -100, 10, -9];
  const originalValues: number[] = Array.from(values);
  const expected: number[] = [-100, -10, -9, -1, 0, 1, 9, 10, 100];
  let tree: RedBlackTree<number> = RedBlackTree.from(values);
  assertEquals(values, originalValues);
  assertEquals([...tree], expected);
  assertEquals([...tree.nlrValues()], [-1, -10, -100, -9, 9, 1, 0, 100, 10]);
  assertEquals([...tree.lvlValues()], [-1, -10, 9, -100, -9, 1, 100, 0, 10]);

  tree = RedBlackTree.from(values, { compare: descend });
  assertEquals(values, originalValues);
  assertEquals([...tree].reverse(), expected);
  assertEquals([...tree.nlrValues()], [-1, 9, 100, 10, 1, 0, -10, -9, -100]);
  assertEquals([...tree.lvlValues()], [-1, 9, -10, 100, 1, -9, -100, 10, 0]);

  tree = RedBlackTree.from(values, {
    map: (v: number) => 2 * v,
  });
  assertEquals([...tree], expected.map((v: number) => 2 * v));
  assertEquals([...tree.nlrValues()], [-2, -20, -200, -18, 18, 2, 0, 200, 20]);
  assertEquals([...tree.lvlValues()], [-2, -20, 18, -200, -18, 2, 200, 0, 20]);

  const math = new MyMath();
  tree = RedBlackTree.from(values, {
    map: function (this: MyMath, v: number) {
      return this.multiply(3, v);
    },
    thisArg: math,
  });
  assertEquals(values, originalValues);
  assertEquals([...tree], expected.map((v: number) => 3 * v));
  assertEquals([...tree.nlrValues()], [-3, -30, -300, -27, 27, 3, 0, 300, 30]);
  assertEquals([...tree.lvlValues()], [-3, -30, 27, -300, -27, 3, 300, 0, 30]);

  tree = RedBlackTree.from(values, {
    compare: descend,
    map: (v: number) => 2 * v,
  });
  assertEquals(values, originalValues);
  assertEquals([...tree].reverse(), expected.map((v: number) => 2 * v));
  assertEquals([...tree.nlrValues()], [-2, 18, 200, 20, 2, 0, -20, -18, -200]);
  assertEquals([...tree.lvlValues()], [-2, 18, -20, 200, 2, -18, -200, 20, 0]);

  tree = RedBlackTree.from(values, {
    compare: descend,
    map: function (this: MyMath, v: number) {
      return this.multiply(3, v);
    },
    thisArg: math,
  });
  assertEquals(values, originalValues);
  assertEquals([...tree].reverse(), expected.map((v: number) => 3 * v));
  assertEquals([...tree.nlrValues()], [-3, 27, 300, 30, 3, 0, -30, -27, -300]);
  assertEquals([...tree.lvlValues()], [-3, 27, -30, 300, 3, -27, -300, 30, 0]);
});

Deno.test("RedBlackTree.from() handles default ascend comparator", () => {
  const values: number[] = [-10, 9, -1, 100, 9, 1, 0, 9, -100, 10, -9];
  const expected: number[] = [-100, -10, -9, -1, 0, 1, 9, 10, 100];
  const originalTree: RedBlackTree<number> = new RedBlackTree();
  for (const value of values) originalTree.insert(value);
  let tree: RedBlackTree<number> = RedBlackTree.from(originalTree);
  assertEquals(originalTree.size, tree.size);
  assertEquals([...originalTree], expected);
  assertEquals([...tree], expected);
  assertEquals([...tree.nlrValues()], [...originalTree.nlrValues()]);
  assertEquals([...tree.lvlValues()], [...originalTree.lvlValues()]);

  tree = RedBlackTree.from(originalTree, { compare: descend });
  assertEquals([...originalTree], expected);
  assertEquals([...tree].reverse(), expected);
  assertEquals([...tree.nlrValues()], [-1, 1, 10, 100, 9, 0, -10, -9, -100]);
  assertEquals([...tree.lvlValues()], [-1, 1, -10, 10, 0, -9, -100, 100, 9]);

  tree = RedBlackTree.from(originalTree, {
    map: (v: number) => 2 * v,
  });
  assertEquals([...originalTree], expected);
  assertEquals([...tree], expected.map((v: number) => 2 * v));
  assertEquals([...tree.nlrValues()], [-2, -20, -200, -18, 2, 0, 20, 18, 200]);
  assertEquals([...tree.lvlValues()], [-2, -20, 2, -200, -18, 0, 20, 18, 200]);

  const math = new MyMath();
  tree = RedBlackTree.from(originalTree, {
    map: function (this: MyMath, v: number) {
      return this.multiply(3, v);
    },
    thisArg: math,
  });
  assertEquals([...originalTree], expected);
  assertEquals([...tree], expected.map((v: number) => 3 * v));
  assertEquals([...tree.nlrValues()], [-3, -30, -300, -27, 3, 0, 30, 27, 300]);
  assertEquals([...tree.lvlValues()], [-3, -30, 3, -300, -27, 0, 30, 27, 300]);

  tree = RedBlackTree.from(originalTree, {
    compare: descend,
    map: (v: number) => 2 * v,
  });
  assertEquals([...originalTree], expected);
  assertEquals([...tree].reverse(), expected.map((v: number) => 2 * v));
  assertEquals([...tree.nlrValues()], [-2, 2, 20, 200, 18, 0, -20, -18, -200]);
  assertEquals([...tree.lvlValues()], [-2, 2, -20, 20, 0, -18, -200, 200, 18]);

  tree = RedBlackTree.from(originalTree, {
    compare: descend,
    map: function (this: MyMath, v: number) {
      return this.multiply(3, v);
    },
    thisArg: math,
  });
  assertEquals([...originalTree], expected);
  assertEquals([...tree].reverse(), expected.map((v: number) => 3 * v));
  assertEquals([...tree.nlrValues()], [-3, 3, 30, 300, 27, 0, -30, -27, -300]);
  assertEquals([...tree.lvlValues()], [-3, 3, -30, 30, 0, -27, -300, 300, 27]);
});

Deno.test("RedBlackTree.from() deep-copies nodes so mutating the copy leaves the original intact", () => {
  const values = [3, 10, 13, 4, 6, 7, 1, 14];
  const original = RedBlackTree.from(values);
  const copy = RedBlackTree.from(original);

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

Deno.test("RedBlackTree.from() handles descend comparator", () => {
  const values: number[] = [-10, 9, -1, 100, 9, 1, 0, 9, -100, 10, -9];
  const expected: number[] = [100, 10, 9, 1, 0, -1, -9, -10, -100];
  const originalTree: RedBlackTree<number> = new RedBlackTree(descend);
  for (const value of values) originalTree.insert(value);
  let tree: RedBlackTree<number> = RedBlackTree.from(originalTree);
  assertEquals(originalTree.size, tree.size);
  assertEquals([...originalTree], expected);
  assertEquals([...tree], expected);
  assertEquals([...tree.nlrValues()], [...originalTree.nlrValues()]);
  assertEquals([...tree.lvlValues()], [...originalTree.lvlValues()]);

  tree = RedBlackTree.from(originalTree, { compare: ascend });
  assertEquals([...originalTree], expected);
  assertEquals([...tree].reverse(), expected);
  assertEquals([...tree.nlrValues()], [1, -1, -10, -100, -9, 0, 10, 9, 100]);
  assertEquals([...tree.lvlValues()], [1, -1, 10, -10, 0, 9, 100, -100, -9]);

  tree = RedBlackTree.from(originalTree, {
    map: (v: number) => 2 * v,
  });
  assertEquals([...originalTree], expected);
  assertEquals([...tree], expected.map((v: number) => 2 * v));
  assertEquals([...tree.nlrValues()], [2, 20, 200, 18, -2, 0, -20, -18, -200]);
  assertEquals([...tree.lvlValues()], [2, 20, -2, 200, 18, 0, -20, -18, -200]);

  const math = new MyMath();
  tree = RedBlackTree.from(originalTree, {
    map: function (this: MyMath, v: number) {
      return this.multiply(3, v);
    },
    thisArg: math,
  });
  assertEquals([...originalTree], expected);
  assertEquals([...tree], expected.map((v: number) => 3 * v));
  assertEquals([...tree.nlrValues()], [3, 30, 300, 27, -3, 0, -30, -27, -300]);
  assertEquals([...tree.lvlValues()], [3, 30, -3, 300, 27, 0, -30, -27, -300]);

  tree = RedBlackTree.from(originalTree, {
    compare: ascend,
    map: (v: number) => 2 * v,
  });
  assertEquals([...originalTree], expected);
  assertEquals([...tree].reverse(), expected.map((v: number) => 2 * v));
  assertEquals([...tree.nlrValues()], [2, -2, -20, -200, -18, 0, 20, 18, 200]);
  assertEquals([...tree.lvlValues()], [2, -2, 20, -20, 0, 18, 200, -200, -18]);

  tree = RedBlackTree.from(originalTree, {
    compare: ascend,
    map: function (this: MyMath, v: number) {
      return this.multiply(3, v);
    },
    thisArg: math,
  });
  assertEquals([...originalTree], expected);
  assertEquals([...tree].reverse(), expected.map((v: number) => 3 * v));
  assertEquals([...tree.nlrValues()], [3, -3, -30, -300, -27, 0, 30, 27, 300]);
  assertEquals([...tree.lvlValues()], [3, -3, 30, -30, 0, 27, 300, -300, -27]);
});

Deno.test("RedBlackTree() inserts rebalance left", () => {
  let values: number[] = [8, 4, 10, 0, 6, 11, -2, 2];
  let tree: RedBlackTree<number> = RedBlackTree.from(values);
  assertEquals([...tree.nlrValues()], [8, 4, 0, -2, 2, 6, 10, 11]);
  assertEquals([...tree.lvlValues()], [8, 4, 10, 0, 6, 11, -2, 2]);
  assertEquals(tree.insert(-3), true);
  assertEquals([...tree.nlrValues()], [4, 0, -2, -3, 2, 8, 6, 10, 11]);
  assertEquals([...tree.lvlValues()], [4, 0, 8, -2, 2, 6, 10, -3, 11]);

  tree = RedBlackTree.from(values);
  assertEquals(tree.insert(-1), true);
  assertEquals([...tree.nlrValues()], [4, 0, -2, -1, 2, 8, 6, 10, 11]);
  assertEquals([...tree.lvlValues()], [4, 0, 8, -2, 2, 6, 10, -1, 11]);

  tree = RedBlackTree.from(values);
  assertEquals(tree.insert(1), true);
  assertEquals([...tree.nlrValues()], [4, 0, -2, 2, 1, 8, 6, 10, 11]);
  assertEquals([...tree.lvlValues()], [4, 0, 8, -2, 2, 6, 10, 1, 11]);

  tree = RedBlackTree.from(values);
  assertEquals(tree.insert(3), true);
  assertEquals([...tree.nlrValues()], [4, 0, -2, 2, 3, 8, 6, 10, 11]);
  assertEquals([...tree.lvlValues()], [4, 0, 8, -2, 2, 6, 10, 3, 11]);

  values = [4, -4, 6, -5, 0, 7, -2, 2];
  tree = RedBlackTree.from(values);
  assertEquals([...tree.nlrValues()], [4, -4, -5, 0, -2, 2, 6, 7]);
  assertEquals([...tree.lvlValues()], [4, -4, 6, -5, 0, 7, -2, 2]);
  assertEquals(tree.insert(-3), true);
  assertEquals([...tree.nlrValues()], [0, -4, -5, -2, -3, 4, 2, 6, 7]);
  assertEquals([...tree.lvlValues()], [0, -4, 4, -5, -2, 2, 6, -3, 7]);

  tree = RedBlackTree.from(values);
  assertEquals(tree.insert(-1), true);
  assertEquals([...tree.nlrValues()], [0, -4, -5, -2, -1, 4, 2, 6, 7]);
  assertEquals([...tree.lvlValues()], [0, -4, 4, -5, -2, 2, 6, -1, 7]);

  tree = RedBlackTree.from(values);
  assertEquals(tree.insert(1), true);
  assertEquals([...tree.nlrValues()], [0, -4, -5, -2, 4, 2, 1, 6, 7]);
  assertEquals([...tree.lvlValues()], [0, -4, 4, -5, -2, 2, 6, 1, 7]);

  tree = RedBlackTree.from(values);
  assertEquals(tree.insert(3), true);
  assertEquals([...tree.nlrValues()], [0, -4, -5, -2, 4, 2, 3, 6, 7]);
  assertEquals([...tree.lvlValues()], [0, -4, 4, -5, -2, 2, 6, 3, 7]);
});

Deno.test("RedBlackTree() inserts rebalance right", () => {
  let values: number[] = [-4, -6, 4, 0, 6, -7, -2, 2];
  let tree: RedBlackTree<number> = RedBlackTree.from(values);
  assertEquals([...tree.nlrValues()], [-4, -6, -7, 4, 0, -2, 2, 6]);
  assertEquals([...tree.lvlValues()], [-4, -6, 4, -7, 0, 6, -2, 2]);
  assertEquals(tree.insert(-3), true);
  assertEquals([...tree.nlrValues()], [0, -4, -6, -7, -2, -3, 4, 2, 6]);
  assertEquals([...tree.lvlValues()], [0, -4, 4, -6, -2, 2, 6, -7, -3]);

  tree = RedBlackTree.from(values);
  assertEquals(tree.insert(-1), true);
  assertEquals([...tree.nlrValues()], [0, -4, -6, -7, -2, -1, 4, 2, 6]);
  assertEquals([...tree.lvlValues()], [0, -4, 4, -6, -2, 2, 6, -7, -1]);

  tree = RedBlackTree.from(values);
  assertEquals(tree.insert(1), true);
  assertEquals([...tree.nlrValues()], [0, -4, -6, -7, -2, 4, 2, 1, 6]);
  assertEquals([...tree.lvlValues()], [0, -4, 4, -6, -2, 2, 6, -7, 1]);

  tree = RedBlackTree.from(values);
  assertEquals(tree.insert(3), true);
  assertEquals([...tree.nlrValues()], [0, -4, -6, -7, -2, 4, 2, 3, 6]);
  assertEquals([...tree.lvlValues()], [0, -4, 4, -6, -2, 2, 6, -7, 3]);

  values = [-8, -10, -4, -11, -6, 0, -2, 2];
  tree = RedBlackTree.from(values);
  assertEquals([...tree.nlrValues()], [-8, -10, -11, -4, -6, 0, -2, 2]);
  assertEquals([...tree.lvlValues()], [-8, -10, -4, -11, -6, 0, -2, 2]);
  assertEquals(tree.insert(-3), true);
  assertEquals([...tree.nlrValues()], [-4, -8, -10, -11, -6, 0, -2, -3, 2]);
  assertEquals([...tree.lvlValues()], [-4, -8, 0, -10, -6, -2, 2, -11, -3]);

  tree = RedBlackTree.from(values);
  assertEquals(tree.insert(-1), true);
  assertEquals([...tree.nlrValues()], [-4, -8, -10, -11, -6, 0, -2, -1, 2]);
  assertEquals([...tree.lvlValues()], [-4, -8, 0, -10, -6, -2, 2, -11, -1]);

  tree = RedBlackTree.from(values);
  assertEquals(tree.insert(1), true);
  assertEquals([...tree.nlrValues()], [-4, -8, -10, -11, -6, 0, -2, 2, 1]);
  assertEquals([...tree.lvlValues()], [-4, -8, 0, -10, -6, -2, 2, -11, 1]);

  tree = RedBlackTree.from(values);
  assertEquals(tree.insert(3), true);
  assertEquals([...tree.nlrValues()], [-4, -8, -10, -11, -6, 0, -2, 2, 3]);
  assertEquals([...tree.lvlValues()], [-4, -8, 0, -10, -6, -2, 2, -11, 3]);
});

Deno.test("RedBlackTree removes rebalance root", () => {
  let values: number[] = [0];
  let tree: RedBlackTree<number> = RedBlackTree.from(values);
  assertEquals([...tree.nlrValues()], [0]);
  assertEquals(tree.remove(0), true);
  assertEquals([...tree.nlrValues()], []);

  values = [0, -1, 1];
  tree = RedBlackTree.from(values);
  assertEquals([...tree.nlrValues()], [0, -1, 1]);
  assertEquals([...tree.lvlValues()], [0, -1, 1]);
  assertEquals(tree.remove(0), true);
  assertEquals([...tree.nlrValues()], [1, -1]);
  assertEquals([...tree.lvlValues()], [1, -1]);

  tree = RedBlackTree.from(values);
  assertEquals(tree.remove(-1), true);
  assertEquals([...tree.nlrValues()], [0, 1]);
  assertEquals([...tree.lvlValues()], [0, 1]);

  tree = RedBlackTree.from(values);
  assertEquals(tree.remove(1), true);
  assertEquals([...tree.nlrValues()], [0, -1]);
  assertEquals([...tree.lvlValues()], [0, -1]);

  values = [0, -2, 2, -3, -1, 1, 3];
  tree = RedBlackTree.from(values);
  assertEquals([...tree.nlrValues()], [0, -2, -3, -1, 2, 1, 3]);
  assertEquals([...tree.lvlValues()], [0, -2, 2, -3, -1, 1, 3]);
  assertEquals(tree.remove(0), true);
  assertEquals([...tree.nlrValues()], [1, -2, -3, -1, 2, 3]);
  assertEquals([...tree.lvlValues()], [1, -2, 2, -3, -1, 3]);

  tree = RedBlackTree.from(values);
  assertEquals(tree.remove(-2), true);
  assertEquals([...tree.nlrValues()], [0, -1, -3, 2, 1, 3]);
  assertEquals([...tree.lvlValues()], [0, -1, 2, -3, 1, 3]);

  tree = RedBlackTree.from(values);
  assertEquals(tree.remove(2), true);
  assertEquals([...tree.nlrValues()], [0, -2, -3, -1, 3, 1]);
  assertEquals([...tree.lvlValues()], [0, -2, 3, -3, -1, 1]);

  tree = RedBlackTree.from(values);
  assertEquals(tree.remove(-3), true);
  assertEquals([...tree.nlrValues()], [0, -2, -1, 2, 1, 3]);
  assertEquals([...tree.lvlValues()], [0, -2, 2, -1, 1, 3]);

  tree = RedBlackTree.from(values);
  assertEquals(tree.remove(-1), true);
  assertEquals([...tree.nlrValues()], [0, -2, -3, 2, 1, 3]);
  assertEquals([...tree.lvlValues()], [0, -2, 2, -3, 1, 3]);

  tree = RedBlackTree.from(values);
  assertEquals(tree.remove(1), true);
  assertEquals([...tree.nlrValues()], [0, -2, -3, -1, 2, 3]);
  assertEquals([...tree.lvlValues()], [0, -2, 2, -3, -1, 3]);

  tree = RedBlackTree.from(values);
  assertEquals(tree.remove(3), true);
  assertEquals([...tree.nlrValues()], [0, -2, -3, -1, 2, 1]);
  assertEquals([...tree.lvlValues()], [0, -2, 2, -3, -1, 1]);

  values = [0, -2, 2, -3, -1];
  tree = RedBlackTree.from(values);
  assertEquals([...tree.nlrValues()], [0, -2, -3, -1, 2]);
  assertEquals([...tree.lvlValues()], [0, -2, 2, -3, -1]);
  assertEquals(tree.remove(0), true);
  assertEquals([...tree.nlrValues()], [-2, -3, 2, -1]);
  assertEquals([...tree.lvlValues()], [-2, -3, 2, -1]);

  tree = RedBlackTree.from(values);
  assertEquals(tree.remove(-2), true);
  assertEquals([...tree.nlrValues()], [0, -1, -3, 2]);
  assertEquals([...tree.lvlValues()], [0, -1, 2, -3]);

  tree = RedBlackTree.from(values);
  assertEquals(tree.remove(2), true);
  assertEquals([...tree.nlrValues()], [-2, -3, 0, -1]);
  assertEquals([...tree.lvlValues()], [-2, -3, 0, -1]);

  tree = RedBlackTree.from(values);
  assertEquals(tree.remove(-3), true);
  assertEquals([...tree.nlrValues()], [0, -2, -1, 2]);
  assertEquals([...tree.lvlValues()], [0, -2, 2, -1]);

  tree = RedBlackTree.from(values);
  assertEquals(tree.remove(-1), true);
  assertEquals([...tree.nlrValues()], [0, -2, -3, 2]);
  assertEquals([...tree.lvlValues()], [0, -2, 2, -3]);

  values = [0, -2, 2, 1, 3];
  tree = RedBlackTree.from(values);
  assertEquals([...tree.nlrValues()], [0, -2, 2, 1, 3]);
  assertEquals([...tree.lvlValues()], [0, -2, 2, 1, 3]);
  assertEquals(tree.remove(0), true);
  assertEquals([...tree.nlrValues()], [1, -2, 2, 3]);
  assertEquals([...tree.lvlValues()], [1, -2, 2, 3]);

  tree = RedBlackTree.from(values);
  assertEquals(tree.remove(-2), true);
  assertEquals([...tree.nlrValues()], [2, 0, 1, 3]);
  assertEquals([...tree.lvlValues()], [2, 0, 3, 1]);

  tree = RedBlackTree.from(values);
  assertEquals(tree.remove(2), true);
  assertEquals([...tree.nlrValues()], [0, -2, 3, 1]);
  assertEquals([...tree.lvlValues()], [0, -2, 3, 1]);

  tree = RedBlackTree.from(values);
  assertEquals(tree.remove(1), true);
  assertEquals([...tree.nlrValues()], [0, -2, 2, 3]);
  assertEquals([...tree.lvlValues()], [0, -2, 2, 3]);

  tree = RedBlackTree.from(values);
  assertEquals(tree.remove(3), true);
  assertEquals([...tree.nlrValues()], [0, -2, 2, 1]);
  assertEquals([...tree.lvlValues()], [0, -2, 2, 1]);

  values = [0, -2, 2, -3];
  tree = RedBlackTree.from(values);
  assertEquals([...tree.nlrValues()], [0, -2, -3, 2]);
  assertEquals([...tree.lvlValues()], [0, -2, 2, -3]);
  assertEquals(tree.remove(-3), true);
  assertEquals([...tree.nlrValues()], [0, -2, 2]);
  assertEquals([...tree.lvlValues()], [0, -2, 2]);
  assertEquals(tree.remove(0), true);
  assertEquals([...tree.nlrValues()], [2, -2]);
  assertEquals([...tree.lvlValues()], [2, -2]);

  tree = RedBlackTree.from(values);
  assertEquals(tree.remove(-3), true);
  assertEquals(tree.remove(-2), true);
  assertEquals([...tree.nlrValues()], [0, 2]);
  assertEquals([...tree.lvlValues()], [0, 2]);

  tree = RedBlackTree.from(values);
  assertEquals(tree.remove(-3), true);
  assertEquals(tree.remove(2), true);
  assertEquals([...tree.nlrValues()], [0, -2]);
  assertEquals([...tree.lvlValues()], [0, -2]);

  values = [0, -2, 2, 3];
  tree = RedBlackTree.from(values);
  assertEquals([...tree.nlrValues()], [0, -2, 2, 3]);
  assertEquals([...tree.lvlValues()], [0, -2, 2, 3]);
  assertEquals(tree.remove(3), true);
  assertEquals([...tree.nlrValues()], [0, -2, 2]);
  assertEquals([...tree.lvlValues()], [0, -2, 2]);
  assertEquals(tree.remove(0), true);
  assertEquals([...tree.nlrValues()], [2, -2]);
  assertEquals([...tree.lvlValues()], [2, -2]);

  tree = RedBlackTree.from(values);
  assertEquals(tree.remove(3), true);
  assertEquals(tree.remove(-2), true);
  assertEquals([...tree.nlrValues()], [0, 2]);
  assertEquals([...tree.lvlValues()], [0, 2]);

  tree = RedBlackTree.from(values);
  assertEquals(tree.remove(3), true);
  assertEquals(tree.remove(2), true);
  assertEquals([...tree.nlrValues()], [0, -2]);
  assertEquals([...tree.lvlValues()], [0, -2]);

  values = [0, -2, 2, -3];
  tree = RedBlackTree.from(values);
  assertEquals([...tree.nlrValues()], [0, -2, -3, 2]);
  assertEquals([...tree.lvlValues()], [0, -2, 2, -3]);
  assertEquals(tree.remove(0), true);
  assertEquals([...tree.nlrValues()], [-2, -3, 2]);
  assertEquals([...tree.lvlValues()], [-2, -3, 2]);

  tree = RedBlackTree.from(values);
  assertEquals(tree.remove(-2), true);
  assertEquals([...tree.nlrValues()], [0, -3, 2]);
  assertEquals([...tree.lvlValues()], [0, -3, 2]);

  tree = RedBlackTree.from(values);
  assertEquals(tree.remove(2), true);
  assertEquals([...tree.nlrValues()], [-2, -3, 0]);
  assertEquals([...tree.lvlValues()], [-2, -3, 0]);

  tree = RedBlackTree.from(values);
  assertEquals(tree.remove(-3), true);
  assertEquals([...tree.nlrValues()], [0, -2, 2]);
  assertEquals([...tree.lvlValues()], [0, -2, 2]);

  values = [0, -2, 2, -1];
  tree = RedBlackTree.from(values);
  assertEquals([...tree.nlrValues()], [0, -2, -1, 2]);
  assertEquals([...tree.lvlValues()], [0, -2, 2, -1]);
  assertEquals(tree.remove(0), true);
  assertEquals([...tree.nlrValues()], [-1, -2, 2]);
  assertEquals([...tree.lvlValues()], [-1, -2, 2]);

  tree = RedBlackTree.from(values);
  assertEquals(tree.remove(-2), true);
  assertEquals([...tree.nlrValues()], [0, -1, 2]);
  assertEquals([...tree.lvlValues()], [0, -1, 2]);

  tree = RedBlackTree.from(values);
  assertEquals(tree.remove(2), true);
  assertEquals([...tree.nlrValues()], [-1, -2, 0]);
  assertEquals([...tree.lvlValues()], [-1, -2, 0]);

  tree = RedBlackTree.from(values);
  assertEquals(tree.remove(-1), true);
  assertEquals([...tree.nlrValues()], [0, -2, 2]);
  assertEquals([...tree.lvlValues()], [0, -2, 2]);

  values = [0, -2, 2, 1];
  tree = RedBlackTree.from(values);
  assertEquals([...tree.nlrValues()], [0, -2, 2, 1]);
  assertEquals([...tree.lvlValues()], [0, -2, 2, 1]);
  assertEquals(tree.remove(0), true);
  assertEquals([...tree.nlrValues()], [1, -2, 2]);
  assertEquals([...tree.lvlValues()], [1, -2, 2]);

  tree = RedBlackTree.from(values);
  assertEquals(tree.remove(-2), true);
  assertEquals([...tree.nlrValues()], [1, 0, 2]);
  assertEquals([...tree.lvlValues()], [1, 0, 2]);

  tree = RedBlackTree.from(values);
  assertEquals(tree.remove(2), true);
  assertEquals([...tree.nlrValues()], [0, -2, 1]);
  assertEquals([...tree.lvlValues()], [0, -2, 1]);

  tree = RedBlackTree.from(values);
  assertEquals(tree.remove(1), true);
  assertEquals([...tree.nlrValues()], [0, -2, 2]);
  assertEquals([...tree.lvlValues()], [0, -2, 2]);

  values = [0, -2, 2, 3];
  tree = RedBlackTree.from(values);
  assertEquals([...tree.nlrValues()], [0, -2, 2, 3]);
  assertEquals([...tree.lvlValues()], [0, -2, 2, 3]);
  assertEquals(tree.remove(0), true);
  assertEquals([...tree.nlrValues()], [2, -2, 3]);
  assertEquals([...tree.lvlValues()], [2, -2, 3]);

  tree = RedBlackTree.from(values);
  assertEquals(tree.remove(-2), true);
  assertEquals([...tree.nlrValues()], [2, 0, 3]);
  assertEquals([...tree.lvlValues()], [2, 0, 3]);

  tree = RedBlackTree.from(values);
  assertEquals(tree.remove(2), true);
  assertEquals([...tree.nlrValues()], [0, -2, 3]);
  assertEquals([...tree.lvlValues()], [0, -2, 3]);

  tree = RedBlackTree.from(values);
  assertEquals(tree.remove(3), true);
  assertEquals([...tree.nlrValues()], [0, -2, 2]);
  assertEquals([...tree.lvlValues()], [0, -2, 2]);
});

Deno.test("RedBlackTree removes rebalance left", () => {
  let values = [4, 5, 0];
  let tree = RedBlackTree.from(values);
  assertEquals([...tree.nlrValues()], [4, 0, 5]);
  assertEquals(tree.remove(0), true);
  assertEquals([...tree.nlrValues()], [4, 5]);

  values = [4, 5, 0, -1, 1];
  tree = RedBlackTree.from(values);
  assertEquals([...tree.nlrValues()], [4, 0, -1, 1, 5]);
  assertEquals([...tree.lvlValues()], [4, 0, 5, -1, 1]);
  assertEquals(tree.remove(0), true);
  assertEquals([...tree.nlrValues()], [4, 1, -1, 5]);
  assertEquals([...tree.lvlValues()], [4, 1, 5, -1]);

  tree = RedBlackTree.from(values);
  assertEquals(tree.remove(-1), true);
  assertEquals([...tree.nlrValues()], [4, 0, 1, 5]);
  assertEquals([...tree.lvlValues()], [4, 0, 5, 1]);

  tree = RedBlackTree.from(values);
  assertEquals(tree.remove(1), true);
  assertEquals([...tree.nlrValues()], [4, 0, -1, 5]);
  assertEquals([...tree.lvlValues()], [4, 0, 5, -1]);

  values = [4, 5, 0, -2, 2, -3, -1];
  tree = RedBlackTree.from(values);
  assertEquals([...tree.nlrValues()], [4, 0, -2, -3, -1, 2, 5]);
  assertEquals([...tree.lvlValues()], [4, 0, 5, -2, 2, -3, -1]);
  assertEquals(tree.remove(0), true);
  assertEquals([...tree.nlrValues()], [4, -2, -3, 2, -1, 5]);
  assertEquals([...tree.lvlValues()], [4, -2, 5, -3, 2, -1]);

  tree = RedBlackTree.from(values);
  assertEquals(tree.remove(-2), true);
  assertEquals([...tree.nlrValues()], [4, 0, -1, -3, 2, 5]);
  assertEquals([...tree.lvlValues()], [4, 0, 5, -1, 2, -3]);

  tree = RedBlackTree.from(values);
  assertEquals(tree.remove(2), true);
  assertEquals([...tree.nlrValues()], [4, -2, -3, 0, -1, 5]);
  assertEquals([...tree.lvlValues()], [4, -2, 5, -3, 0, -1]);

  tree = RedBlackTree.from(values);
  assertEquals(tree.remove(-3), true);
  assertEquals([...tree.nlrValues()], [4, 0, -2, -1, 2, 5]);
  assertEquals([...tree.lvlValues()], [4, 0, 5, -2, 2, -1]);

  tree = RedBlackTree.from(values);
  assertEquals(tree.remove(-1), true);
  assertEquals([...tree.nlrValues()], [4, 0, -2, -3, 2, 5]);
  assertEquals([...tree.lvlValues()], [4, 0, 5, -2, 2, -3]);

  values = [4, 5, 0, -2, 2, 1, 3];
  tree = RedBlackTree.from(values);
  assertEquals([...tree.nlrValues()], [4, 0, -2, 2, 1, 3, 5]);
  assertEquals([...tree.lvlValues()], [4, 0, 5, -2, 2, 1, 3]);
  assertEquals(tree.remove(0), true);
  assertEquals([...tree.nlrValues()], [4, 1, -2, 2, 3, 5]);
  assertEquals([...tree.lvlValues()], [4, 1, 5, -2, 2, 3]);

  tree = RedBlackTree.from(values);
  assertEquals(tree.remove(-2), true);
  assertEquals([...tree.nlrValues()], [4, 2, 0, 1, 3, 5]);
  assertEquals([...tree.lvlValues()], [4, 2, 5, 0, 3, 1]);

  tree = RedBlackTree.from(values);
  assertEquals(tree.remove(2), true);
  assertEquals([...tree.nlrValues()], [4, 0, -2, 3, 1, 5]);
  assertEquals([...tree.lvlValues()], [4, 0, 5, -2, 3, 1]);

  tree = RedBlackTree.from(values);
  assertEquals(tree.remove(1), true);
  assertEquals([...tree.nlrValues()], [4, 0, -2, 2, 3, 5]);
  assertEquals([...tree.lvlValues()], [4, 0, 5, -2, 2, 3]);

  tree = RedBlackTree.from(values);
  assertEquals(tree.remove(3), true);
  assertEquals([...tree.nlrValues()], [4, 0, -2, 2, 1, 5]);
  assertEquals([...tree.lvlValues()], [4, 0, 5, -2, 2, 1]);

  values = [4, 5, 0, -2, 2, -3];
  tree = RedBlackTree.from(values);
  assertEquals([...tree.nlrValues()], [4, 0, -2, -3, 2, 5]);
  assertEquals([...tree.lvlValues()], [4, 0, 5, -2, 2, -3]);
  assertEquals(tree.remove(-3), true);
  assertEquals([...tree.nlrValues()], [4, 0, -2, 2, 5]);
  assertEquals([...tree.lvlValues()], [4, 0, 5, -2, 2]);
  assertEquals(tree.remove(0), true);
  assertEquals([...tree.nlrValues()], [4, 2, -2, 5]);
  assertEquals([...tree.lvlValues()], [4, 2, 5, -2]);

  tree = RedBlackTree.from(values);
  assertEquals(tree.remove(-3), true);
  assertEquals(tree.remove(-2), true);
  assertEquals([...tree.nlrValues()], [4, 0, 2, 5]);
  assertEquals([...tree.lvlValues()], [4, 0, 5, 2]);

  tree = RedBlackTree.from(values);
  assertEquals(tree.remove(-3), true);
  assertEquals(tree.remove(2), true);
  assertEquals([...tree.nlrValues()], [4, 0, -2, 5]);
  assertEquals([...tree.lvlValues()], [4, 0, 5, -2]);

  tree = RedBlackTree.from(values);
  assertEquals(tree.remove(-3), true);
  assertEquals(tree.remove(4), true);
  assertEquals([...tree.nlrValues()], [0, -2, 5, 2]);
  assertEquals([...tree.lvlValues()], [0, -2, 5, 2]);

  tree = RedBlackTree.from(values);
  assertEquals(tree.remove(-3), true);
  assertEquals(tree.remove(5), true);
  assertEquals([...tree.nlrValues()], [0, -2, 4, 2]);
  assertEquals([...tree.lvlValues()], [0, -2, 4, 2]);

  values = [4, 5, 0, -2, 2, 3];
  tree = RedBlackTree.from(values);
  assertEquals([...tree.nlrValues()], [4, 0, -2, 2, 3, 5]);
  assertEquals([...tree.lvlValues()], [4, 0, 5, -2, 2, 3]);
  assertEquals(tree.remove(3), true);
  assertEquals([...tree.nlrValues()], [4, 0, -2, 2, 5]);
  assertEquals([...tree.lvlValues()], [4, 0, 5, -2, 2]);
  assertEquals(tree.remove(0), true);
  assertEquals([...tree.nlrValues()], [4, 2, -2, 5]);
  assertEquals([...tree.lvlValues()], [4, 2, 5, -2]);

  tree = RedBlackTree.from(values);
  assertEquals(tree.remove(3), true);
  assertEquals(tree.remove(-2), true);
  assertEquals([...tree.nlrValues()], [4, 0, 2, 5]);
  assertEquals([...tree.lvlValues()], [4, 0, 5, 2]);

  tree = RedBlackTree.from(values);
  assertEquals(tree.remove(3), true);
  assertEquals(tree.remove(2), true);
  assertEquals([...tree.nlrValues()], [4, 0, -2, 5]);
  assertEquals([...tree.lvlValues()], [4, 0, 5, -2]);

  tree = RedBlackTree.from(values);
  assertEquals(tree.remove(3), true);
  assertEquals(tree.remove(4), true);
  assertEquals([...tree.nlrValues()], [0, -2, 5, 2]);
  assertEquals([...tree.lvlValues()], [0, -2, 5, 2]);

  tree = RedBlackTree.from(values);
  assertEquals(tree.remove(3), true);
  assertEquals(tree.remove(5), true);
  assertEquals([...tree.nlrValues()], [0, -2, 4, 2]);
  assertEquals([...tree.lvlValues()], [0, -2, 4, 2]);

  values = [4, 5, 0, -2, 2, -3, -1, 1, 3];
  tree = RedBlackTree.from(values);
  assertEquals([...tree.nlrValues()], [4, 0, -2, -3, -1, 2, 1, 3, 5]);
  assertEquals([...tree.lvlValues()], [4, 0, 5, -2, 2, -3, -1, 1, 3]);
  assertEquals(tree.remove(0), true);
  assertEquals([...tree.nlrValues()], [4, 1, -2, -3, -1, 2, 3, 5]);
  assertEquals([...tree.lvlValues()], [4, 1, 5, -2, 2, -3, -1, 3]);

  tree = RedBlackTree.from(values);
  assertEquals(tree.remove(-2), true);
  assertEquals([...tree.nlrValues()], [4, 0, -1, -3, 2, 1, 3, 5]);
  assertEquals([...tree.lvlValues()], [4, 0, 5, -1, 2, -3, 1, 3]);

  tree = RedBlackTree.from(values);
  assertEquals(tree.remove(2), true);
  assertEquals([...tree.nlrValues()], [4, 0, -2, -3, -1, 3, 1, 5]);
  assertEquals([...tree.lvlValues()], [4, 0, 5, -2, 3, -3, -1, 1]);

  tree = RedBlackTree.from(values);
  assertEquals(tree.remove(-3), true);
  assertEquals([...tree.nlrValues()], [4, 0, -2, -1, 2, 1, 3, 5]);
  assertEquals([...tree.lvlValues()], [4, 0, 5, -2, 2, -1, 1, 3]);

  tree = RedBlackTree.from(values);
  assertEquals(tree.remove(-1), true);
  assertEquals([...tree.nlrValues()], [4, 0, -2, -3, 2, 1, 3, 5]);
  assertEquals([...tree.lvlValues()], [4, 0, 5, -2, 2, -3, 1, 3]);

  tree = RedBlackTree.from(values);
  assertEquals(tree.remove(1), true);
  assertEquals([...tree.nlrValues()], [4, 0, -2, -3, -1, 2, 3, 5]);
  assertEquals([...tree.lvlValues()], [4, 0, 5, -2, 2, -3, -1, 3]);

  tree = RedBlackTree.from(values);
  assertEquals(tree.remove(3), true);
  assertEquals([...tree.nlrValues()], [4, 0, -2, -3, -1, 2, 1, 5]);
  assertEquals([...tree.lvlValues()], [4, 0, 5, -2, 2, -3, -1, 1]);

  tree = RedBlackTree.from(values);
  assertEquals(tree.remove(4), true);
  assertEquals([...tree.nlrValues()], [0, -2, -3, -1, 2, 1, 5, 3]);
  assertEquals([...tree.lvlValues()], [0, -2, 2, -3, -1, 1, 5, 3]);

  tree = RedBlackTree.from(values);
  assertEquals(tree.remove(5), true);
  assertEquals([...tree.nlrValues()], [0, -2, -3, -1, 2, 1, 4, 3]);
  assertEquals([...tree.lvlValues()], [0, -2, 2, -3, -1, 1, 4, 3]);

  values = [4, 5, 0, -2, 2, -3];
  tree = RedBlackTree.from(values);
  assertEquals([...tree.nlrValues()], [4, 0, -2, -3, 2, 5]);
  assertEquals([...tree.lvlValues()], [4, 0, 5, -2, 2, -3]);
  assertEquals(tree.remove(0), true);
  assertEquals([...tree.nlrValues()], [4, -2, -3, 2, 5]);
  assertEquals([...tree.lvlValues()], [4, -2, 5, -3, 2]);

  tree = RedBlackTree.from(values);
  assertEquals(tree.remove(-2), true);
  assertEquals([...tree.nlrValues()], [4, 0, -3, 2, 5]);
  assertEquals([...tree.lvlValues()], [4, 0, 5, -3, 2]);

  tree = RedBlackTree.from(values);
  assertEquals(tree.remove(2), true);
  assertEquals([...tree.nlrValues()], [4, -2, -3, 0, 5]);
  assertEquals([...tree.lvlValues()], [4, -2, 5, -3, 0]);

  tree = RedBlackTree.from(values);
  assertEquals(tree.remove(-3), true);
  assertEquals([...tree.nlrValues()], [4, 0, -2, 2, 5]);
  assertEquals([...tree.lvlValues()], [4, 0, 5, -2, 2]);

  tree = RedBlackTree.from(values);
  assertEquals(tree.remove(4), true);
  assertEquals([...tree.nlrValues()], [0, -2, -3, 5, 2]);
  assertEquals([...tree.lvlValues()], [0, -2, 5, -3, 2]);

  tree = RedBlackTree.from(values);
  assertEquals(tree.remove(5), true);
  assertEquals([...tree.nlrValues()], [0, -2, -3, 4, 2]);
  assertEquals([...tree.lvlValues()], [0, -2, 4, -3, 2]);

  values = [4, 5, 0, -2, 2, -1];
  tree = RedBlackTree.from(values);
  assertEquals([...tree.nlrValues()], [4, 0, -2, -1, 2, 5]);
  assertEquals([...tree.lvlValues()], [4, 0, 5, -2, 2, -1]);
  assertEquals(tree.remove(0), true);
  assertEquals([...tree.nlrValues()], [4, -1, -2, 2, 5]);
  assertEquals([...tree.lvlValues()], [4, -1, 5, -2, 2]);

  tree = RedBlackTree.from(values);
  assertEquals(tree.remove(-2), true);
  assertEquals([...tree.nlrValues()], [4, 0, -1, 2, 5]);
  assertEquals([...tree.lvlValues()], [4, 0, 5, -1, 2]);

  tree = RedBlackTree.from(values);
  assertEquals(tree.remove(2), true);
  assertEquals([...tree.nlrValues()], [4, -1, -2, 0, 5]);
  assertEquals([...tree.lvlValues()], [4, -1, 5, -2, 0]);

  tree = RedBlackTree.from(values);
  assertEquals(tree.remove(-1), true);
  assertEquals([...tree.nlrValues()], [4, 0, -2, 2, 5]);
  assertEquals([...tree.lvlValues()], [4, 0, 5, -2, 2]);

  tree = RedBlackTree.from(values);
  assertEquals(tree.remove(4), true);
  assertEquals([...tree.nlrValues()], [0, -2, -1, 5, 2]);
  assertEquals([...tree.lvlValues()], [0, -2, 5, -1, 2]);

  tree = RedBlackTree.from(values);
  assertEquals(tree.remove(5), true);
  assertEquals([...tree.nlrValues()], [0, -2, -1, 4, 2]);
  assertEquals([...tree.lvlValues()], [0, -2, 4, -1, 2]);

  values = [4, 5, 0, -2, 2, 1];
  tree = RedBlackTree.from(values);
  assertEquals([...tree.nlrValues()], [4, 0, -2, 2, 1, 5]);
  assertEquals([...tree.lvlValues()], [4, 0, 5, -2, 2, 1]);
  assertEquals(tree.remove(0), true);
  assertEquals([...tree.nlrValues()], [4, 1, -2, 2, 5]);
  assertEquals([...tree.lvlValues()], [4, 1, 5, -2, 2]);

  tree = RedBlackTree.from(values);
  assertEquals(tree.remove(-2), true);
  assertEquals([...tree.nlrValues()], [4, 1, 0, 2, 5]);
  assertEquals([...tree.lvlValues()], [4, 1, 5, 0, 2]);

  tree = RedBlackTree.from(values);
  assertEquals(tree.remove(2), true);
  assertEquals([...tree.nlrValues()], [4, 0, -2, 1, 5]);
  assertEquals([...tree.lvlValues()], [4, 0, 5, -2, 1]);

  tree = RedBlackTree.from(values);
  assertEquals(tree.remove(1), true);
  assertEquals([...tree.nlrValues()], [4, 0, -2, 2, 5]);
  assertEquals([...tree.lvlValues()], [4, 0, 5, -2, 2]);

  tree = RedBlackTree.from(values);
  assertEquals(tree.remove(4), true);
  assertEquals([...tree.nlrValues()], [0, -2, 2, 1, 5]);
  assertEquals([...tree.lvlValues()], [0, -2, 2, 1, 5]);

  tree = RedBlackTree.from(values);
  assertEquals(tree.remove(5), true);
  assertEquals([...tree.nlrValues()], [0, -2, 2, 1, 4]);
  assertEquals([...tree.lvlValues()], [0, -2, 2, 1, 4]);

  values = [4, 5, 0, -2, 2, 3];
  tree = RedBlackTree.from(values);
  assertEquals([...tree.nlrValues()], [4, 0, -2, 2, 3, 5]);
  assertEquals([...tree.lvlValues()], [4, 0, 5, -2, 2, 3]);
  assertEquals(tree.remove(0), true);
  assertEquals([...tree.nlrValues()], [4, 2, -2, 3, 5]);
  assertEquals([...tree.lvlValues()], [4, 2, 5, -2, 3]);

  tree = RedBlackTree.from(values);
  assertEquals(tree.remove(-2), true);
  assertEquals([...tree.nlrValues()], [4, 2, 0, 3, 5]);
  assertEquals([...tree.lvlValues()], [4, 2, 5, 0, 3]);

  tree = RedBlackTree.from(values);
  assertEquals(tree.remove(2), true);
  assertEquals([...tree.nlrValues()], [4, 0, -2, 3, 5]);
  assertEquals([...tree.lvlValues()], [4, 0, 5, -2, 3]);

  tree = RedBlackTree.from(values);
  assertEquals(tree.remove(3), true);
  assertEquals([...tree.nlrValues()], [4, 0, -2, 2, 5]);
  assertEquals([...tree.lvlValues()], [4, 0, 5, -2, 2]);

  tree = RedBlackTree.from(values);
  assertEquals(tree.remove(4), true);
  assertEquals([...tree.nlrValues()], [0, -2, 3, 2, 5]);
  assertEquals([...tree.lvlValues()], [0, -2, 3, 2, 5]);

  tree = RedBlackTree.from(values);
  assertEquals(tree.remove(5), true);
  assertEquals([...tree.nlrValues()], [0, -2, 3, 2, 4]);
  assertEquals([...tree.lvlValues()], [0, -2, 3, 2, 4]);
});

Deno.test("RedBlackTree removes rebalance right", () => {
  let values = [-4, -5, 0];
  let tree = RedBlackTree.from(values);
  assertEquals([...tree.nlrValues()], [-4, -5, 0]);
  assertEquals(tree.remove(0), true);
  assertEquals([...tree.nlrValues()], [-4, -5]);

  values = [-4, -5, 0, -1, 1];
  tree = RedBlackTree.from(values);
  assertEquals([...tree.nlrValues()], [-4, -5, 0, -1, 1]);
  assertEquals([...tree.lvlValues()], [-4, -5, 0, -1, 1]);
  assertEquals(tree.remove(0), true);
  assertEquals([...tree.nlrValues()], [-4, -5, 1, -1]);
  assertEquals([...tree.lvlValues()], [-4, -5, 1, -1]);

  tree = RedBlackTree.from(values);
  assertEquals(tree.remove(-1), true);
  assertEquals([...tree.nlrValues()], [-4, -5, 0, 1]);
  assertEquals([...tree.lvlValues()], [-4, -5, 0, 1]);

  tree = RedBlackTree.from(values);
  assertEquals(tree.remove(1), true);
  assertEquals([...tree.nlrValues()], [-4, -5, 0, -1]);
  assertEquals([...tree.lvlValues()], [-4, -5, 0, -1]);

  values = [-4, -5, 0, -2, 2, -3, -1];
  tree = RedBlackTree.from(values);
  assertEquals([...tree.nlrValues()], [-4, -5, 0, -2, -3, -1, 2]);
  assertEquals([...tree.lvlValues()], [-4, -5, 0, -2, 2, -3, -1]);
  assertEquals(tree.remove(0), true);
  assertEquals([...tree.nlrValues()], [-4, -5, -2, -3, 2, -1]);
  assertEquals([...tree.lvlValues()], [-4, -5, -2, -3, 2, -1]);

  tree = RedBlackTree.from(values);
  assertEquals(tree.remove(-2), true);
  assertEquals([...tree.nlrValues()], [-4, -5, 0, -1, -3, 2]);
  assertEquals([...tree.lvlValues()], [-4, -5, 0, -1, 2, -3]);

  tree = RedBlackTree.from(values);
  assertEquals(tree.remove(2), true);
  assertEquals([...tree.nlrValues()], [-4, -5, -2, -3, 0, -1]);
  assertEquals([...tree.lvlValues()], [-4, -5, -2, -3, 0, -1]);

  tree = RedBlackTree.from(values);
  assertEquals(tree.remove(-3), true);
  assertEquals([...tree.nlrValues()], [-4, -5, 0, -2, -1, 2]);
  assertEquals([...tree.lvlValues()], [-4, -5, 0, -2, 2, -1]);

  tree = RedBlackTree.from(values);
  assertEquals(tree.remove(-1), true);
  assertEquals([...tree.nlrValues()], [-4, -5, 0, -2, -3, 2]);
  assertEquals([...tree.lvlValues()], [-4, -5, 0, -2, 2, -3]);

  values = [-4, -5, 0, -2, 2, 1, 3];
  tree = RedBlackTree.from(values);
  assertEquals([...tree.nlrValues()], [-4, -5, 0, -2, 2, 1, 3]);
  assertEquals([...tree.lvlValues()], [-4, -5, 0, -2, 2, 1, 3]);
  assertEquals(tree.remove(0), true);
  assertEquals([...tree.nlrValues()], [-4, -5, 1, -2, 2, 3]);
  assertEquals([...tree.lvlValues()], [-4, -5, 1, -2, 2, 3]);

  tree = RedBlackTree.from(values);
  assertEquals(tree.remove(-2), true);
  assertEquals([...tree.nlrValues()], [-4, -5, 2, 0, 1, 3]);
  assertEquals([...tree.lvlValues()], [-4, -5, 2, 0, 3, 1]);

  tree = RedBlackTree.from(values);
  assertEquals(tree.remove(2), true);
  assertEquals([...tree.nlrValues()], [-4, -5, 0, -2, 3, 1]);
  assertEquals([...tree.lvlValues()], [-4, -5, 0, -2, 3, 1]);

  tree = RedBlackTree.from(values);
  assertEquals(tree.remove(1), true);
  assertEquals([...tree.nlrValues()], [-4, -5, 0, -2, 2, 3]);
  assertEquals([...tree.lvlValues()], [-4, -5, 0, -2, 2, 3]);

  tree = RedBlackTree.from(values);
  assertEquals(tree.remove(3), true);
  assertEquals([...tree.nlrValues()], [-4, -5, 0, -2, 2, 1]);
  assertEquals([...tree.lvlValues()], [-4, -5, 0, -2, 2, 1]);

  values = [-4, -5, 0, -2, 2, -3];
  tree = RedBlackTree.from(values);
  assertEquals([...tree.nlrValues()], [-4, -5, 0, -2, -3, 2]);
  assertEquals([...tree.lvlValues()], [-4, -5, 0, -2, 2, -3]);
  assertEquals(tree.remove(-3), true);
  assertEquals([...tree.nlrValues()], [-4, -5, 0, -2, 2]);
  assertEquals([...tree.lvlValues()], [-4, -5, 0, -2, 2]);
  assertEquals(tree.remove(0), true);
  assertEquals([...tree.nlrValues()], [-4, -5, 2, -2]);
  assertEquals([...tree.lvlValues()], [-4, -5, 2, -2]);

  tree = RedBlackTree.from(values);
  assertEquals(tree.remove(-3), true);
  assertEquals(tree.remove(-2), true);
  assertEquals([...tree.nlrValues()], [-4, -5, 0, 2]);
  assertEquals([...tree.lvlValues()], [-4, -5, 0, 2]);

  tree = RedBlackTree.from(values);
  assertEquals(tree.remove(-3), true);
  assertEquals(tree.remove(2), true);
  assertEquals([...tree.nlrValues()], [-4, -5, 0, -2]);
  assertEquals([...tree.lvlValues()], [-4, -5, 0, -2]);

  tree = RedBlackTree.from(values);
  assertEquals(tree.remove(-3), true);
  assertEquals(tree.remove(-4), true);
  assertEquals([...tree.nlrValues()], [-2, -5, 0, 2]);
  assertEquals([...tree.lvlValues()], [-2, -5, 0, 2]);

  tree = RedBlackTree.from(values);
  assertEquals(tree.remove(-3), true);
  assertEquals(tree.remove(-5), true);
  assertEquals([...tree.nlrValues()], [0, -4, -2, 2]);
  assertEquals([...tree.lvlValues()], [0, -4, 2, -2]);

  values = [-4, -5, 0, -2, 2, 3];
  tree = RedBlackTree.from(values);
  assertEquals([...tree.nlrValues()], [-4, -5, 0, -2, 2, 3]);
  assertEquals([...tree.lvlValues()], [-4, -5, 0, -2, 2, 3]);
  assertEquals(tree.remove(3), true);
  assertEquals([...tree.nlrValues()], [-4, -5, 0, -2, 2]);
  assertEquals([...tree.lvlValues()], [-4, -5, 0, -2, 2]);
  assertEquals(tree.remove(0), true);
  assertEquals([...tree.nlrValues()], [-4, -5, 2, -2]);
  assertEquals([...tree.lvlValues()], [-4, -5, 2, -2]);

  tree = RedBlackTree.from(values);
  assertEquals(tree.remove(3), true);
  assertEquals(tree.remove(-2), true);
  assertEquals([...tree.nlrValues()], [-4, -5, 0, 2]);
  assertEquals([...tree.lvlValues()], [-4, -5, 0, 2]);

  tree = RedBlackTree.from(values);
  assertEquals(tree.remove(3), true);
  assertEquals(tree.remove(2), true);
  assertEquals([...tree.nlrValues()], [-4, -5, 0, -2]);
  assertEquals([...tree.lvlValues()], [-4, -5, 0, -2]);

  tree = RedBlackTree.from(values);
  assertEquals(tree.remove(3), true);
  assertEquals(tree.remove(-4), true);
  assertEquals([...tree.nlrValues()], [-2, -5, 0, 2]);
  assertEquals([...tree.lvlValues()], [-2, -5, 0, 2]);

  tree = RedBlackTree.from(values);
  assertEquals(tree.remove(3), true);
  assertEquals(tree.remove(-5), true);
  assertEquals([...tree.nlrValues()], [0, -4, -2, 2]);
  assertEquals([...tree.lvlValues()], [0, -4, 2, -2]);

  values = [-4, -5, 0, -2, 2, -3, -1, 1, 3];
  tree = RedBlackTree.from(values);
  assertEquals([...tree.nlrValues()], [-4, -5, 0, -2, -3, -1, 2, 1, 3]);
  assertEquals([...tree.lvlValues()], [-4, -5, 0, -2, 2, -3, -1, 1, 3]);
  assertEquals(tree.remove(0), true);
  assertEquals([...tree.nlrValues()], [-4, -5, 1, -2, -3, -1, 2, 3]);
  assertEquals([...tree.lvlValues()], [-4, -5, 1, -2, 2, -3, -1, 3]);

  tree = RedBlackTree.from(values);
  assertEquals(tree.remove(-2), true);
  assertEquals([...tree.nlrValues()], [-4, -5, 0, -1, -3, 2, 1, 3]);
  assertEquals([...tree.lvlValues()], [-4, -5, 0, -1, 2, -3, 1, 3]);

  tree = RedBlackTree.from(values);
  assertEquals(tree.remove(2), true);
  assertEquals([...tree.nlrValues()], [-4, -5, 0, -2, -3, -1, 3, 1]);
  assertEquals([...tree.lvlValues()], [-4, -5, 0, -2, 3, -3, -1, 1]);

  tree = RedBlackTree.from(values);
  assertEquals(tree.remove(-3), true);
  assertEquals([...tree.nlrValues()], [-4, -5, 0, -2, -1, 2, 1, 3]);
  assertEquals([...tree.lvlValues()], [-4, -5, 0, -2, 2, -1, 1, 3]);

  tree = RedBlackTree.from(values);
  assertEquals(tree.remove(-1), true);
  assertEquals([...tree.nlrValues()], [-4, -5, 0, -2, -3, 2, 1, 3]);
  assertEquals([...tree.lvlValues()], [-4, -5, 0, -2, 2, -3, 1, 3]);

  tree = RedBlackTree.from(values);
  assertEquals(tree.remove(1), true);
  assertEquals([...tree.nlrValues()], [-4, -5, 0, -2, -3, -1, 2, 3]);
  assertEquals([...tree.lvlValues()], [-4, -5, 0, -2, 2, -3, -1, 3]);

  tree = RedBlackTree.from(values);
  assertEquals(tree.remove(3), true);
  assertEquals([...tree.nlrValues()], [-4, -5, 0, -2, -3, -1, 2, 1]);
  assertEquals([...tree.lvlValues()], [-4, -5, 0, -2, 2, -3, -1, 1]);

  tree = RedBlackTree.from(values);
  assertEquals(tree.remove(-4), true);
  assertEquals([...tree.nlrValues()], [-3, -5, 0, -2, -1, 2, 1, 3]);
  assertEquals([...tree.lvlValues()], [-3, -5, 0, -2, 2, -1, 1, 3]);

  tree = RedBlackTree.from(values);
  assertEquals(tree.remove(-5), true);
  assertEquals([...tree.nlrValues()], [0, -2, -4, -3, -1, 2, 1, 3]);
  assertEquals([...tree.lvlValues()], [0, -2, 2, -4, -1, 1, 3, -3]);

  values = [-4, -5, 0, -2, 2, -3];
  tree = RedBlackTree.from(values);
  assertEquals([...tree.nlrValues()], [-4, -5, 0, -2, -3, 2]);
  assertEquals([...tree.lvlValues()], [-4, -5, 0, -2, 2, -3]);
  assertEquals(tree.remove(0), true);
  assertEquals([...tree.nlrValues()], [-4, -5, -2, -3, 2]);
  assertEquals([...tree.lvlValues()], [-4, -5, -2, -3, 2]);

  tree = RedBlackTree.from(values);
  assertEquals(tree.remove(-2), true);
  assertEquals([...tree.nlrValues()], [-4, -5, 0, -3, 2]);
  assertEquals([...tree.lvlValues()], [-4, -5, 0, -3, 2]);

  tree = RedBlackTree.from(values);
  assertEquals(tree.remove(2), true);
  assertEquals([...tree.nlrValues()], [-4, -5, -2, -3, 0]);
  assertEquals([...tree.lvlValues()], [-4, -5, -2, -3, 0]);

  tree = RedBlackTree.from(values);
  assertEquals(tree.remove(-3), true);
  assertEquals([...tree.nlrValues()], [-4, -5, 0, -2, 2]);
  assertEquals([...tree.lvlValues()], [-4, -5, 0, -2, 2]);

  tree = RedBlackTree.from(values);
  assertEquals(tree.remove(-4), true);
  assertEquals([...tree.nlrValues()], [-3, -5, 0, -2, 2]);
  assertEquals([...tree.lvlValues()], [-3, -5, 0, -2, 2]);

  tree = RedBlackTree.from(values);
  assertEquals(tree.remove(-5), true);
  assertEquals([...tree.nlrValues()], [0, -3, -4, -2, 2]);
  assertEquals([...tree.lvlValues()], [0, -3, 2, -4, -2]);

  values = [-4, -5, 0, -2, 2, -1];
  tree = RedBlackTree.from(values);
  assertEquals([...tree.nlrValues()], [-4, -5, 0, -2, -1, 2]);
  assertEquals([...tree.lvlValues()], [-4, -5, 0, -2, 2, -1]);
  assertEquals(tree.remove(0), true);
  assertEquals([...tree.nlrValues()], [-4, -5, -1, -2, 2]);
  assertEquals([...tree.lvlValues()], [-4, -5, -1, -2, 2]);

  tree = RedBlackTree.from(values);
  assertEquals(tree.remove(-2), true);
  assertEquals([...tree.nlrValues()], [-4, -5, 0, -1, 2]);
  assertEquals([...tree.lvlValues()], [-4, -5, 0, -1, 2]);

  tree = RedBlackTree.from(values);
  assertEquals(tree.remove(2), true);
  assertEquals([...tree.nlrValues()], [-4, -5, -1, -2, 0]);
  assertEquals([...tree.lvlValues()], [-4, -5, -1, -2, 0]);

  tree = RedBlackTree.from(values);
  assertEquals(tree.remove(-1), true);
  assertEquals([...tree.nlrValues()], [-4, -5, 0, -2, 2]);
  assertEquals([...tree.lvlValues()], [-4, -5, 0, -2, 2]);

  tree = RedBlackTree.from(values);
  assertEquals(tree.remove(-4), true);
  assertEquals([...tree.nlrValues()], [-2, -5, 0, -1, 2]);
  assertEquals([...tree.lvlValues()], [-2, -5, 0, -1, 2]);

  tree = RedBlackTree.from(values);
  assertEquals(tree.remove(-5), true);
  assertEquals([...tree.nlrValues()], [0, -2, -4, -1, 2]);
  assertEquals([...tree.lvlValues()], [0, -2, 2, -4, -1]);

  values = [-4, -5, 0, -2, 2, 1];
  tree = RedBlackTree.from(values);
  assertEquals([...tree.nlrValues()], [-4, -5, 0, -2, 2, 1]);
  assertEquals([...tree.lvlValues()], [-4, -5, 0, -2, 2, 1]);
  assertEquals(tree.remove(0), true);
  assertEquals([...tree.nlrValues()], [-4, -5, 1, -2, 2]);
  assertEquals([...tree.lvlValues()], [-4, -5, 1, -2, 2]);

  tree = RedBlackTree.from(values);
  assertEquals(tree.remove(-2), true);
  assertEquals([...tree.nlrValues()], [-4, -5, 1, 0, 2]);
  assertEquals([...tree.lvlValues()], [-4, -5, 1, 0, 2]);

  tree = RedBlackTree.from(values);
  assertEquals(tree.remove(2), true);
  assertEquals([...tree.nlrValues()], [-4, -5, 0, -2, 1]);
  assertEquals([...tree.lvlValues()], [-4, -5, 0, -2, 1]);

  tree = RedBlackTree.from(values);
  assertEquals(tree.remove(1), true);
  assertEquals([...tree.nlrValues()], [-4, -5, 0, -2, 2]);
  assertEquals([...tree.lvlValues()], [-4, -5, 0, -2, 2]);

  tree = RedBlackTree.from(values);
  assertEquals(tree.remove(-4), true);
  assertEquals([...tree.nlrValues()], [-2, -5, 1, 0, 2]);
  assertEquals([...tree.lvlValues()], [-2, -5, 1, 0, 2]);

  tree = RedBlackTree.from(values);
  assertEquals(tree.remove(-5), true);
  assertEquals([...tree.nlrValues()], [0, -4, -2, 2, 1]);
  assertEquals([...tree.lvlValues()], [0, -4, 2, -2, 1]);

  values = [-4, -5, 0, -2, 2, 3];
  tree = RedBlackTree.from(values);
  assertEquals([...tree.nlrValues()], [-4, -5, 0, -2, 2, 3]);
  assertEquals([...tree.lvlValues()], [-4, -5, 0, -2, 2, 3]);
  assertEquals(tree.remove(0), true);
  assertEquals([...tree.nlrValues()], [-4, -5, 2, -2, 3]);
  assertEquals([...tree.lvlValues()], [-4, -5, 2, -2, 3]);

  tree = RedBlackTree.from(values);
  assertEquals(tree.remove(-2), true);
  assertEquals([...tree.nlrValues()], [-4, -5, 2, 0, 3]);
  assertEquals([...tree.lvlValues()], [-4, -5, 2, 0, 3]);

  tree = RedBlackTree.from(values);
  assertEquals(tree.remove(2), true);
  assertEquals([...tree.nlrValues()], [-4, -5, 0, -2, 3]);
  assertEquals([...tree.lvlValues()], [-4, -5, 0, -2, 3]);

  tree = RedBlackTree.from(values);
  assertEquals(tree.remove(3), true);
  assertEquals([...tree.nlrValues()], [-4, -5, 0, -2, 2]);
  assertEquals([...tree.lvlValues()], [-4, -5, 0, -2, 2]);

  tree = RedBlackTree.from(values);
  assertEquals(tree.remove(-4), true);
  assertEquals([...tree.nlrValues()], [-2, -5, 2, 0, 3]);
  assertEquals([...tree.lvlValues()], [-2, -5, 2, 0, 3]);

  tree = RedBlackTree.from(values);
  assertEquals(tree.remove(-5), true);
  assertEquals([...tree.nlrValues()], [0, -4, -2, 2, 3]);
  assertEquals([...tree.lvlValues()], [0, -4, 2, -2, 3]);
});

Deno.test("RedBlackTree works with README example", () => {
  const values = [3, 10, 13, 4, 6, 7, 1, 14];
  const tree = new RedBlackTree<number>();
  values.forEach((value) => tree.insert(value));
  assertEquals([...tree], [1, 3, 4, 6, 7, 10, 13, 14]);
  assertEquals(tree.min(), 1);
  assertEquals(tree.max(), 14);
  assertEquals(tree.find(42), null);
  assertEquals(tree.find(7), 7);
  assertEquals(tree.remove(42), false);
  assertEquals(tree.remove(7), true);
  assertEquals([...tree], [1, 3, 4, 6, 10, 13, 14]);

  const invertedTree = new RedBlackTree<number>(descend);
  values.forEach((value) => invertedTree.insert(value));
  assertEquals([...invertedTree], [14, 13, 10, 7, 6, 4, 3, 1]);
  assertEquals(invertedTree.min(), 14);
  assertEquals(invertedTree.max(), 1);
  assertEquals(invertedTree.find(42), null);
  assertEquals(invertedTree.find(7), 7);
  assertEquals(invertedTree.remove(42), false);
  assertEquals(invertedTree.remove(7), true);
  assertEquals([...invertedTree], [14, 13, 10, 6, 4, 3, 1]);

  const words = new RedBlackTree<string>((a, b) =>
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
