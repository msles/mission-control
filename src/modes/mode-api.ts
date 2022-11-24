import { Privileges, User } from "../users";
import Channel from "../web/channel";
import Server from "../web/server";
import Mode from "./mode";
import {z} from "zod";
import { createZodParser, ParseBuilder } from "../web/parse";

// The schema for requesting a mode switch
const ModeSwitchCommand = z.string();

export class ModeAPI {

  private readonly server: Server;
  private readonly modes: Map<string, Mode>;
  private readonly switchMode: (mode: Mode) => void;
  private currentModeName: string;

  constructor(server: Server, currentModeName: string, modes: Map<string,Mode>, switchMode: (mode: Mode) => void) {
    this.server = server;
    this.modes = modes;
    this.switchMode = switchMode;
    this.currentModeName = currentModeName;
    this.server.onUserJoined(user => this.broadcastMode(new Set([user])));
    this.server.addChannel(this.channel());
  }

  private channel(): Channel<readonly [Mode, string]> {
    return {
      name: 'mode',
      privileges: Privileges.Admin,
      parse: new ParseBuilder(createZodParser(ModeSwitchCommand))
        .chain(name => {
          const mode = this.modes.get(name);
          return mode ?
            {success: true, data: [mode, name] as const} :
            {success: false, error: `mode "${name}" is not supported`};
        }).build(),
      onReceived: ([mode, name]) => {
        this.switchMode(mode);
        this.currentModeName = name;
        this.broadcastMode();
      }
    }
  }

  private broadcastMode(users?: Set<User>) {
    this.server.broadcast({
      channel: 'mode',
      message: this.currentModeName
    }, users);
  }

}