/**
 * Parses a query to a set of parameters.
 * If the input cannot be parsed (e.g. if it is not valid), return undefined.
 */
export type Parser<Params> = (query: unknown) => ParseResult<Params>;

type ParseResult<T> = ParseSuccess<T> | ParseFail;
type ParseSuccess<T> = {success: true, data: T};
type ParseFail = {success: false, error: string};