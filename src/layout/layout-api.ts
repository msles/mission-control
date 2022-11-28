import Display from "../display";
import { createZodParser, ParseBuilder, Parser } from "../web/parse";
import Server from "../web/server";
import Layout, { DisplayPosition } from "./layout";
import LayoutState from "./layout-state";
import {z} from "zod";
import Channel from "../web/channel";
import { Privileges } from "../users";

const PosInt = z.number().gte(0).int();
const LayoutCommand = z.object({
  id: z.string(),
  position: z.tuple([PosInt, PosInt])
});

export class LayoutAPI {

  private readonly state: LayoutState;
  private static readonly CHANNEL_NAME = 'layout';

  constructor(layoutState: LayoutState, server: Server) {
    this.state = layoutState;
    // send layout when a user joins
    server.onUserJoined(user => server.broadcast(
      this.createLayoutMessage(layoutState.get()),
      new Set([user])
    ));
    // send layout to all users when layout changes
    this.state.onLayoutChanged(layout => {
      server.broadcast(this.createLayoutMessage(layout));
    });
    server.addChannel(this.channel());
  }

  private channel(): Channel<DisplayPosition> {
    return {
      name: LayoutAPI.CHANNEL_NAME,
      privileges: Privileges.Admin,
      parse: this.parse(),
      onReceived: ({display, position}) => {
        console.log('updating', display, 'to', position);
        this.state.moveDisplay(display, position)
      }
    }
  }

  private parse(): Parser<DisplayPosition> {
    return new ParseBuilder(createZodParser(LayoutCommand))
      .chain(({id, position}) => {
        const display = this.findDisplay(id);
        if (!display) {
          return {success: false, error: `Display ${id} not found.`}
        }
        else {
          return {success: true, data: {display, position}}
        }
      })
      .build()
  }

  private findDisplay(id: string): Display|undefined {
    return this.state.get().find(({display}) => display.id === id)?.display;
  }

  private createLayoutMessage(layout: Layout) {
    return {channel: LayoutAPI.CHANNEL_NAME, message: layout}
  }

}