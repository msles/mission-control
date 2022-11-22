import { User } from "../users";
import Server from "../web/server";

export class ModeAPI {

  private readonly server: Server;
  private currentModeName: string;

  constructor(server: Server, currentModeName: string) {
    this.server = server;
    this.currentModeName = currentModeName;
    this.server.onUserJoined(user => this.broadcastMode(new Set([user])));
  }

  onModeChange(mode: string) {
    this.currentModeName = mode;
    this.broadcastMode();
  }

  private broadcastMode(users?: Set<User>) {
    this.server.broadcast({
      channel: 'mode',
      message: this.currentModeName
    }, users);
  }

}