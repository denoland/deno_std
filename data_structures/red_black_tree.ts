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
 * A red-black tree. This is a kind of self-balancing binary search tree,
 * extending {@linkcode BinarySearchTree}. The values are in ascending order by
 * default, using JavaScript's built-in comparison operators to sort the
 * values.
 *
 * Unlike {@linkcode BinarySearchTree}, which degrades to linear time on
 * already-ordered input, a red-black tree rebalances itself on every insertion
 * and removal, so every lookup, insertion, and removal is logarithmic in the
 * worst case and not just on average.
 *
 * Values are unique under the comparator: inserting a value that compares
 * equal to one already in the tree leaves the tree unchanged.
 *
 * Iterating with `for...of` or the spread operator yields values in-order
 * (ascending under the default comparator) without modifying the tree. The
 * traversal methods inherited from {@linkcode BinarySearchTree} expose the
 * other orders.
 *
 * The following bounds are worst-case, where n is the number of values in the
 * tree (or input collection for `from()`). Traversal bounds cover consuming the
 * entire iterator; comparison and mapping functions are assumed to take O(1).
 *
 * | Method              | Time complexity             |
 * | ------------------- | --------------------------- |
 * | find(value)         | O(log n)                    |
 * | insert(value)       | O(log n)                    |
 * | remove(value)       | O(log n)                    |
 * | min()               | O(log n)                    |
 * | max()               | O(log n)                    |
 * | size                | O(1)                        |
 * | isEmpty()           | O(1)                        |
 * | clear()             | O(1)                        |
 * | lnrValues()         | O(n)                        |
 * | rnlValues()         | O(n)                        |
 * | nlrValues()         | O(n)                        |
 * | lrnValues()         | O(n)                        |
 * | lvlValues()         | O(n²)                       |
 * | [Symbol.iterator]() | O(n)                        |
 * | RedBlackTree()      | O(1)                        |
 * | RedBlackTree.from() | O(n) or O(n log n)          |
 *
 * `lvlValues()` uses an array queue whose shifts can take linear time.
 * `RedBlackTree.from()` takes O(n) when copying a {@linkcode RedBlackTree}
 * without a `compare` or `map` option, and O(n log n) otherwise.
 *
 * @example Usage
 * ```ts
 * import { RedBlackTree } from "@std/data-structures/red-black-tree";
 * import { assertEquals } from "@std/assert";
 *
 * const tree = RedBlackTree.from([3, 10, 13, 4, 6, 7, 1, 14]);
 * assertEquals([...tree], [1, 3, 4, 6, 7, 10, 13, 14]);
 * assertEquals(tree.min(), 1);
 * assertEquals(tree.max(), 14);
 * assertEquals(tree.find(7), 7);
 * assertEquals(tree.find(42), null);
 * assertEquals(tree.remove(7), true);
 * assertEquals([...tree], [1, 3, 4, 6, 10, 13, 14]);
 * ```
 *
 * @example Ordering with a custom comparison function
 * ```ts
 * import { RedBlackTree } from "@std/data-structures/red-black-tree";
 * import { ascend } from "@std/data-structures/comparators";
 * import { assertEquals } from "@std/assert";
 *
 * // Shortest first, alphabetically within a length
 * const words = new RedBlackTree<string>((a, b) =>
 *   ascend(a.length, b.length) || ascend(a, b)
 * );
 * ["truck", "car", "helicopter", "van"].forEach((word) => words.insert(word));
 * assertEquals([...words], ["car", "van", "truck", "helicopter"]);
 * ```
 *
 * @typeParam T The type of the values being stored in the tree.
 */
export class RedBlackTree<T> extends BinarySearchTree<T> {
  /**
   * Creates an empty red-black tree.
   *
   * @param compare A custom comparison function for the values. Must be a
   * function; defaults to sorting in ascending order via {@linkcode ascend}.
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
   * unless a {@linkcode RedBlackTree} is passed, in which case the comparison
   * function is copied from the input tree.
   *
   * Values that compare equal are inserted once, so the resulting tree can
   * hold fewer values than the passed collection.
   *
   * The complexity of this operation is O(n) when copying a
   * {@linkcode RedBlackTree} without a `compare` option, since the tree
   * structure is copied as is, and O(n log n) otherwise, where n is the number
   * of values in the passed collection.
   *
   * @example Creating a red-black tree from an array like
   * ```ts
   * import { RedBlackTree } from "@std/data-structures/red-black-tree";
   * import { assertEquals } from "@std/assert";
   *
   * const tree = RedBlackTree.from<number>([3, 10, 13, 4, 6, 7, 1, 14]);
   * assertEquals([...tree], [1, 3, 4, 6, 7, 10, 13, 14]);
   * ```
   *
   * @example Creating a red-black tree from an iterable object
   * ```ts
   * import { RedBlackTree } from "@std/data-structures/red-black-tree";
   * import { assertEquals } from "@std/assert";
   *
   * const tree = RedBlackTree.from<number>((function*() {
   *   yield 3;
   *   yield 10;
   *   yield 13;
   * })());
   * assertEquals([...tree], [3, 10, 13]);
   * ```
   *
   * @example Creating a red-black tree from an existing red-black tree
   * ```ts
   * import { RedBlackTree } from "@std/data-structures/red-black-tree";
   * import { assertEquals } from "@std/assert";
   *
   * const tree = RedBlackTree.from<number>([3, 10, 13, 4, 6, 7, 1, 14]);
   * const copy = RedBlackTree.from(tree);
   *
   * // The copy is independent of the original
   * copy.remove(3);
   * assertEquals([...copy], [1, 4, 6, 7, 10, 13, 14]);
   * assertEquals([...tree], [1, 3, 4, 6, 7, 10, 13, 14]);
   * ```
   *
   * @example Creating a red-black tree from an array like with a custom comparison function
   * ```ts
   * import { RedBlackTree } from "@std/data-structures/red-black-tree";
   * import { descend } from "@std/data-structures/comparators";
   * import { assertEquals } from "@std/assert";
   *
   * const tree = RedBlackTree.from<number>([3, 10, 13, 4, 6, 7, 1, 14], {
   *   compare: descend,
   * });
   * assertEquals([...tree], [14, 13, 10, 7, 6, 4, 3, 1]);
   * ```
   *
   * @typeParam T The type of the values being stored in the tree.
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
   * an existing red-black tree, transforming the values with a custom mapping
   * function before inserting them.
   *
   * A custom comparison function can be provided to sort the values in a
   * specific order. By default, the values are sorted in ascending order,
   * unless a {@linkcode RedBlackTree} is passed, in which case the comparison
   * function is copied from the input tree. The comparison function is applied
   * to the mapped values.
   *
   * Mapped values that compare equal are inserted once, so the resulting tree
   * can hold fewer values than the passed collection.
   *
   * The complexity of this operation is O(n log n), where n is the number of
   * values in the passed collection.
   *
   * @example Creating a red-black tree from an array like with a custom mapping function
   * ```ts
   * import { RedBlackTree } from "@std/data-structures/red-black-tree";
   * import { assertEquals } from "@std/assert";
   *
   * const tree = RedBlackTree.from<number, string>([3, 10, 13, 4, 6, 7, 1, 14], {
   *   map: (value) => value.toString(),
   * });
   * assertEquals([...tree], ["1", "10", "13", "14", "3", "4", "6", "7"]);
   * ```
   *
   * @typeParam T The type of the values in the passed collection.
   * @typeParam U The type of the values being stored in the red-black tree.
   * @typeParam V The type of the `this` context in the mapping function. Defaults to `undefined`.
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
      : unmappedValues as U[];
    for (const value of values) result.insert(value);
    return result;
  }

  /**
   * Restores the black-height invariant after a black node has been removed.
   *
   * `current` is the node that took the removed node's place, so every path
   * through it is one black short. The loop moves that deficit up the tree
   * until it reaches a red node or the root, where recoloring absorbs it.
   */
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

      // Red sibling: rotate it above the parent so the deficit gets a black
      // sibling, which the cases below can handle.
      if (sibling?.red) {
        sibling.red = false;
        parent.red = true;
        rotateNode(this, parent, direction);
        sibling = parent[siblingDirection];
      }
      if (sibling) {
        // No red nephew: recoloring the sibling balances this subtree and
        // hands the deficit to the parent.
        if (!sibling.left?.red && !sibling.right?.red) {
          sibling!.red = true;
          current = parent;
          parent = current.parent;
        } else {
          // Only the inner nephew is red: rotate it outward so the outer
          // case below applies.
          if (!sibling[siblingDirection]?.red) {
            sibling[direction]!.red = false;
            sibling.red = true;
            rotateNode(this, sibling, siblingDirection);
            sibling = parent[siblingDirection!];
          }
          // Red outer nephew: one rotation restores the black height.
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
   * Add a value to the red-black tree, unless a value that compares equal to
   * it is already present.
   *
   * The complexity of this operation is on average and at worst O(log n), where
   * n is the number of values in the tree.
   *
   * @example Inserting a value into the tree
   * ```ts
   * import { RedBlackTree } from "@std/data-structures/red-black-tree";
   * import { assertEquals } from "@std/assert";
   *
   * const tree = new RedBlackTree<number>();
   *
   * assertEquals(tree.insert(42), true);
   * assertEquals(tree.insert(42), false);
   * ```
   *
   * @param value The value to insert into the tree.
   * @returns `true` if the value was inserted, `false` if a value that compares equal to it already exists in the tree.
   */
  override insert(value: T): boolean {
    let node = insertNode(
      this,
      RedBlackNode,
      value,
    ) as (RedBlackNode<T> | null);
    if (node) {
      // A red node cannot have a red parent. Repair that violation, which each
      // step either resolves or pushes two levels up the tree.
      while (node.parent?.red) {
        let parent: RedBlackNode<T> = node.parent!;
        const parentDirection: Direction = parent.directionFromParent()!;
        const uncleDirection: Direction = parentDirection === "right"
          ? "left"
          : "right";
        const uncle: RedBlackNode<T> | null = parent.parent![uncleDirection] ??
          null;

        // Red uncle: recoloring both makes the grandparent red, moving the
        // violation up.
        if (uncle?.red) {
          parent.red = false;
          uncle.red = false;
          parent.parent!.red = true;
          node = parent.parent!;
        } else {
          // Black uncle: line the node up with its parent, if needed, then a
          // single rotation of the grandparent ends the loop.
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
      // The root is always black.
      (getRoot(this) as RedBlackNode<T>).red = false;
    }
    return !!node;
  }

  /**
   * Remove the value that compares equal to the given value, if the tree holds
   * one.
   *
   * The complexity of this operation is on average and at worst O(log n), where
   * n is the number of values in the tree.
   *
   * @example Removing values from the tree
   * ```ts
   * import { RedBlackTree } from "@std/data-structures/red-black-tree";
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
