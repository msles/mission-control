import Endpoint from "./endpoint";
import Channel from "./channel";

/**
 * Defines a HTTP and WebSocket API.
 */
type WebAPI = {
  
  /**
   * HTTP endpoints for this API
   */
  endpoints: readonly Endpoint<unknown, unknown>[]
  /**
   * WebSocket channels for this API
   */
  channels: readonly Channel<any>[]
  
}


export default WebAPI;