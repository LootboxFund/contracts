export type Indexed<T> = T extends any[] ? T[number] : never;
export type MatchKeys<T> = { [K in keyof T]: any };
export type KeysOfUnion<T> = T extends T ? keyof T : never;
export type StringKeys<T> = Extract<keyof T, string>;
export type IfNever<Type, TypeIfNever, TypeIfNotNever> = [Type] extends [never]
  ? TypeIfNever
  : TypeIfNotNever;

//A version of pick that properly distributes over union types
//Taken from https://github.com/sindresorhus/type-fest/issues/132
export type UnionPick<T, K extends KeysOfUnion<T>> = T extends T
  ? Pick<T, Exclude<keyof T, Exclude<keyof T, K>>>
  : never;
//A version of omit that properly distributes over union types
export type UnionOmit<T, K extends KeysOfUnion<T>> = T extends T
  ? Omit<T, Exclude<keyof T, Exclude<keyof T, K>>>
  : never;

export type NonEmptyArray<T> = [T, ...T[]];
export type PairArray<T> = [T, T];

//Converting between ISO Date strings and actual Date objects
export type StringifiedDate = string & { readonly _: unique symbol };
export type StringifyDates<T> = {
  [K in keyof T]: Date extends T[K]
    ? Exclude<T[K], Date> | StringifiedDate
    : T[K] extends string | number | undefined | null | never
    ? T[K]
    : StringifyDates<T[K]>;
};
export type DestringifyDates<T> = {
  [K in keyof T]: T[K] extends StringifiedDate ? Date : T[K];
};

export type RecursivePartial<T> = { [P in keyof T]?: RecursivePartial<T[P]> };
export type NonUndefined<T> = T extends undefined ? never : T;
export type EmptyObject = Record<string, never>;

export type KeysThatCanBeUndefined<T> = {
  [K in keyof T]: undefined extends T[K] ? K : never;
}[keyof T];
export type OptionalKeys<T> = Exclude<
  {
    [K in keyof T]: T extends Record<K, T[K]> ? never : K;
  }[keyof T],
  undefined
>;
export type IncludeUndefinedValue<T> = {
  [K in keyof T]: T[K] | undefined;
};
export type ExcludeUndefinedValues<T> = {
  [K in keyof T]: Exclude<T[K], undefined>;
};

export type MakeUndefinedValuesOptional<T> = Omit<
  T,
  KeysThatCanBeUndefined<T>
> &
  Partial<ExcludeUndefinedValues<Pick<T, KeysThatCanBeUndefined<T>>>>;

export type AllowExplicitUndefined<T> = Omit<T, OptionalKeys<T>> &
  Partial<IncludeUndefinedValue<Pick<T, OptionalKeys<T>>>>;

export function isPairArray<T>(arr: T[]): arr is PairArray<T> {
  return arr.length === 2;
}

export type Level2PathStrings<T> = {
  [K in keyof T]-?: T[K] extends Record<string, any>
    ? T[K] extends unknown[] | string | number | Date
      ? never
      : keyof T[K] extends { _: unknown }
      ? never
      : `${string & K}.${string & keyof T[K]}`
    : never;
}[keyof T];
export type ObjectPathStrings<T> = (string & keyof T) | Level2PathStrings<T>;
