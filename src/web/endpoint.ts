import { Privileges } from "../users";
import { Parser } from "./parse";

/**
 * Describes an HTTP API endpoint.
 */
type Endpoint<Params, T> = {
  /**
   * What type of request should this endpoint respond to?
   */
  type: EndpointType,
  /**
   * What privileges are required to use this endpoint?
   */
  privileges: Privileges,
  /**
   * Pareses the request parameters (GET query or POST body depending
   * on the enndpoint type).
   */
  parse: Parser<Params>,
  /**
   * Execute the endpoint's logic to produce the result.
   */
  run: (params: Params) => APIResult<T>
}

export enum EndpointType {
  GET,
  POST
}

type APIResult<T> = APIFail | APISucess<T>;
type APIFail = { error: string };
type APISucess<T> = { result: T };

export default Endpoint;