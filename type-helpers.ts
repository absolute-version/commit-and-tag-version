export type PrettyPrint<T> = T extends infer U extends object
  ? { [K in keyof U]: U[K] }
  : T extends object
  ? never
  : T;

export const isin = <T extends object>(
    obj: T,
    key: PropertyKey
  ): key is keyof T => key in obj;
