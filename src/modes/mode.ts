import { ImageData } from "canvas";
import Display from "../display";
import Layout from "../layout";
import { LayoutStateReadable } from "../layout/layout-state";
import { User } from "../users";
import WebAPI from "../web/api";

/**
 * Represents an activity played/shown on the connected displays.
 */
interface Mode {

  /**
   * Creates the http endpoints and websocket channels for this mode.
   */
  defineApi(): WebAPI

  /**
   * Initialize the mode (invoked when the active mode is switched to this mode).
   */
  start(layout: Layout): void

  /**
   * Clean up the mode when the active mode is switched away from this mode.
   */
  stop(): void

  /**
   * Draw the mode as a set of images to be shown on the given displays.
   * @param layout The current arrangement of display to render to.
   */
  render(layout: Layout): Frame

}

/**
 * The graphics to show across multiple displays.
 */
export type Frame = Map<Display,ImageData>;

export type BroadcastFn = (message: unknown, channel: string, users?: Set<User>) => void
export type ModeBuilder = (
  broadcast: BroadcastFn,
  layoutState: LayoutStateReadable
  // TODO: UsersReadable. How does a mode know when a user has joined or left?
) => Mode;

export default Mode;