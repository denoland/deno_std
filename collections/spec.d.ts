type Predicate<T> = (item: T) => boolean
type Selector<T, O = unknown> = (item: T) => O
type Grouping<V> = Record<string, Array<V>>

/*
 * ARRAYS
 */

/*
 * Transformations to Array
 */

/**
 * Transforms all elements in the given collection using the given transformer and builds a new array with the results, removing nullish values
 *
 * Example:
 *
 * ```typescript
 * const people = [
 *     { middleName: null },
 *     { middleName: 'William' },
 *     { middleName: undefined },
 *     { middleName: 'Martha' },
 * ]
 * const foundMiddleNames = mapNotNullish(people, it => it.middleName)
 *
 * console.assert(foundMiddleNames === [ 'William', 'Martha' ])
 * ```
 */
declare function mapNotNullish<T, O>(collection: Array<T>, transformer: Selector<T, O>): Array<NonNullable<O>>

/**
 * Returns all elements in the given collection until the first element that does not match the given predicate (excluded)
 *
 * Example:
 *
 * ```typescript
 * const numbers = [ 1, 2, 3, 0 ]
 * const restNumbers = takeFirstWhile(numbers, it => it < 3)
 *
 * console.assert(restNumbers === [ 1, 2 ])
 * ```
 */
declare function takeFirstWhile<T>(collection: Array<T>, predicate: Predicate<T>): Array<T>

/**
 * Returns all elements in the given collection from the last element that does not match the given predicate (excluded) until the end of the collection
 *
 * Example:
 *
 * ```typescript
 * const numbers = [ 1, 2, 3, 0 ]
 * const restNumbers = takeLastWhile(numbers, it => it < 3)
 *
 * console.assert(restNumbers === [ 0 ])
 * ```
 */
declare function takeLastWhile<T>(collection: Array<T>, predicate: Predicate<T>): Array<T>

/**
 * Returns all elements in the given collection starting from the first element that does not match the given predicate
 *
 * Example:
 *
 * ```typescript
 * const numbers = [ 1, 2, 3, 0 ]
 * const restNumbers = dropFirstWhile(numbers, it => it < 3)
 *
 * console.assert(restNumbers === [ 3, 0 ])
 * ```
 */
declare function dropFirstWhile<T>(collection: Array<T>, predicate: Predicate<T>): Array<T>

/**
 * Returns all elements in the given collection until the last element that does not match the given predicate
 *
 * Example:
 *
 * ```typescript
 * const numbers = [ 1, 2, 3, 0 ]
 * const restNumbers = dropLastWhile(numbers, it => it < 3)
 *
 * console.assert(restNumbers === [ 1, 2, 3 ])
 * ```
 */
declare function dropLastWhile<T>(collection: Array<T>, predicate: Predicate<T>): Array<T>

/**
 * Returns all elements in the given collection that are not nullish
 *
 * Example:
 *
 * ```typescript
 * const middleNames = [ null, 'William', undefined, 'Martha' ]
 *
 * console.assert(filterNotNullish(middleNames) === [ 'William', 'Martha' ])
 * ```
 */
declare function filterNotNullish<T>(collection: Array<T>): Array<NonNullable<T>>

/**
 * Returns all distinct elements in the given collection, preserving order by first occurence
 *
 * Example:
 *
 * ```typescript
 * const numbers = [ 3, 2, 5, 2, 5 ]
 * const distinctNumbers = distinct(numbers)
 *
 * console.assert(distinctNumbers === [ 3, 2, 5 ])
 * ```
 */
declare function distinct<T>(collection: Array<T>): Array<T>

/**
 * Returns all elements in the given collection that produce a distinct value using the given selector, preserving order by first occurence
 *
 * Example:
 *
 * ```typescript
 * const names = [ 'Anna', 'Kim', 'Arnold', 'Kate' ]
 * const exampleNamesByFirstLetter = distinctBy(names, it => it.charAt(0))
 *
 * console.assert(exampleNamesByFirstLetter === [ 'Anna', 'Kim' ])
 * ```
 */
declare function distinctBy<T>(collection: Array<T>, selector: Selector<T>): Array<T>

/**
 * Returns all elements in the given collection, sorted by their result using the given selector
 *
 * Example:
 *
 * ```typescript
 * const people = [
 *     { name: 'Anna', age: 34 },
 *     { name: 'Kim', age: 42 },
 *     { name: 'John', age: 23 },
 * ]
 * const sortedByAge = sortBy(people, it => it.age)
 *
 * console.assert(sortedByAge === [
 *     { name: 'John', age: 23 },
 *     { name: 'Anna', age: 34 },
 *     { name: 'Kim', age: 42 },
 * ])
 * ```
 */
declare function sortBy<T>(collection: Array<T>, selector: Selector<T, number | string>): Array<T>

/**
 * Returns all distinct elements that appear in both given collections
 *
 * Example:
 *
 * ```typescript
 * const lisaInterests = [ 'Cooking', 'Music', 'Hiking' ]
 * const kimInterests = [ 'Music', 'Tennis', 'Cooking' ]
 * const commonInterests = intersect(lisaInterests, kimInterests)
 *
 * console.assert(commonInterests === [ 'Cooking', 'Music' ])
 * ```
 */
declare function intersect<T>(collection: Array<T>, withCollection: Array<T>): Array<T>

/**
 * Returns all distinct elements that appear in either of the given collections
 *
 * Example:
 *
 * ```typescript
 * const soupIngredients = [ 'Pepper', 'Carrots', 'Leek' ]
 * const saladIngredients = [ 'Carrots', 'Radicchio', 'Pepper' ]
 * const shoppingList = union(soupIngredients, saladIngredients)
 *
 * console.assert(shoppingList === [ 'Pepper', 'Carrots', 'Leek', 'Radicchio' ])
 * ```
 */
declare function union<T>(collection: Array<T>, withCollection: Array<T>): Array<T>

/**
 * Calls the given reducer on each element of the given collection, passing it's result as the accumulator to the next respective call,
 * starting with the given initialValue. Returns all intermediate accumulator results.
 *
 * Example:
 *
 * ```typescript
 * const numbers = [ 1, 2, 3, 4, 5 ]
 * const sumSteps = runningReduce(numbers, (sum, current) => sum + current, 0)
 *
 * console.assert(sumSteps === [ 1, 3, 6, 10, 15 ])
 * ```
 */
declare function runningReduce<T, A>(collection: Array<T>, reducer: (accumulator: A, current: T) => A, initialValue: A): Array<A>

/**
 * Returns all elements in the given collection except the given value to remove
 *
 * Example:
 *
 * ```typescript
 * const numbers = [ 4, 2, 13, 7 ]
 * const luckyNumbers = without(numbers, 13)
 *
 * console.assert(luckyNumbers === [ 4, 2, 7 ])
 * ```
 */
declare function without<T>(collection: Array<T>, toRemove: T): Array<T>

/**
 * Returns all elements in the given collection except the given values to remove
 *
 * Example:
 *
 * ```typescript
 * const numbers = [ 0, 1, 2, 3, 4, 5 ]
 * const nonPrimes = without(numbers, [ 2, 3, 5 ])
 *
 * console.assert(nonPrimes === [ 0, 1, 4 ])
 * ```
 */
declare function withoutAll<T>(collection: Array<T>, toRemove: Array<T>): Array<T>

/*
 * Transformations to value
 */

/**
 * Returns the last element in the given collection matching the given predicate
 *
 * Example:
 *
 * ```typescript
 * const numbers = [ 4, 2, 7 ]
 * const lastEvenNumber = findLast(numbers, it => it % 2 === 0)
 *
 * console.assert(lastEvenNumber === 2)
 * ```
 */
declare function findLast<T>(collection: Array<T>, predicate: Predicate<T>): T | undefined

/**
 * Returns the only element in the given collection matching the given predicate. Returns undefined if there is none.
 *
 * Example:
 *
 * ```typescript
 * const bookings = [
 *     { monh: 'January', active: false },
 *     { month: 'March', active: false },
 *     { month: 'June', active: true },
 * ]
 * const activeBooking = single(booking, it => it.active)
 *
 * console.assert(activeBooking === { month: 'June', active: true })
 * ```
 */
declare function single<T>(collection: Array<T>, predicate: Predicate<T>): T | undefined

/**
 * Returns the first value in the given collection that produces a not-nullish value using the given selector
 *
 * Example:
 *
 * ```typescript
 * const tables = [
 *     { number: 11, order: null },
 *     { number: 12, order: 'Soup' },
 *     { number: 13, order: 'Salad' },
 * ]
 * const nextOrder = firstNotNullishOf(tables, it => it.order)
 *
 * console.assert(nextOrder === 'Soup')
 * ```
 */
declare function firstNotNullishOf<T, O>(collection: Array<T>, selector: Selector<T, O>): NonNullable<O> | undefined

/**
 * Applies the given selector to all elements in the given collection and calculates the sum of the results
 *
 * Example:
 *
 * ```typescript
 * const people = [
 *     { name: 'Anna', age: 34 },
 *     { name: 'Kim', age: 42 },
 *     { name: 'John', age: 23 },
 * ]
 * const totalAge = sumOf(people, it => it.age)
 *
 * console.assert(totalAge === 99)
 * ```
 */
declare function sumOf<T>(collection: Array<T>, selector: Selector<T, number>): number

/**
 * Applies the given selector to all elements in the given collection and returns the element that produced the maximum result.
 *
 * Returns undefined if the collection is empty.
 *
 * Example:
 *
 * ```typescript
 * const people = [
 *     { name: 'Anna', age: 34 },
 *     { name: 'Kim', age: 42 },
 *     { name: 'John', age: 23 },
 * ]
 * const oldestPerson = maxBy(people, it => it.age)
 *
 * console.assert(oldestPerson === { name: 'Kim', age: 42 })
 * ```
 */
declare function maxBy<T>(collection: Array<T>, selector: Selector<T, number | string>): T | undefined

/**
 * Applies the given selector to all elements in the given collection and returns the element that produced the minimum result.
 *
 * Returns undefined if the collection is empty.
 *
 * Example:
 *
 * ```typescript
 * const people = [
 *     { name: 'Anna', age: 34 },
 *     { name: 'Kim', age: 42 },
 *     { name: 'John', age: 23 },
 * ]
 * const youngestPerson = minBy(people, it => it.age)
 *
 * console.assert(youngestPerson === { name: 'John', age: 23 })
 * ```
 */
declare function minBy<T>(collection: Array<T>, selector: Selector<T, number | string>): T | undefined

/**
 * Returns the maximum element in the given collection when sorted using the given comparator.
 *
 * Returns undefined if the collection is empty.
 *
 * Example:
 *
 * ```typescript
 * const diceThrows = [
 *     [ 1, 3, 4 ],
 *     [ 6, 1, 3 ],
 *     [ 4, 5, 2 ],
 * ]
 * const highestThrow = maxWith(numbers, (a, b) => a.sum() - b.sum())
 *
 * console.assert(highestThrow === [ 4, 5, 2 ])
 * ```
 */
declare function maxWith<T>(collection: Array<T>, comparator: (a: T, b: T) => number): T | undefined

/**
 * Returns the minimum element in the given collection when sorted using the given comparator.
 *
 * Returns undefined if the collection is empty.
 *
 * Example:
 *
 * ```typescript
 * const diceThrows = [
 *     [ 1, 3, 4 ],
 *     [ 6, 1, 3 ],
 *     [ 4, 5, 2 ],
 * ]
 * const lowestThrow = minWith(numbers, (a, b) => a.sum() - b.sum())
 *
 * console.assert(lowestThrow === [ 1, 3, 4 ])
 * ```
 */
declare function minWith<T>(collection: Array<T>, comparator: (a: T, b: T) => number): T | undefined

/**
 * Applies the given selector to all elements in the given collection and returns the maximum result.
 *
 * Returns undefined if the collection is empty.
 *
 * Example:
 *
 * ```typescript
 * const people = [
 *     { name: 'Anna', age: 34 },
 *     { name: 'Kim', age: 42 },
 *     { name: 'John', age: 23 },
 * ]
 * const maximumAge = maxOf(people, it => it.age)
 *
 * console.assert(maximumAge === 42)
 * ```
 */
declare function maxOf<T, O extends number | string>(collection: Array<T>, selector: Selector<T, O>): O | undefined

/**
 * Applies the given selector to all elements in the given collection and returns the minimum result.
 *
 * Returns undefined if the collection is empty.
 *
 * Example:
 *
 * ```typescript
 * const people = [
 *     { name: 'Anna', age: 34 },
 *     { name: 'Kim', age: 42 },
 *     { name: 'John', age: 23 },
 * ]
 * const minimumAge = minOf(people, it => it.age)
 *
 * console.assert(minimumAge === 23)
 * ```
 */
declare function minOf<T, O extends number | string>(collection: Array<T>, selector: Selector<T, O>): O | undefined

/*
 * Number array transformations
 */

/**
 * Returns the mean average of all elements in the given collection
 *
 * Example:
 *
 * ```typescript
 * const numbers = [ 4, 2, 7 ]
 * const meanAverage = average(numbers)
 *
 * console.assert(meanAverage === 6.5)
 * ```
 */
declare function average(collection: Array<number>): number | undefined

/*
 * Transformations to other formats
 */

/**
 * Builds 2-tuples of elements from the given collection with matching indices, stopping when the smaller collection's end is reached
 *
 * Example:
 *
 * ```typescript
 * const numbers = [ 1, 2, 3, 4 ]
 * const letters = [ 'a', 'b', 'c', 'd' ]
 * const pairs = zip(numbers, letters)
 *
 * console.assert(pairs === [
 *     [ 1, 'a' ],
 *     [ 2, 'b' ],
 *     [ 3, 'c' ],
 *     [ 4, 'd' ],
 * ])
 * ```
 */
declare function zip<T, U>(collection: Array<T>, withCollection: Array<U>): Array<[ T, U ]>

/**
 * Builds two separate collections from the given collection of 2-tuples, with the first returned collection holding all first
 * tuple elements and the second one holding all the second elements
 *
 * Example:
 *
 * ```typescript
 * const parents = [
 *     [ 'Maria', 'Jeff' ],
 *     [ 'Anna', 'Kim' ],
 *     [ 'John', 'Leroy' ],
 * ]
 * const [ moms, dads ] = unzip(parents)
 *
 * console.assert(moms === [ 'Maria', 'Anna', 'John' ])
 * console.assert(moms === [ 'Jeff', 'Kim', 'Leroy' ])
 * ```
 */
declare function unzip<T, U>(pairs: Array<[ T, U ]>): [ Array<T>, Array<U> ]

/**
 * Applies the given selector to each element in the given array, returning a Record containing the results as keys
 * and the last value that produced that key as values.
 *
 * Example:
 *
 * ```typescript
 * const users = [
 *     { id: 'a2e', userName: 'Anna' },
 *     { id: '5f8', userName: 'Arnold' },
 *     { id: 'd2c', userName: 'Kim' },
 * ]
 * const usersById = assocaiteBy(people, it => it.id)
 *
 * console.assert(usersById === {
 *     'a2e': { id: 'a2e', userName: 'Anna' },
 *     '5f8': { id: '5f8', userName: 'Arnold' },
 *     'd2c': { id: 'd2c', userName: 'Kim' },
 * })
 * ```
 */
declare function associateBy<T>(collection: Array<T>, selector: Selector<T, string>): Record<string, T>

/**
 * Applies the given selector to each element in the given array, returning a Record containing the results as keys
 * and all values that produced that key as values.
 *
 * Example:
 *
 * ```typescript
 * const people = [
 *     { name: 'Anna' },
 *     { name: 'Arnold' },
 *     { name: 'Kim' },
 * ]
 * const peopleByFirstLetter = groupBy(people, it => it.name.charAt(0))
 *
 * console.assert(peopleByFirstLetter === {
 *     'A': [ { name: 'Anna' }, { name: 'Arnold' } ],
 *     'K': [ { name: 'Kim' } ],
 * })
 * ```
 */
declare function groupBy<T>(collection: Array<T>, selector: Selector<T, string>): Grouping<T>

/**
 * Returns a tuple of two collections with the first one containing all elements in the given collection that match the given predicate
 * and the second one containing all that do not
 *
 * Example:
 *
 * ```typescript
 * const numbers = [ 5, 6, 7, 8, 9 ]
 * const [ even, odd ] = partition(numbers, it => it % 2 == 0)
 *
 * console.assert(even === [ 6, 8 ])
 * console.assert(odd === [ 5, 7, 9 ])
 * ```
 */
declare function partition<T>(collection: Array<T>, predicate: Predicate<T>): [ Array<T>, Array<T> ]

/**
 * Splits the given collection into chunks of the given size and returns them
 *
 * Example:
 *
 * ```typescript
 * const words = [ 'lorem', 'ipsum', 'dolor', 'sit', 'amet', 'consetetur', 'sadipscing' ]
 * const chunks = chunked(words, 3)
 *
 * console.assert(chunks === [
 *     [ 'lorem', 'ipsum', 'dolor' ],
 *     [ 'sit', 'amet', 'consetetur' ],
 *     [ 'sadipscing' ],
 * ])
 * ```
 */
declare function chunked<T>(collection: Array<T>, size: number): Array<Array<T>>

/**
 * Builds all possible combinations and orders of elements in the given collection and the given size.
 *
 * If size is not given, it is assumed to be the length of the given collection.
 *
 * Example:
 *
 * ```typescript
 * const numbers = [ 1, 2, 3 ]
 * const windows = permutations(words, 2)
 *
 * console.assert(windows === [
 *     [ 1, 2 ],
 *     [ 1, 3 ],
 *     [ 2, 1 ],
 *     [ 2, 3 ],
 *     [ 3, 1 ],
 *     [ 3, 2 ],
 * ])
 * ```
 */
declare function permutations<T>(collection: Array<T>, size?: number): Array<Array<T>>

/**
 * Generates sliding views of the given collection of the given size and returns a new collection contianing all of them.
 *
 * If step is set, each window will start that many elements after the last window's start.
 * If partial is set, windows will be generated for the last elements of the collection,
 * resulting in some undefined values if size is greather than 1.
 *
 * Example:
 *
 * ```typescript
 * const numbers = [ 1, 2, 3, 4, 5 ]
 * const windows = windowed(words, 3)
 *
 * console.assert(windows === [
 *     [ 1, 2, 3 ],
 *     [ 2, 3, 4 ],
 *     [ 3, 4, 5 ],
 * ])
 * ```
 */
declare function windowed<T>(collection: Array<T>, size: number, config?: { step?: number, partial?: boolean }): Array<Array<T>>

/*
 * RECORDS
 */

/*
 * Predicates
 */

/**
 * Checks if the given collection includes the given value
 *
 * Example:
 *
 * ```typescript
 * const usersById = {
 *     'a2e': 'Kim',
 *     'dfe': 'Anna',
 *     '34b': 'Tim',
 * }
 * const includesKim = includesValue(usersById, 'Kim')
 *
 * console.assert(includesKim === true)
 * ```
 */
declare function includesValue<T>(collection: Record<string, T>, value: T): boolean

/*
 * Transformations to Records
 */

/**
 * Returns a new collection with all entries of the given collection except the ones that do not match the given predicate
 *
 * Example:
 *
 * ```typescript
 * const menu = {
 *     'Salad': 11,
 *     'Soup': 8,
 *     'Pasta': 13,
 * }
 * const myOptions = filterEntries(menu,
 *     ([ item, price ]) => item !== 'Pasta' && price < 10,
 * )
 *
 * console.assert(myOptions === {
 *     'Soup': 8,
 * })
 * ```
 */
declare function filterEntries<T>(collection: Record<string, T>, predicate: Predicate<[string, T]>): Record<string, T>

/**
 * Returns a new collection with all entries of the given collection except the ones that have a key that does not match the given predicate
 *
 * Example:
 *
 * ```typescript
 * const menu = {
 *     'Salad': 11,
 *     'Soup': 8,
 *     'Pasta': 13,
 * }
 * const menuWithoutSalad = filterKeys(menu, it => it !== 'Salad')
 *
 * console.assert(menuWithoutSalad === {
 *     'Soup': 8,
 *     'Pasta': 13,
 * })
 * ```
 */
declare function filterKeys<T>(collection: Record<string, T>, predicate: Predicate<string>): Record<string, T>

/**
 * Returns a new collection with all entries of the given collection except the ones that have a value that does not match the given predicate
 *
 * Example:
 *
 * ```typescript
 * const people = {
 *     'Arnold': 37,
 *     'Sarah': 7,
 *     'Kim': 23,
 * }
 * const adults = filterValues(people, it => it.age >= 18)
 *
 * console.assert(adults === {
 *     'Arnold': 37,
 *     'Kim': 23,
 * })
 * ```
 */
declare function filterValues<T>(collection: Record<string, T>, predicate: Predicate<T>): Record<string, T>

/**
 * Returns a new collection with all entries of the given collection except the ones that have a nullish value
 *
 * Example:
 *
 * ```typescript
 * const people = {
 *     'Arnold': 'William',
 *     'Sarah': null,
 *     'Kim': 'Martha',
 * }
 * const peopleWithMiddleNames = filterValuesNotNullish(middleNames)
 *
 * console.assert(peopleWithMiddleNames === {
 *     'Arnold': 'William',
 *     'Kim': 'Martha',
 * })
 * ```
 */
declare function filterValuesNotNullish<T>(collection: Record<string, T>): Record<string, NonNullable<T>>

/**
 * Applies the given transformer to all entries in the given collection and returns a new collection containing the results
 *
 * Example:
 *
 * ```typescript
 * const usersById = {
 *     'a2e': { name: 'Kim', age: 22 },
 *     'dfe': { name: 'Anna', age: 31 },
 *     '34b': { name: 'Tim', age: 58 },
 * }
 * const agesByNames = mapEntries(usersById,
 *     ([ id, { name, age } ]) => [ name, age ],
 * )
 *
 * console.assert(agesByNames === {
 *     'Kim': 22,
 *     'Anna': 31,
 *     'Tim': 58,
 * })
 * ```
 */
declare function mapEntries<T, O>(collection: Record<string, T>, transformer: Selector<[string, T], [string, O]>): Record<string, O>

/**
 * Merges the two given Records, recursively merging any nested Records with the second collection overriding the first in case of conflict
 *
 * Example:
 *
 * ```typescript
 * const person = {
 *     name: 'Kim',
 *     demographics: {
 *         age: 22,
 *     },
 * }
 * const patch = {
 *     demographics: {
 *         age: 30,
 *         salutation: 'Ms.',
 *     },
 * }
 *
 * console.assert(deepMerge(person, patch) === {
 *     name: 'Kim',
 *     demographics: {
 *         age: 30,
 *         salutation: 'Ms.',
 *     },
 * })
 * ```
 */
declare function deepMerge<T extends Record<keyof any, unknown>>(collection: Partial<T>, other: Partial<T>): T
declare function deepMerge<T extends Record<keyof any, unknown>, U extends Record<keyof unknown, unknown>>(collection: T, other: U): T & U

/**
 * Applies the given transformer to all keys in the given collection's entries and returns a new collection containing the
 * transformed entries.
 *
 * If the transformed entries contain the same key multiple times, only the last one will appear in the returned collection.
 *
 * Example:
 *
 * ```typescript
 * const counts = { a: 5, b: 3, c: 8 }
 *
 * console.assert(mapKeys(counts, it => it.toUppercase()) === {
 *     A: 5,
 *     B: 3,
 *     C: 8,
 * })
 * ```
 */
declare function mapKeys<T>(collection: Record<string, T>, transformer: Selector<string, string>): Record<string, T>

/**
 * Applies the given transformer to all valuesin the given collection and returns a new collection containing the resulting keys
 * associated to the last value that produced them.
 *
 * Example:
 *
 * ```typescript
 * const usersById = {
 *     'a5ec': { name: 'Mischa' },
 *     'de4f': { name: 'Kim' },
 * }
 * const namesById = mapValues(usersById, it => it.name)
 *
 * console.assert(namesById === {
 *     'a5ec': 'Mischa',
 *     'de4f': 'Kim',
 * }
 * ```
 */
declare function mapValues<T, O>(collection: Record<string, T>, transformer: Selector<T, O>): Record<string, O>

/**
 * Groups
 */

/**
 * Applies the given reducer to each group in the given Grouping, returning the results together with the respective group keys
 *
 * ```typescript
 * const votes = {
 *     'Woody': [ 2, 3, 1, 4 ],
 *     'Buzz': [ 5, 9 ],
 * }
 * const totalVotes = reduceGroups(votes, (sum, it) => sum + it, 0)
 *
 * console.assert(totalVotes === {
 *     'Woody': 10,
 *     'Buzz': 14,
 * })
 * ```
 */
declare function reduceGroups<T, A>(collection: Grouping<T>, reducer: (accumulator: A, current: T) => A, initialValue: A): Record<string, A>

/**
 * Applies the given aggregator to each group in the given Grouping, returning the results together with the respective group keys
 *
 * ```typescript
 * const foodProperties = {
 *     'Curry': [ 'spicy', 'vegan' ],
 *     'Omelette': [ 'creamy', 'vegetarian' ],
 * }
 * const descriptions = aggregateGroups(foodProperties,
 *     (acc, current, key, first) => {
 *         if (first)
 *             return `${key} is ${current}`
 *
 *         return `${acc} and ${current}`
 *     },
 *     '',
 * )
 *
 * console.assert(descriptions === {
 *     'Curry': 'Curry is spicy and vegan',
 *     'Omelette': 'Omelette is creamy and vegetarian',
 * })
 * ```
 */
declare function aggregateGroups<T, A>(collection: Grouping<T>, aggregator: (accumulator: A, current: T, key: string, first: boolean) => A, initalValue: A): Record<string, A>

