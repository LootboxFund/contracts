import isEqual from "lodash/isEqual";
import clone from "lodash/clone";
import intersection from "lodash/intersection";
import {
  KeysOfUnion,
  MakeUndefinedValuesOptional,
  UnionOmit,
} from "./helperTypes";

export function toBoolean<T>(val: T): boolean {
  return val ? true : false;
}

export function fallback<T, K>(
  main: T,
  fallbackVal: K
): Exclude<T, null | undefined> | K {
  if (main) {
    return main as Exclude<T, null | undefined>;
  }
  return fallbackVal;
}

export function removeUndefined<T extends Record<any, any>>(
  obj: T
): MakeUndefinedValuesOptional<T> {
  Object.keys(obj).forEach((key) => {
    const val = obj[key as keyof T];
    if (val === undefined) {
      delete obj[key as keyof T];
    }
  });
  return obj;
}

// export function removeUndefined<T>(obj: T): T {
//   Object.keys(obj).forEach((key: unknown) => {
//     const val = obj[key as keyof T];
//     if (val === undefined) {
//       delete obj[key as keyof T];
//     }
//   });
//   return obj;
// }

export function isNonEmpty<T>(arr: T[]): arr is [T, ...T[]] {
  return arr.length > 0;
}

export function isLength1<T>(arr: T[]): arr is [T] {
  return arr.length === 1;
}

export function isAtLeast2<T>(arr: T[]): arr is [T, T, ...T[]] {
  return arr.length > 1;
}

export function makeUnique<T, K extends keyof T>(arr: T[], property: K) {
  const ids = new Set();
  const newArr: T[] = [];
  arr.forEach((obj) => {
    if (!ids.has(obj[property])) {
      newArr.push(obj);
      ids.add(obj[property]);
    }
  });
  return newArr;
}

export function removeProperties<T, K extends keyof T>(
  obj: T,
  ...properties: K[]
): Omit<T, K> {
  const newObj = clone(obj);
  properties.forEach((x) => {
    delete newObj[x];
  });
  return newObj;
}

export function combineArrays<T>(...arrs: T[][]): T[] {
  return Array.from(
    new Set(arrs.reduce<T[]>((totalArr, arr) => totalArr.concat(arr), []))
  );
}

export function addDict(dict1: any, dict2: any) {
  if (!isEqual(Object.keys(dict1), Object.keys(dict2))) {
    throw Error("Dictionaries do not have same keys");
  }
  return Object.keys(dict1).reduce<any>((output, key) => {
    output[key] = dict1[key] + dict2[key];
    return output;
  }, {});
}

export function asyncForEach<T, K>(
  arr: T[],
  func: (val: T, index?: number) => Promise<K>
): Promise<K[]> {
  return Promise.all(arr.map((x, i) => func(x, i)));
}

export async function sequentialAsyncForEach<T, K>(
  arr: T[],
  func: (val: T, index?: number) => Promise<K>
): Promise<K[]> {
  const output: K[] = [];
  let index = 0;
  for (const x of arr) {
    output.push(await func(x, index));
    index++;
  }
  return output;
}

export function arrayDifference<T>(arr1: T[], arr2: T[]): T[] {
  const toExclude = new Set(arr2);
  return arr1.filter((x) => !toExclude.has(x));
}

export function arrayDiff<T>(
  oldArr: T[],
  newArr: T[]
): { added: T[]; removed: T[] } {
  const oldElements = new Set(oldArr);
  const newElements = new Set(newArr);

  //All the elements in the new array that weren't in the old array
  const addedElements = newArr.filter((x) => !oldElements.has(x));
  //All the elements in the old array that weren't in the new array
  const removedElements = oldArr.filter((x) => !newElements.has(x));

  return {
    added: addedElements,
    removed: removedElements,
  };
}

export function doArraysHaveSameContent(arr1: unknown[], arr2: unknown[]) {
  const { added, removed } = arrayDiff(arr1, arr2);
  return added.length === 0 && removed.length === 0;
}

export function findAndUpdate<T>(
  arr: T[],
  findFunc: (val: T) => boolean,
  updateFunc: (val: T) => T
): T[] {
  return arr.map((x) => (findFunc(x) ? updateFunc(x) : x));
}

export function findMax<T, K extends keyof T>(arr: T[], key: K) {
  let max: T | undefined;
  let maxVal: T[K] | undefined;
  for (const val of arr) {
    if (maxVal === undefined || val[key] > maxVal) {
      max = val;
      maxVal = val[key];
    }
  }
  return max;
}

//If T is a string, then only the array is neccesary.
//If T is not a string, then both the the array and a function to get the deduplication key is needed
export function deduplicate<T>(
  ...params: T extends string
    ? [arr: T[]]
    : [arr: T[], getKey: (val: T) => string]
): T[] {
  const newArr: T[] = [];
  const addedKeys = new Set<string>();
  params[0].forEach((x) => {
    const key = params[1] === undefined ? x : params[1](x);
    if (!addedKeys.has(key)) {
      addedKeys.add(key);
      newArr.push(x);
    }
  });
  return newArr;
}

export function upsert<T>(arr: T[], val: T, isEqual: (x: T) => boolean): T[] {
  let updated = false;
  const newArr = arr.map((x) => {
    if (isEqual(x)) {
      updated = true;
      return val;
    } else {
      return x;
    }
  });
  if (!updated) {
    return newArr.concat([val]);
  } else {
    return newArr;
  }
}

export function filterMap<T, K>(
  arr: T[],
  func: (val: T, index: number) => K | undefined
): K[] {
  const output: K[] = [];
  arr.forEach((obj, index) => {
    const val = func(obj, index);
    if (val !== undefined) {
      output.push(val);
    }
  });
  return output;
}

export function removeUndefinedFromArr<T>(arr: (T | undefined)[]): T[] {
  return filterMap(arr, (x) => x);
}

export function forEachPair<T>(arr: T[], func: (pair: [T, T]) => void) {
  for (let i = 0; i < arr.length - 1; i++) {
    for (let j = i; j < arr.length - 1; j++) {
      func([arr[i] as T, arr[j + 1] as T]);
    }
  }
}

export function getKeys<T>(obj: T): (keyof T)[] {
  return Object.keys(obj).map((x) => x as keyof T);
}

//Given an array of objects, return a map from a key in each object to that object
export function mapArrayOn<T, K extends keyof T>(objects: T[], key: K) {
  return objects.reduce<Record<string | number, T>>((map, obj) => {
    const objKey = obj[key];
    if (objKey !== null && objKey !== undefined) {
      if (typeof objKey !== "string" && typeof objKey !== "number") {
        throw Error("Must index on string or number");
      }
      map[objKey] = obj;
    }
    return map;
  }, {});
}

//Given an array of objects, return a map from a key in each object to another key in that object
export function getMapFromArr<T, K extends keyof T, J extends keyof T>(
  objects: T[],
  keyKey: K,
  valueKey: J
) {
  return objects.reduce<Record<string | number, T[J]>>((map, obj) => {
    const objKey = obj[keyKey];
    if (objKey !== null && objKey !== undefined) {
      if (typeof objKey !== "string" && typeof objKey !== "number") {
        throw Error("Must index on string or number");
      }
      map[objKey] = obj[valueKey];
    }
    return map;
  }, {});
}

export function doSetsIntersect<T>(set1: Set<T>, set2: Set<T>): boolean {
  const arr = Array.from(set1);
  for (const x of arr) {
    if (set2.has(x)) {
      return true;
    }
  }
  return false;
}

export function wait(milliseconds: number) {
  return new Promise((resolve) => setTimeout(resolve, milliseconds));
}

export function insertIntoArray<T>(array: T[], item: T, index: number | null) {
  if (index !== null) {
    array.splice(index, 0, item);
  } else {
    array.push(item);
  }
}

export function pluralize(
  num: number,
  noun: string,
  pluralNoun?: string,
  includeNumber = true
) {
  if (includeNumber) {
    if (num === 1) {
      return `1 ${noun}`;
    } else {
      return pluralNoun ? `${num} ${pluralNoun}` : `${num} ${noun}s`;
    }
  }
  if (num === 1) {
    return `${noun}`;
  } else {
    return pluralNoun ? `${pluralNoun}` : `${noun}s`;
  }
}

export function moveToIndex<T>(
  arr: T[],
  index: number,
  findFunc: (val: T) => boolean
) {
  const newArr = arr.slice();
  const removeIndex = newArr.findIndex(findFunc);
  if (removeIndex >= 0 && removeIndex !== index) {
    const [removed] = newArr.splice(removeIndex, 1);
    newArr.splice(index, 0, removed as T);
  }
  return newArr;
}

export function strCutoff(str: string, cutoff: number) {
  if (!str) {
    return str;
  }
  if (typeof str !== "string") {
    return str;
  }
  return str.length > cutoff
    ? str.substring(0, cutoff - 3).trim() + "..."
    : str;
}

export function getCommaSeparatedList(
  strings: string[],
  cutoff = true,
  useAmpersand = false
): string {
  const andSymbol = useAmpersand ? "&" : "and";

  if (strings.length === 0) {
    return "";
  }
  if (strings.length === 1) {
    return strings[0] as string;
  }
  if (strings.length === 2) {
    return `${strings[0]} ${andSymbol} ${strings[1]}`;
  }
  if (strings.length === 3) {
    return `${strings[0]}, ${strings[1]}, ${andSymbol} ${strings[2]}`;
  }
  if (cutoff) {
    return `${strings[0]}, ${strings[1]}, ${andSymbol} ${
      strings.length - 2
    } others`;
  } else {
    const initial = strings.slice(0, -1).join(", ");
    return `${initial}, ${andSymbol} ${strings[strings.length - 1]}`;
  }
}

export function getLongCommaSepartedList(strings: string[], cutoff: number) {
  let initial = strings.slice(0, cutoff).join(", ");
  if (strings.length === cutoff + 1) {
    initial += ", and 1 other";
  } else if (strings.length > cutoff + 1) {
    initial += `, and ${strings.length - cutoff} others`;
  }
  return initial;
}

export function assertNever(_: never): never {
  throw new Error("Unreachable code");
}

export function safeAssertNever(_: never): null {
  return null;
}

export function addToDictArray<T>(
  dict: Record<string, T[] | null>,
  key: string,
  val: T | T[] | null,
  ifUnique = false
) {
  if (val) {
    let newValAsArr = Array.isArray(val) ? val : [val];

    const dictVal = dict[key];
    if (dictVal) {
      if (ifUnique) {
        const existingVals = new Set(dictVal);
        newValAsArr = newValAsArr.filter((x) => !existingVals.has(x));
      }
      dictVal.push(...newValAsArr);
    } else {
      dict[key] = newValAsArr;
    }
  }
}

export function getFirstRegexMatch(str: string, regex: RegExp) {
  const email = str.match(regex);
  if (email !== null) {
    return email[0] ?? null;
  } else {
    return null;
  }
}

export function regexMatchAll(
  str: string,
  regex: RegExp
): { match: string; groups: string[] }[] {
  const output: { match: string; groups: string[] }[] = [];

  let match = regex.exec(str);
  while (match !== null) {
    const matchVal = match[0];
    if (matchVal) {
      output.push({
        match: matchVal,
        groups: match.slice(1),
      });
    }
    match = regex.exec(str);
  }

  return output;
}

export function pick<T, K extends keyof T>(obj: T, ...keys: K[]): Pick<T, K> {
  const ret = {} as Pick<T, K>;
  keys.forEach((key) => {
    ret[key] = obj[key];
  });
  return ret;
}

export function omit<T extends Record<string, any>, K extends KeysOfUnion<T>>(
  obj: T,
  ...keys: K[]
): UnionOmit<T, K> {
  const ret: any = {};
  const excludeSet: Set<string> = new Set(keys);

  for (const key in obj) {
    if (!excludeSet.has(key)) {
      ret[key] = obj[key];
    }
  }
  return ret;
}

export function addArrayToSet<T>(set: Set<T>, arr: T[]) {
  arr.forEach((x) => set.add(x));
}

export function isValidOptionalArray(arr?: unknown[]) {
  return arr !== undefined && arr.length > 0;
}

export function moveToFront<T>(arr: T[], predicate: (val: T) => boolean) {
  const front: T[] = [];
  const back: T[] = [];
  arr.forEach((x) => {
    if (predicate(x)) {
      front.push(x);
    } else {
      back.push(x);
    }
  });
  return front.concat(back);
}

export function normalizeText(text: string) {
  return text.trim().toLowerCase();
}

export function getLastElement<T>(arr: [T, ...T[]]): T {
  return arr[arr.length - 1] as T;
}

export function getIntArray(num: number): number[] {
  const arr = Array<number>(num);
  for (let i = 0; i < num; i++) {
    arr[i] = i;
  }
  return arr;
}

export function containsAlphanumeric(str: string) {
  const regex = /.*[a-zA-Z0-9].*/;
  return str.length > 0 && regex.test(str);
}

export function undefinedIfEmpty<T>(arr: T[]): T[] | undefined {
  return arr.length === 0 ? undefined : arr;
}

export function timeoutPromise<T>(
  promise: Promise<T>,
  time: number
): Promise<T> {
  return Promise.race([
    promise,
    new Promise<T>((_, rej) => setTimeout(rej, time)),
  ]);
}

export function prettyPrint(obj: any) {
  console.log(JSON.stringify(obj, null, 2));
}

export function doArraysIntersect<T>(arr1: T[], arr2: T[]) {
  return intersection(arr1, arr2).length > 0;
}

export function capitalize(s: string) {
  if (s[0] !== undefined) {
    return s[0].toUpperCase() + s.slice(1);
  } else {
    return s;
  }
}

export function trimStartNonAlphaNumeric(str: string) {
  let trimIndex = 0;
  while (!containsAlphanumeric(str.charAt(trimIndex))) {
    trimIndex += 1;
  }
  return str.substring(trimIndex);
}

export function getMessageFromError(err: unknown): string {
  if (typeof (err as any).message === "string") {
    return (err as any).message;
  }

  return "";
}

export function getKeysOfRecord<Key extends string>(
  record: Record<Key, unknown>
): Key[] {
  return Object.keys(record) as Key[];
}

export function getEntriesOfRecord<Key extends string, Val extends unknown>(
  record: Record<Key, Val>
): [Key, Val][] {
  return Object.entries(record) as [Key, Val][];
}

export function mapOnEachValue<Key extends string, Val, MapTo>(
  record: Record<Key, Val>,
  func: (val: Val) => MapTo
): Record<Key, MapTo> {
  const toReturn = {} as Record<Key, MapTo>;
  Object.keys(record).forEach((keyStr) => {
    const key = keyStr as Key;
    toReturn[key] = func(record[key]);
  });
  return toReturn;
}

export function addDashesToUUID(uuid: string) {
  const part1 = uuid.substring(0, 8);
  const part2 = uuid.substring(8, 12);
  const part3 = uuid.substring(12, 16);
  const part4 = uuid.substring(16, 20);
  const part5 = uuid.substring(20);
  return [part1, part2, part3, part4, part5].join("-");
}

export function getMax<T>(
  arr: T[],
  compare: (a: T, b: T) => number
): T | undefined {
  let max: T | undefined;
  arr.forEach((x) => {
    if (max === undefined) {
      max = x;
    } else if (compare(x, max) >= 0) {
      max = x;
    }
  });
  return max;
}
