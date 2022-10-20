import { Privileges, User } from "../users";
import { WithParseStage } from "./parse";

/**
 * Describes an HTTP API endpoint.
 */
type Endpoint<Params, T> = WithParseStage<Params> & {
  /**
   * What type of request should this endpoint respond to?
   */
  type: EndpointType,
  /**
   * A unique name for the endpoint (requests will go to /api/mode/<prefix>/<name>).
   */
  name: string,
  /**
   * What privileges are required to use this endpoint?
   */
  privileges: Privileges,
  /**
   * Execute the endpoint's logic to produce the result.
   */
  run: (params: Params, user: User<unknown>) => Promise<T>
}

export enum EndpointType {
  FETCH,
  COMMAND
  // TODO: add UPLOAD endpoint type
}

export default Endpoint;