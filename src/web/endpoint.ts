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
   * A unique name for the endpoint (requests will go to /api/<prefix>/<name>).
   */
  name: string,
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
  run: (params: Params) => Promise<T>
}

export enum EndpointType {
  GET,
  POST
}

export default Endpoint;