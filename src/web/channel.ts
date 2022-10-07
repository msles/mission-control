import {User, Privileges} from "../users";
import {Parser} from "./parse";
import {string, z} from "zod";

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
  onReceived: (params: Params, user: User<unknown>) => void
}

const ChannelMessage = z.object({
  mode: z.string(),
  channel: z.string()
});

type ChannelMessage = z.infer<typeof ChannelMessage>;

export function parseChannelMessage(data: unknown) {
  return ChannelMessage.passthrough().safeParse(data);
}

export default Channel;
export type {ChannelMessage};