import {Privileges} from "../users";
import {Parser} from "./parse";

/**
 * Represents a WebSocket channel.
 */
type Channel<Params> = {
  /**
   * The name of the WebSocket channel. Only messages with this name
   * will be received on this channel.
   */
  name: string,
  /**
   * What privileges are needed to for a user to send messages on this
   * channel?
   */
  privileges: Privileges,
  /**
   * Parse messages on this channel.
   */
  parse: Parser<Params>,
  /**
   * The function to run when a message is received on this channel.
   */
  onReceived: (params: Params) => void
}

export default Channel;