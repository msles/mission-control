import { ImageData } from "canvas";
import Display from "../../display";
import { DisplayType } from "../../display/display";
import { createCanvas, CanvasRenderingContext2D as Context2D } from "canvas";
import Mode from "../mode";
import WebAPI from "../../web/api";
import { Privileges } from "../../users";
import { z } from "zod";
import { createZodParser } from "../../web/parse";
import Layout from "../../layout";

const PaintPixel = z.object({
  coordinates: z.tuple([z.number(), z.number()]),
  color: z.tuple([z.number(), z.number(), z.number()])
})

const PaintCommand = z.array(PaintPixel);

type PaintCommand = z.infer<typeof PaintCommand>;

/**
 * The drawing mode that allows users to paint pixels to invidual displays.
 */
class DrawMode implements Mode {

  private readonly canvases: Map<Display, Context2D>;

  constructor() {
    this.canvases = new Map();
  }

  defineApi(): WebAPI {
    const paintChannel = {
      name: 'paint',
      privileges: Privileges.Player,
      parse: createZodParser(PaintCommand),
      onReceived: (pixels: PaintCommand) => this.paint(pixels)
    }
    return {
      prefix: 'draw',
      endpoints: [],
      channels: [paintChannel]
    }
  }

  private paint(pixels: PaintCommand) {
    const display: Display = { type: DisplayType.Matrix, resolution: [64, 64] }
    const ctx = this.canvases.get(display);
    if (ctx !== undefined) {
      pixels.forEach(pixel => ctx.putImageData(
        // rgba = [red, green, blue, alpha]
        new ImageData(Uint8ClampedArray.from([...pixel.color, 255]), 1, 1),
        pixel.coordinates[0], pixel.coordinates[1]
      ));
    }
  }

  start(layout: Layout): void {
    layout.forEach(({display}) => this.canvases.set(
      display,
      createCanvas(display.resolution[0], display.resolution[1])
        .getContext('2d'))
    );
  }

  stop(): void {
    // Nothing to do
  }

  render(layout: Layout): Map<Display<DisplayType>, ImageData> {
    return new Map(
      Array.from(this.canvases.entries())
           .map(([display, ctx]) => [
              display,
              ctx.getImageData(0, 0, display.resolution[0], display.resolution[1])
           ])
    );
  }

}

export default DrawMode;