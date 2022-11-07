import {User, Privileges} from "../users";
import {WithParseStage} from "./parse";
import {z} from "zod";

/**
 * Represents a WebSocket channel.
 */
type Channel<Params> = WithParseStage<Params> & {
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
   * The function to run when a message is received on this channel.
   */
  onReceived: (params: Params, user: User<unknown>) => void
}

const ChannelMessage = z.object({
  mode: z.optional(z.string()),
  channel: z.string(),
  message: z.unknown()
});

type ChannelMessage = z.infer<typeof ChannelMessage>;

export default Channel;
export {ChannelMessage};