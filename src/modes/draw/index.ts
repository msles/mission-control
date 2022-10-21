import { ImageData, createCanvas, CanvasRenderingContext2D as Context2D } from "canvas";
import Display from "../../display";
import Mode, { BroadcastFn, ModeBuilder } from "../mode";
import WebAPI from "../../web/api";
import { Privileges } from "../../users";
import Layout, {layoutBounds, LayoutStateReadable} from "../../layout";
import { z } from "zod";
import { createZodParser } from "../../web/parse";

// A Zod Schema for a natural number
const Natural = z.number().int().gte(0);
// A Zod Schema for a positive 8-bit integer (0-255).
const PosInt8 = Natural.lt(256);

const PaintPixel = z.object({
  coordinates: z.tuple([Natural, Natural]),
  color: z.tuple([PosInt8, PosInt8, PosInt8])
});

const PaintCommand = z.array(PaintPixel);

export type PaintCommand = z.infer<typeof PaintCommand>;

/**
 * The drawing mode that allows users to paint pixels to invidual displays.
 */
class DrawMode implements Mode {

  private readonly broadcast: BroadcastFn;
  private canvas: Context2D

  constructor(broadcast: BroadcastFn, layoutState: LayoutStateReadable) {
    this.broadcast = broadcast;
    this.canvas = createCanvas(1, 1).getContext('2d');
    layoutState.onLayoutChanged(layout => this.start(layout));
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
      endpoints: [],
      channels: [paintChannel]
    }
  }

  paint(pixels: PaintCommand) {
    pixels.forEach(pixel => this.canvas.putImageData(
      // rgba = [red, green, blue, alpha]
      new ImageData(Uint8ClampedArray.from([...pixel.color, 255]), 1, 1),
      pixel.coordinates[0], pixel.coordinates[1]
    ));
  }

  start(layout: Layout): void {
    const [width, height] = layoutBounds(layout);
    this.canvas = createCanvas(
      Math.max(width, 1),
      Math.max(height, 1)
    ).getContext('2d');
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

  static builder(): ModeBuilder {
    return (broadcast, layoutState) => new DrawMode(broadcast, layoutState);
  }

}

export default DrawMode.builder();