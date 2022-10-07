import { Schema } from "zod";

/**
 * Parses a query to a set of parameters.
 * If the input cannot be parsed (e.g. if it is not valid), return undefined.
 */
export type Parser<Params> = (query: unknown) => ParseResult<Params>;

export type ParseResult<T> = ParseSuccess<T> | ParseFail;
type ParseSuccess<T> = {success: true, data: T};
type ParseFail = {success: false, error: string};

/**
 * Convenience function for creating a Parser from a zod Schema.
 */
export function createZodParser<T>(schema: Schema<T>): Parser<T> {
  return (query: unknown) => {
    const parsed = schema.safeParse(query);
    if (parsed.success) {
      return parsed;
    }
    else {
      // TODO: provide a more informative error message
      return {success: false, error: 'parsing error'};
    }
  }
}