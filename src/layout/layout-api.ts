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
  private readonly displayIds: Map<Display, string>;
  private static readonly CHANNEL_NAME = 'layout';

  constructor(layoutState: LayoutState, server: Server) {
    this.state = layoutState;
    this.displayIds = new Map(this.state.get().map(({display}) => [display, this.createId()]));
    // send layout when a user joins
    server.onUserJoined(user => server.broadcast(
      this.createLayoutMessage(layoutState.get()),
      new Set([user])
    ));
    // send layout to all users when layout changes
    this.state.onLayoutChanged(layout => {
      this.updateDisplayIds(layout);
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

  private updateDisplayIds(layout: Layout) {
    layout.forEach(({display}) => {
      if (!this.displayIds.has(display)) {
        this.displayIds.set(display, this.createId());
      }
    });
  }

  private findDisplay(id: string): Display|undefined {
    for (const [display, displayId] of this.displayIds) {
      if (displayId === id) {
        return display;
      }
    }
    return undefined;
  }

  private createId(): string {
    // does not need to be cryptographically random
    return Math.random().toString(36);
  }

  private toLayoutWithIds(layout: Layout) {
    return layout.map(({display, position}) => ({
      display: {...display, id: this.displayIds.get(display)!},
      position
    }));
  }

  private createLayoutMessage(layout: Layout) {
    return {channel: LayoutAPI.CHANNEL_NAME, message: this.toLayoutWithIds(layout)}
  }

}