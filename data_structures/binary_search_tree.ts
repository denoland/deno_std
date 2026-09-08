// Copyright 2018-2026 the Deno authors. MIT license.
// This module is browser compatible.

import { ascend } from "./comparators.ts";
import { BinarySearchNode } from "./_binary_search_node.ts";
import { internals } from "./_binary_search_tree_internals.ts";

type Direction = "left" | "right";

/**
 * An unbalanced binary search tree. The values are in ascending order by default,
 * using JavaScript's built-in comparison operators to sort the values.
 *
 * For performance, it's recommended that you use a self-balancing binary search
 * tree instead of this one unless you are extending this to create a
 * self-balancing tree. See {@link RedBlackTree} for an example of how BinarySearchTree
 * can be extended to create a self-balancing binary search tree.
 *
 * | Method        | Average Case | Worst Case |
 * | ------------- | ------------ | ---------- |
 * | find(value)   | O(log n)     | O(n)       |
 * | insert(value) | O(log n)     | O(n)       |
 * | remove(value) | O(log n)     | O(n)       |
 * | min()         | O(log n)     | O(n)       |
 * | max()         | O(log n)     | O(n)       |
 *
 * @example Usage
 * ```ts
 * import {
 *   BinarySearchTree,
 *   ascend,
 *   descend,
 * } from "@std/data-structures";
 * import { assertEquals } from "@std/assert";
 *
 * const values = [3, 10, 13, 4, 6, 7, 1, 14];
 * const tree = new BinarySearchTree<number>();
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
 * const invertedTree = new BinarySearchTree<number>(descend);
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
 * const words = new BinarySearchTree<string>((a, b) =>
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
 * @typeparam T The type of the values stored in the binary search tree.
 */
export class BinarySearchTree<T> implements Iterable<T> {
  #root: BinarySearchNode<T> | null = null;
  #size = 0;
  #compare: (a: T, b: T) => number;

  /**
   * Construct an empty binary search tree.
   *
   * To create a binary search tree from an array like, an iterable object, or an
   * existing binary search tree, use the {@link BinarySearchTree.from} method.
   *
   * @param compare A custom comparison function to sort the values in the tree.
   * By default, the values are sorted in ascending order.
   */
  constructor(compare: (a: T, b: T) => number = ascend) {
    if (typeof compare !== "function") {
      throw new TypeError(
        "Cannot construct a BinarySearchTree: the 'compare' parameter is not a function, did you mean to call BinarySearchTree.from?",
      );
    }
    this.#compare = compare;
  }

  static {
    internals.getRoot = <T>(tree: BinarySearchTree<T>) => tree.#root;
    internals.setRoot = <T>(
      tree: BinarySearchTree<T>,
      node: BinarySearchNode<T> | null,
    ) => {
      tree.#root = node;
    };
    internals.getCompare = <T>(tree: BinarySearchTree<T>) => tree.#compare;
    internals.findNode = <T>(
      tree: BinarySearchTree<T>,
      value: T,
    ): BinarySearchNode<T> | null => tree.#findNode(value);
    internals.rotateNode = <T>(
      tree: BinarySearchTree<T>,
      node: BinarySearchNode<T>,
      direction: Direction,
    ) => tree.#rotateNode(node, direction);
    internals.insertNode = <T>(
      tree: BinarySearchTree<T>,
      Node: typeof BinarySearchNode,
      value: T,
    ): BinarySearchNode<T> | null => tree.#insertNode(Node, value);
    internals.removeNode = <T>(
      tree: BinarySearchTree<T>,
      node: BinarySearchNode<T>,
    ): BinarySearchNode<T> | null => tree.#removeNode(node);
    internals.setSize = <T>(tree: BinarySearchTree<T>, size: number) =>
      tree.#size = size;
  }

  /**
   * Creates a new binary search tree from an array like, an iterable object,
   * or an existing binary search tree.
   *
   * A custom comparison function can be provided to sort the values in a
   * specific order. By default, the values are sorted in ascending order,
   * unless a {@link BinarySearchTree} is passed, in which case the comparison
   * function is copied from the input tree.
   *
   * @example Creating a binary search tree from an array like
   * ```ts no-assert
   * import { BinarySearchTree } from "@std/data-structures";
   *
   * const tree = BinarySearchTree.from<number>([42, 43, 41]);
   * ```
   *
   * @example Creating a binary search tree from an iterable object
   * ```ts no-assert
   * import { BinarySearchTree } from "@std/data-structures";
   *
   * const tree = BinarySearchTree.from<number>((function*() {
   *   yield 42;
   *   yield 43;
   *   yield 41;
   * })());
   * ```
   *
   * @example Creating a binary search tree from an existing binary search tree
   * ```ts no-assert
   * import { BinarySearchTree } from "@std/data-structures";
   *
   * const tree = BinarySearchTree.from<number>([42, 43, 41]);
   * const copy = BinarySearchTree.from(tree);
   * ```
   *
   * @example Creating a binary search tree from an array like with a custom comparison function
   * ```ts no-assert
   * import { BinarySearchTree, descend } from "@std/data-structures";
   *
   * const tree = BinarySearchTree.from<number>(
   *   [42, 43, 41],
   *   { compare: descend }
   * );
   * ```
   *
   * @typeparam T The type of the values stored in the binary search tree.
   * @param collection An array like, an iterable, or existing binary search tree.
   * @param options An optional options object to customize the comparison function.
   * @returns A new binary search tree created from the passed collection.
   */
  static from<T>(
    collection: ArrayLike<T> | Iterable<T> | BinarySearchTree<T>,
    options?: {
      compare?: (a: T, b: T) => number;
    },
  ): BinarySearchTree<T>;
  /**
   * Create a new binary search tree from an array like, an iterable object, or
   * an existing binary search tree.
   *
   * A custom mapping function can be provided to transform the values before
   * inserting them into the tree.
   *
   * A custom comparison function can be provided to sort the values in a
   * specific order. A custom mapping function can be provided to transform the
   * values before inserting them into the tree. By default, the values are
   * sorted in ascending order, unless a {@link BinarySearchTree} is passed, in
   * which case the comparison function is copied from the input tree. The
   * comparison operator is used to sort the values in the tree after mapping
   * the values.
   *
   * @example Creating a binary search tree from an array like with a custom mapping function
   * ```ts no-assert
   * import { BinarySearchTree } from "@std/data-structures";
   *
   * const tree = BinarySearchTree.from<number, string>(
   *   [42, 43, 41],
   *   { map: (value) => value.toString() }
   * );
   * ```
   *
   * @typeparam T The type of the values in the passed collection.
   * @typeparam U The type of the values stored in the binary search tree.
   * @typeparam V The type of the `this` value when calling the mapping function. Defaults to `undefined`.
   * @param collection An array like, an iterable, or existing binary search tree.
   * @param options The options object to customize the mapping and comparison functions. The `thisArg` property can be used to set the `this` value when calling the mapping function.
   * @returns A new binary search tree containing the mapped values from the passed collection.
   */
  static from<T, U, V = undefined>(
    collection: ArrayLike<T> | Iterable<T> | BinarySearchTree<T>,
    options: {
      compare?: (a: U, b: U) => number;
      map: (value: T, index: number) => U;
      thisArg?: V;
    },
  ): BinarySearchTree<U>;
  static from<T, U, V>(
    collection: ArrayLike<T> | Iterable<T> | BinarySearchTree<T>,
    options?: {
      compare?: (a: U, b: U) => number;
      map?: (value: T, index: number) => U;
      thisArg?: V;
    },
  ): BinarySearchTree<U> {
    let result: BinarySearchTree<U>;
    let unmappedValues: ArrayLike<T> | Iterable<T> = [];
    if (collection instanceof BinarySearchTree) {
      result = new BinarySearchTree(
        options?.compare ??
          (collection as unknown as BinarySearchTree<U>).#compare,
      );
      if (options?.compare || options?.map) {
        unmappedValues = collection;
      } else {
        const nodes: BinarySearchNode<U>[] = [];
        if (collection.#root) {
          result.#root = BinarySearchNode.from(
            collection.#root as unknown as BinarySearchNode<U>,
          );
          nodes.push(result.#root);
        }
        while (nodes.length) {
          const node: BinarySearchNode<U> = nodes.pop()!;
          const left: BinarySearchNode<U> | null = node.left
            ? BinarySearchNode.from(node.left)
            : null;
          const right: BinarySearchNode<U> | null = node.right
            ? BinarySearchNode.from(node.right)
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
        result.#size = collection.#size;
      }
    } else {
      result = (options?.compare
        ? new BinarySearchTree(options.compare)
        : new BinarySearchTree()) as BinarySearchTree<U>;
      unmappedValues = collection;
    }
    const values: Iterable<U> = options?.map
      ? Array.from(unmappedValues, options.map, options.thisArg)
      : Array.from(unmappedValues) as unknown as U[];
    for (const value of values) result.insert(value);
    return result;
  }

  /**
   * The count of values stored in the binary search tree.
   *
   * The complexity of this operation is O(1).
   *
   * @example Getting the size of the tree
   * ```ts no-assert
   * import { BinarySearchTree } from "@std/data-structures";
   * import { assertEquals } from "@std/assert";
   *
   * const tree = BinarySearchTree.from<number>([42, 43, 41]);
   *
   * assertEquals(tree.size, 3);
   * ```
   *
   * @returns The count of values stored in the binary search tree.
   */
  get size(): number {
    return this.#size;
  }

  #findNode(value: T): BinarySearchNode<T> | null {
    let node: BinarySearchNode<T> | null = this.#root;
    while (node) {
      const order: number = this.#compare(value as T, node.value);
      if (order === 0) break;
      const direction: "left" | "right" = order < 0 ? "left" : "right";
      node = node[direction];
    }
    return node;
  }

  #rotateNode(node: BinarySearchNode<T>, direction: Direction) {
    const replacementDirection: Direction = direction === "left"
      ? "right"
      : "left";
    if (!node[replacementDirection]) {
      throw new TypeError(
        `Cannot rotate ${direction} without ${replacementDirection} child`,
      );
    }
    const replacement: BinarySearchNode<T> = node[replacementDirection]!;
    node[replacementDirection] = replacement[direction] ?? null;
    if (replacement[direction]) replacement[direction]!.parent = node;
    replacement.parent = node.parent;
    if (node.parent) {
      const parentDirection: Direction = node === node.parent[direction]
        ? direction
        : replacementDirection;
      node.parent[parentDirection] = replacement;
    } else {
      this.#root = replacement;
    }
    replacement[direction] = node;
    node.parent = replacement;
  }

  #insertNode(
    Node: typeof BinarySearchNode,
    value: T,
  ): BinarySearchNode<T> | null {
    if (!this.#root) {
      this.#root = new Node(null, value);
      this.#size++;
      return this.#root;
    } else {
      let node: BinarySearchNode<T> = this.#root;
      while (true) {
        const order: number = this.#compare(value, node.value);
        if (order === 0) break;
        const direction: Direction = order < 0 ? "left" : "right";
        if (node[direction]) {
          node = node[direction]!;
        } else {
          node[direction] = new Node(node, value);
          this.#size++;
          return node[direction];
        }
      }
    }
    return null;
  }

  /** Removes the given node, and returns the node that was physically removed from the tree. */
  #removeNode(
    node: BinarySearchNode<T>,
  ): BinarySearchNode<T> | null {
    /**
     * The node to physically remove from the tree.
     * Guaranteed to have at most one child.
     */
    const flaggedNode: BinarySearchNode<T> | null = !node.left || !node.right
      ? node
      : node.findSuccessorNode()!;
    /** Replaces the flagged node. */
    const replacementNode: BinarySearchNode<T> | null = flaggedNode.left ??
      flaggedNode.right;

    if (replacementNode) replacementNode.parent = flaggedNode.parent;
    if (!flaggedNode.parent) {
      this.#root = replacementNode;
    } else {
      flaggedNode.parent[flaggedNode.directionFromParent()!] = replacementNode;
    }
    if (flaggedNode !== node) {
      /** Swaps values, in case value of the removed node is still needed by consumer. */
      const swapValue = node.value;
      node.value = flaggedNode.value;
      flaggedNode.value = swapValue;
    }

    this.#size--;
    return flaggedNode;
  }

  /**
   * Add a value to the binary search tree if it does not already exist in the
   * tree.
   *
   * The complexity of this operation is on average O(log n), where n is the
   * number of values in the tree. In the worst case, the complexity is O(n).
   *
   * @example Inserting values into the tree
   * ```ts
   * import { BinarySearchTree } from "@std/data-structures";
   * import { assertEquals } from "@std/assert";
   *
   * const tree = new BinarySearchTree<number>();
   *
   * assertEquals(tree.insert(42), true);
   * assertEquals(tree.insert(42), false);
   * ```
   *
   * @param value The value to insert into the binary search tree.
   * @returns `true` if the value was inserted, `false` if the value already exists in the tree.
   */
  insert(value: T): boolean {
    return !!this.#insertNode(BinarySearchNode, value);
  }

  /**
   * Remove a value from the binary search tree if it exists in the tree.
   *
   * The complexity of this operation is on average O(log n), where n is the
   * number of values in the tree. In the worst case, the complexity is O(n).
   *
   * @example Removing values from the tree
   * ```ts
   * import { BinarySearchTree } from "@std/data-structures";
   * import { assertEquals } from "@std/assert";
   *
   * const tree = BinarySearchTree.from<number>([42]);
   *
   * assertEquals(tree.remove(42), true);
   * assertEquals(tree.remove(42), false);
   * ```
   *
   * @param value The value to remove from the binary search tree.
   * @returns `true` if the value was found and removed, `false` if the value was not found in the tree.
   */
  remove(value: T): boolean {
    const node: BinarySearchNode<T> | null = this.#findNode(value);
    if (node) this.#removeNode(node);
    return node !== null;
  }

  /**
   * Check if a value exists in the binary search tree.
   *
   * The complexity of this operation depends on the underlying structure of the
   * tree. Refer to the documentation of the structure itself for more details.
   *
   * @example Finding values in the tree
   * ```ts
   * import { BinarySearchTree } from "@std/data-structures";
   * import { assertEquals } from "@std/assert";
   *
   * const tree = BinarySearchTree.from<number>([42]);
   *
   * assertEquals(tree.find(42), 42);
   * assertEquals(tree.find(43), null);
   * ```
   *
   * @param value The value to search for in the binary search tree.
   * @returns The value if it was found, or null if not found.
   */
  find(value: T): T | null {
    return this.#findNode(value)?.value ?? null;
  }

  /**
   * Retrieve the lowest (left most) value in the binary search tree, or null if
   * the tree is empty.
   *
   * The complexity of this operation depends on the underlying structure of the
   * tree. Refer to the documentation of the structure itself for more details.
   *
   * @example Finding the minimum value in the tree
   * ```ts
   * import { BinarySearchTree } from "@std/data-structures";
   * import { assertEquals } from "@std/assert";
   *
   * const tree = BinarySearchTree.from<number>([42, 43, 41]);
   *
   * assertEquals(tree.min(), 41);
   * ```
   *
   * @returns The minimum value in the binary search tree, or null if the tree is empty.
   */
  min(): T | null {
    return this.#root ? this.#root.findMinNode().value : null;
  }

  /**
   * Retrieve the highest (right most) value in the binary search tree, or null
   * if the tree is empty.
   *
   * The complexity of this operation depends on the underlying structure of the
   * tree. Refer to the documentation of the structure itself for more details.
   *
   * @example Finding the maximum value in the tree
   * ```ts
   * import { BinarySearchTree } from "@std/data-structures";
   * import { assertEquals } from "@std/assert";
   *
   * const tree = BinarySearchTree.from<number>([42, 43, 41]);
   *
   * assertEquals(tree.max(), 43);
   * ```
   *
   * @returns The maximum value in the binary search tree, or null if the tree is empty.
   */
  max(): T | null {
    return this.#root ? this.#root.findMaxNode().value : null;
  }

  /**
   * Remove all values from the binary search tree.
   *
   * The complexity of this operation is O(1).
   *
   * @example Clearing the tree
   * ```ts
   * import { BinarySearchTree } from "@std/data-structures";
   * import { assertEquals } from "@std/assert";
   *
   * const tree = BinarySearchTree.from<number>([42, 43, 41]);
   * tree.clear();
   *
   * assertEquals(tree.size, 0);
   * assertEquals(tree.find(42), null);
   * ```
   */
  clear() {
    this.#root = null;
    this.#size = 0;
  }

  /**
   * Check if the binary search tree is empty.
   *
   * The complexity of this operation is O(1).
   *
   * @example Checking if the tree is empty
   * ```ts
   * import { BinarySearchTree } from "@std/data-structures";
   * import { assertEquals } from "@std/assert";
   *
   * const tree = new BinarySearchTree<number>();
   *
   * assertEquals(tree.isEmpty(), true);
   *
   * tree.insert(42);
   *
   * assertEquals(tree.isEmpty(), false);
   * ```
   *
   * @returns `true` if the binary search tree is empty, `false` otherwise.
   */
  isEmpty(): boolean {
    return this.size === 0;
  }

  /**
   * Create an iterator over this tree that traverses the tree in-order (LNR,
   * Left-Node-Right).
   *
   * @example Using the in-order LNR iterator
   * ```ts
   * import { BinarySearchTree } from "@std/data-structures";
   * import { assertEquals } from "@std/assert";
   *
   * const tree = BinarySearchTree.from([4, 1, 2, 5, 3]);
   *
   * assertEquals([...tree.lnrValues()], [1, 2, 3, 4, 5]);
   * ```
   *
   * @returns An iterator that traverses the tree in-order (LNR).
   */
  *lnrValues(): IterableIterator<T> {
    const nodes: BinarySearchNode<T>[] = [];
    let node: BinarySearchNode<T> | null = this.#root;
    while (nodes.length || node) {
      if (node) {
        nodes.push(node);
        node = node.left;
      } else {
        node = nodes.pop()!;
        yield node.value;
        node = node.right;
      }
    }
  }

  /**
   * Create an iterator over this tree that traverses the tree in reverse
   * in-order (RNL, Right-Node-Left).
   *
   * @example Using the reverse in-order RNL iterator
   * ```ts
   * import { BinarySearchTree } from "@std/data-structures";
   * import { assertEquals } from "@std/assert";
   *
   * const tree = BinarySearchTree.from([4, 1, 2, 5, 3]);
   * [...tree.rnlValues()] // 5, 4, 3, 2, 1
   * ```
   *
   * @returns An iterator that traverses the tree in reverse in-order (RNL).
   */
  *rnlValues(): IterableIterator<T> {
    const nodes: BinarySearchNode<T>[] = [];
    let node: BinarySearchNode<T> | null = this.#root;
    while (nodes.length || node) {
      if (node) {
        nodes.push(node);
        node = node.right;
      } else {
        node = nodes.pop()!;
        yield node.value;
        node = node.left;
      }
    }
  }

  /**
   * Create an iterator over this tree that traverses the tree in pre-order (NLR,
   * Node-Left-Right).
   *
   * @example Using the pre-order NLR iterator
   * ```ts
   * import { BinarySearchTree } from "@std/data-structures";
   * import { assertEquals } from "@std/assert";
   *
   * const tree = BinarySearchTree.from([4, 1, 2, 5, 3]);
   *
   * assertEquals([...tree.nlrValues()], [4, 1, 2, 3, 5]);
   * ```
   *
   * @returns An iterator that traverses the tree in pre-order (NLR).
   */
  *nlrValues(): IterableIterator<T> {
    const nodes: BinarySearchNode<T>[] = [];
    if (this.#root) nodes.push(this.#root);
    while (nodes.length) {
      const node: BinarySearchNode<T> = nodes.pop()!;
      yield node.value;
      if (node.right) nodes.push(node.right);
      if (node.left) nodes.push(node.left);
    }
  }

  /**
   * Create an iterator over this tree that traverses the tree in post-order (LRN,
   * Left-Right-Node).
   *
   * @example Using the post-order LRN iterator
   * ```ts
   * import { BinarySearchTree } from "@std/data-structures";
   * import { assertEquals } from "@std/assert";
   *
   * const tree = BinarySearchTree.from([4, 1, 2, 5, 3]);
   *
   * assertEquals([...tree.lrnValues()], [3, 2, 1, 5, 4]);
   * ```
   *
   * @returns An iterator that traverses the tree in post-order (LRN).
   */
  *lrnValues(): IterableIterator<T> {
    const nodes: BinarySearchNode<T>[] = [];
    let node: BinarySearchNode<T> | null = this.#root;
    let lastNodeVisited: BinarySearchNode<T> | null = null;
    while (nodes.length || node) {
      if (node) {
        nodes.push(node);
        node = node.left;
      } else {
        const lastNode: BinarySearchNode<T> = nodes.at(-1)!;
        if (lastNode.right && lastNode.right !== lastNodeVisited) {
          node = lastNode.right;
        } else {
          yield lastNode.value;
          lastNodeVisited = nodes.pop()!;
        }
      }
    }
  }

  /**
   * Create an iterator over this tree that traverses the tree in level-order (BFS,
   * Breadth-First Search).
   *
   * @example Using the level-order BFS iterator
   * ```ts
   * import { BinarySearchTree } from "@std/data-structures";
   * import { assertEquals } from "@std/assert";
   *
   * const tree = BinarySearchTree.from([4, 1, 2, 5, 3]);
   *
   * assertEquals([...tree.lvlValues()], [4, 1, 5, 2, 3]);
   * ```
   *
   * @returns An iterator that traverses the tree in level-order (BFS).
   */
  *lvlValues(): IterableIterator<T> {
    const children: BinarySearchNode<T>[] = [];
    let cursor: BinarySearchNode<T> | null = this.#root;
    while (cursor) {
      yield cursor.value;
      if (cursor.left) children.push(cursor.left);
      if (cursor.right) children.push(cursor.right);
      cursor = children.shift() ?? null;
    }
  }

  /**
   * Create an iterator over this tree that traverses the tree in-order (LNR,
   * Left-Node-Right).
   *
   * @example Using the in-order iterator
   * ```ts
   * import { BinarySearchTree } from "@std/data-structures";
   * import { assertEquals } from "@std/assert";
   *
   * const tree = BinarySearchTree.from([4, 1, 2, 5, 3]);
   *
   * assertEquals([...tree], [1, 2, 3, 4, 5]);
   * ```
   *
   * See {@link BinarySearchTree.prototype.lnrValues}.
   *
   * @returns An iterator that traverses the tree in-order (LNR).
   */
  *[Symbol.iterator](): IterableIterator<T> {
    yield* this.lnrValues();
  }
}
