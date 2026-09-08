// Copyright 2018-2026 the Deno authors. MIT license.
// This module is browser compatible.

import { ascend } from "./comparators.ts";
import { BinarySearchTree } from "./binary_search_tree.ts";
import { type Direction, RedBlackNode } from "./_red_black_node.ts";
import { internals } from "./_binary_search_tree_internals.ts";

const {
  getRoot,
  setRoot,
  getCompare,
  findNode,
  rotateNode,
  insertNode,
  removeNode,
  setSize,
} = internals;

/**
 * A red-black tree. This is a kind of self-balancing binary search tree. The
 * values are in ascending order by default, using JavaScript's built-in
 * comparison operators to sort the values.
 *
 * Red-Black Trees require fewer rotations than AVL Trees, so they can provide
 * faster insertions and removal operations. If you need faster lookups, you
 * should use an AVL Tree instead. AVL Trees are more strictly balanced than
 * Red-Black Trees, so they can provide faster lookups.
 *
 * | Method        | Average Case | Worst Case |
 * | ------------- | ------------ | ---------- |
 * | find(value)   | O(log n)     | O(log n)   |
 * | insert(value) | O(log n)     | O(log n)   |
 * | remove(value) | O(log n)     | O(log n)   |
 * | min()         | O(log n)     | O(log n)   |
 * | max()         | O(log n)     | O(log n)   |
 *
 * @example Usage
 * ```ts
 * import {
 *   ascend,
 *   descend,
 *   RedBlackTree,
 * } from "@std/data-structures";
 * import { assertEquals } from "@std/assert";
 *
 * const values = [3, 10, 13, 4, 6, 7, 1, 14];
 * const tree = new RedBlackTree<number>();
 * values.forEach((value) => tree.insert(value));
 * assertEquals([...tree], [1, 3, 4, 6, 7, 10, 13, 14]);
 * assertEquals(tree.min(), 1);
 * assertEquals(tree.max(), 14);
 * assertEquals(tree.find(42), null);
 * assertEquals(tree.find(7), 7);
 * assertEquals(tree.remove(42), false);
 * assertEquals(tree.remove(7), true);
 * assertEquals([...tree], [1, 3, 4, 6, 10, 13, 14]);
 *
 * const invertedTree = new RedBlackTree<number>(descend);
 * values.forEach((value) => invertedTree.insert(value));
 * assertEquals([...invertedTree], [14, 13, 10, 7, 6, 4, 3, 1]);
 * assertEquals(invertedTree.min(), 14);
 * assertEquals(invertedTree.max(), 1);
 * assertEquals(invertedTree.find(42), null);
 * assertEquals(invertedTree.find(7), 7);
 * assertEquals(invertedTree.remove(42), false);
 * assertEquals(invertedTree.remove(7), true);
 * assertEquals([...invertedTree], [14, 13, 10, 6, 4, 3, 1]);
 *
 * const words = new RedBlackTree<string>((a, b) =>
 *   ascend(a.length, b.length) || ascend(a, b)
 * );
 * ["truck", "car", "helicopter", "tank", "train", "suv", "semi", "van"]
 *   .forEach((value) => words.insert(value));
 * assertEquals([...words], [
 *   "car",
 *   "suv",
 *   "van",
 *   "semi",
 *   "tank",
 *   "train",
 *   "truck",
 *   "helicopter",
 * ]);
 * assertEquals(words.min(), "car");
 * assertEquals(words.max(), "helicopter");
 * assertEquals(words.find("scooter"), null);
 * assertEquals(words.find("tank"), "tank");
 * assertEquals(words.remove("scooter"), false);
 * assertEquals(words.remove("tank"), true);
 * assertEquals([...words], [
 *   "car",
 *   "suv",
 *   "van",
 *   "semi",
 *   "train",
 *   "truck",
 *   "helicopter",
 * ]);
 * ```
 *
 * @typeparam T The type of the values being stored in the tree.
 */
export class RedBlackTree<T> extends BinarySearchTree<T> {
  /**
   * Construct an empty red-black tree.
   *
   * @param compare A custom comparison function for the values. The default comparison function sorts by ascending order.
   */
  constructor(compare: (a: T, b: T) => number = ascend) {
    if (typeof compare !== "function") {
      throw new TypeError(
        "Cannot construct a RedBlackTree: the 'compare' parameter is not a function, did you mean to call RedBlackTree.from?",
      );
    }
    super(compare);
  }

  /**
   * Create a new red-black tree from an array like, an iterable object, or
   * an existing red-black tree.
   *
   * A custom comparison function can be provided to sort the values in a
   * specific order. By default, the values are sorted in ascending order,
   * unless a {@link RedBlackTree} is passed, in which case the comparison
   * function is copied from the input tree.
   *
   * @example Creating a red-black tree from an array like
   * ```ts no-assert
   * import { RedBlackTree } from "@std/data-structures";
   *
   * const tree = RedBlackTree.from<number>([3, 10, 13, 4, 6, 7, 1, 14]);
   * ```
   *
   * @example Creating a red-black tree from an iterable object
   * ```ts no-assert
   * import { RedBlackTree } from "@std/data-structures";
   *
   * const tree = RedBlackTree.from<number>((function*() {
   *   yield 3;
   *   yield 10;
   *   yield 13;
   * })());
   * ```
   *
   * @example Creating a red-black tree from an existing red-black tree
   * ```ts no-assert
   * import { RedBlackTree } from "@std/data-structures";
   *
   * const tree = RedBlackTree.from<number>([3, 10, 13, 4, 6, 7, 1, 14]);
   * const copy = RedBlackTree.from(tree);
   * ```
   *
   * @example Creating a red-black tree from an array like with a custom comparison function
   * ```ts no-assert
   * import { RedBlackTree, descend } from "@std/data-structures";
   *
   * const tree = RedBlackTree.from<number>([3, 10, 13, 4, 6, 7, 1, 14], {
   *  compare: descend,
   * });
   * ```
   *
   * @typeparam T The type of the values being stored in the tree.
   * @param collection An array like, an iterable, or existing red-black tree.
   * @param options An optional options object to customize the comparison function.
   * @returns A new red-black tree with the values from the passed collection.
   */
  static override from<T>(
    collection: ArrayLike<T> | Iterable<T> | RedBlackTree<T>,
    options?: {
      compare?: (a: T, b: T) => number;
    },
  ): RedBlackTree<T>;
  /**
   * Create a new red-black tree from an array like, an iterable object, or
   * an existing red-black tree.
   *
   * A custom mapping function can be provided to transform the values before
   * inserting them into the tree.
   *
   * A custom comparison function can be provided to sort the values in a
   * specific order. A custom mapping function can be provided to transform the
   * values before inserting them into the tree. By default, the values are
   * sorted in ascending order, unless a {@link RedBlackTree} is passed, in
   * which case the comparison function is copied from the input tree. The
   * comparison operator is used to sort the values in the tree after mapping
   * the values.
   *
   * @example Creating a red-black tree from an array like with a custom mapping function
   * ```ts no-assert
   * import { RedBlackTree } from "@std/data-structures";
   *
   * const tree = RedBlackTree.from<number, string>([3, 10, 13, 4, 6, 7, 1, 14], {
   *   map: (value) => value.toString(),
   * });
   * ```

   * @typeparam T The type of the values in the passed collection.
   * @typeparam U The type of the values being stored in the red-black tree.
   * @typeparam V The type of the `this` context in the mapping function. Defaults to `undefined`.
   * @param collection An array like, an iterable, or existing red-black tree.
   * @param options The options object to customize the mapping and comparison functions. The `thisArg` property can be used to set the `this` value when calling the mapping function.
   * @returns A new red-black tree with the mapped values from the passed collection.
   */
  static override from<T, U, V = undefined>(
    collection: ArrayLike<T> | Iterable<T> | RedBlackTree<T>,
    options: {
      compare?: (a: U, b: U) => number;
      map: (value: T, index: number) => U;
      thisArg?: V;
    },
  ): RedBlackTree<U>;
  static override from<T, U, V>(
    collection: ArrayLike<T> | Iterable<T> | RedBlackTree<T>,
    options?: {
      compare?: (a: U, b: U) => number;
      map?: (value: T, index: number) => U;
      thisArg?: V;
    },
  ): RedBlackTree<U> {
    let result: RedBlackTree<U>;
    let unmappedValues: ArrayLike<T> | Iterable<T> = [];
    if (collection instanceof RedBlackTree) {
      result = new RedBlackTree(
        options?.compare ??
          getCompare(collection as unknown as RedBlackTree<U>),
      );
      if (options?.compare || options?.map) {
        unmappedValues = collection;
      } else {
        const nodes: RedBlackNode<U>[] = [];
        const root = getRoot(collection);
        if (root) {
          const rootCopy = RedBlackNode.from(
            root as unknown as RedBlackNode<U>,
          );
          setRoot(result, rootCopy);
          nodes.push(rootCopy);
        }
        while (nodes.length) {
          const node: RedBlackNode<U> = nodes.pop()!;
          const left: RedBlackNode<U> | null = node.left
            ? RedBlackNode.from(node.left)
            : null;
          const right: RedBlackNode<U> | null = node.right
            ? RedBlackNode.from(node.right)
            : null;

          node.left = left;
          node.right = right;
          if (left) {
            left.parent = node;
            nodes.push(left);
          }
          if (right) {
            right.parent = node;
            nodes.push(right);
          }
        }
        setSize(result, collection.size);
      }
    } else {
      result = (options?.compare
        ? new RedBlackTree(options.compare)
        : new RedBlackTree()) as RedBlackTree<U>;
      unmappedValues = collection;
    }
    const values: Iterable<U> = options?.map
      ? Array.from(unmappedValues, options.map, options.thisArg)
      : Array.from(unmappedValues) as unknown as U[];
    for (const value of values) result.insert(value);
    return result;
  }

  #removeFixup(
    parent: RedBlackNode<T> | null,
    current: RedBlackNode<T> | null,
  ) {
    while (parent && !current?.red) {
      const direction: Direction = parent.left === current ? "left" : "right";
      const siblingDirection: Direction = direction === "right"
        ? "left"
        : "right";
      let sibling: RedBlackNode<T> | null = parent[siblingDirection];

      if (sibling?.red) {
        sibling.red = false;
        parent.red = true;
        rotateNode(this, parent, direction);
        sibling = parent[siblingDirection];
      }
      if (sibling) {
        if (!sibling.left?.red && !sibling.right?.red) {
          sibling!.red = true;
          current = parent;
          parent = current.parent;
        } else {
          if (!sibling[siblingDirection]?.red) {
            sibling[direction]!.red = false;
            sibling.red = true;
            rotateNode(this, sibling, siblingDirection);
            sibling = parent[siblingDirection!];
          }
          sibling!.red = parent.red;
          parent.red = false;
          sibling![siblingDirection]!.red = false;
          rotateNode(this, parent, direction);
          current = getRoot(this) as RedBlackNode<T>;
          parent = null;
        }
      }
    }
    if (current) current.red = false;
  }

  /**
   * Add a value to the red-black tree if it does not already exist in the tree.
   *
   * The complexity of this operation is on average and at worst O(log n), where
   * n is the number of values in the tree.
   *
   * @example Inserting a value into the tree
   * ```ts
   * import { RedBlackTree } from "@std/data-structures";
   * import { assertEquals } from "@std/assert";
   *
   * const tree = new RedBlackTree<number>();
   *
   * assertEquals(tree.insert(42), true);
   * assertEquals(tree.insert(42), false);
   * ```
   *
   * @param value The value to insert into the tree.
   * @returns `true` if the value was inserted, `false` if the value already exists in the tree.
   */
  override insert(value: T): boolean {
    let node = insertNode(
      this,
      RedBlackNode,
      value,
    ) as (RedBlackNode<T> | null);
    if (node) {
      while (node.parent?.red) {
        let parent: RedBlackNode<T> = node.parent!;
        const parentDirection: Direction = parent.directionFromParent()!;
        const uncleDirection: Direction = parentDirection === "right"
          ? "left"
          : "right";
        const uncle: RedBlackNode<T> | null = parent.parent![uncleDirection] ??
          null;

        if (uncle?.red) {
          parent.red = false;
          uncle.red = false;
          parent.parent!.red = true;
          node = parent.parent!;
        } else {
          if (node === parent[uncleDirection]) {
            node = parent;
            rotateNode(this, node, parentDirection);
            parent = node.parent!;
          }
          parent.red = false;
          parent.parent!.red = true;
          rotateNode(this, parent.parent!, uncleDirection);
        }
      }
      (getRoot(this) as RedBlackNode<T>).red = false;
    }
    return !!node;
  }

  /**
   * Remove a value from the red-black tree if it exists in the tree.
   *
   * The complexity of this operation is on average and at worst O(log n), where
   * n is the number of values in the tree.
   *
   * @example Removing values from the tree
   * ```ts
   * import { RedBlackTree } from "@std/data-structures";
   * import { assertEquals } from "@std/assert";
   *
   * const tree = RedBlackTree.from<number>([42]);
   *
   * assertEquals(tree.remove(42), true);
   * assertEquals(tree.remove(42), false);
   * ```
   *
   * @param value The value to remove from the tree.
   * @returns `true` if the value was found and removed, `false` if the value was not found in the tree.
   */
  override remove(value: T): boolean {
    const node = findNode(this, value) as (RedBlackNode<T> | null);

    if (!node) {
      return false;
    }

    const removedNode = removeNode(this, node) as (
      | RedBlackNode<T>
      | null
    );

    if (removedNode && !removedNode.red) {
      this.#removeFixup(
        removedNode.parent,
        removedNode.left ?? removedNode.right,
      );
    }

    return true;
  }
}
