import { ImageData, createCanvas, CanvasRenderingContext2D as Context2D } from "canvas";
import Display from "../../display";
import Mode from "../mode";
import WebAPI from "../../web/api";
import { Privileges } from "../../users";
import Layout, {layoutBounds} from "../../layout";
import { z } from "zod";
import { createZodParser } from "../../web/parse";

// A Zod Schema for a natural number
const Natural = z.number().int().positive();
// A Zod Schema for a positive 8-bit integer (0-255).
const PosInt8 = Natural.lt(256);

const PaintPixel = z.object({
  coordinates: z.tuple([Natural, Natural]),
  color: z.tuple([PosInt8, PosInt8, PosInt8])
});

const PaintCommand = z.array(PaintPixel);

type PaintCommand = z.infer<typeof PaintCommand>;

/**
 * The drawing mode that allows users to paint pixels to invidual displays.
 */
class DrawMode implements Mode {

  private readonly canvas: Context2D

  constructor(layout: Layout) {
    const [width, height] = layoutBounds(layout);
    this.canvas = createCanvas(
      width,
      height
    ).getContext('2d');
  }

  defineApi(): WebAPI {
    const paintChannel = {
      name: 'paint',
      privileges: Privileges.Player,
      // TODO: check that the pixel coordinates are within the bounds of the canvas.
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
    pixels.forEach(pixel => this.canvas.putImageData(
      // rgba = [red, green, blue, alpha]
      new ImageData(Uint8ClampedArray.from([...pixel.color, 255]), 1, 1),
      pixel.coordinates[0], pixel.coordinates[1]
    ));
  }

  start(layout: Layout): void {
    // Nothing to do
  }

  stop(): void {
    // Nothing to do
  }

  render(layout: Layout): Map<Display, ImageData> {
    return new Map(
      layout.map(({display, position}) => [
        display,
        this.canvas.getImageData(
          position[0], position[1],
          display.resolution[0], display.resolution[1]
        )
      ])
    );
  }

}

export default DrawMode;