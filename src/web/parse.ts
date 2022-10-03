/**
 * Parses a query to a set of parameters.
 * If the input cannot be parsed (e.g. if it is not valid), return undefined.
 */
export type Parser<Params> = (query: unknown) => Maybe<Params>;

type Maybe<T> = T | undefined;