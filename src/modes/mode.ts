import { ImageData } from "canvas";
import Display from "../display";
import Layout from "../layout";
import WebAPI from "../web/api";

/**
 * Represents an activity played/shown on the connected displays.
 */
interface Mode {

  defineApi(): WebAPI

  /**
   * Draw the mode as a set of images to be shown on the given displays.
   * @param layout The current arrangement of display to render to.
   */
  render(layout: Layout): Frame

}

/**
 * The graphics to show across multiple displays.
 */
type Frame = Map<Display,ImageData>;

export default Mode;