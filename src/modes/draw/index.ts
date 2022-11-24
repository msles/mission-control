import { ImageData, createCanvas, CanvasRenderingContext2D as Context2D } from "canvas";
import Display from "../../display";
import Mode, { BroadcastFn, ModeBuilder } from "../mode";
import WebAPI from "../../web/api";
import { Privileges, User } from "../../users";
import Layout, {layoutBounds, LayoutStateReadable} from "../../layout";
import { z } from "zod";
import { acceptAny, createZodParser } from "../../web/parse";
import { Subject, map, buffer, throttleTime } from "rxjs";
import Channel from "../../web/channel";
import { DisplayPosition, Position } from "../../layout/layout";

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

  private canvas: Context2D;
  private readonly layoutState: LayoutStateReadable;
  private readonly paintSubject: Subject<PaintCommand>;
  private readonly broadcast: BroadcastFn;
  private stopBroadcasting: () => void;
  // How many milliseconds to wait while buffering paint commands before broadcasting
  // all changes
  private static readonly BUFFER_TIME_MS = 20;

  constructor(broadcast: BroadcastFn, layoutState: LayoutStateReadable) {
    this.broadcast = broadcast;
    this.canvas = createCanvas(1, 1).getContext('2d');
    this.layoutState = layoutState;
    this.layoutState.onLayoutChanged(layout => this.start(layout));
    this.paintSubject = new Subject();
    this.stopBroadcasting = () => {};
  }

  defineApi(): WebAPI {
    const paintChannel = {
      name: 'paint',
      privileges: Privileges.Player,
      // TODO: check that the pixel coordinates are within the bounds of the canvas.
      parse: createZodParser(PaintCommand),
      onReceived: (pixels: PaintCommand) => this.paint(pixels)
    }
    const syncChannel: Channel<void> = {
      name: 'sync',
      privileges: Privileges.Player,
      parse: acceptAny(),
      onReceived: (_, user) => this.sync(user)
    }
    return {
      endpoints: [],
      channels: [paintChannel, syncChannel]
    }
  }

  private paint(pixels: PaintCommand) {
    pixels.forEach(pixel => {
      this.canvas.fillStyle = `rgb(${pixel.color[0]},${pixel.color[1]},${pixel.color[2]})`;
      this.canvas.fillRect(pixel.coordinates[0], pixel.coordinates[1], 1, 1);
    });
    this.paintSubject.next(pixels);
  }

  start(layout: Layout): void {
    const [width, height] = layoutBounds(layout);
    this.canvas = createCanvas(
      Math.max(width, 1),
      Math.max(height, 1)
    ).getContext('2d');
    const throttled = this.paintSubject
      .pipe(throttleTime(DrawMode.BUFFER_TIME_MS));
    const subscription = this.paintSubject
      .pipe(buffer(throttled))
      .pipe(map(commands => commands.flat()))
      .subscribe(pixels => this.broadcast(pixels, 'paint'));
    this.stopBroadcasting = () => subscription.unsubscribe();
  }

  stop(): void {
    this.stopBroadcasting();
  }

  render(layout: Layout): Map<Display, ImageData> {
    return new Map(
      layout.map(({display, position}) => [
        display,
        this.getDisplayData(display, position)
      ])
    );
  }

  private sync(user: User): void {
    this.broadcast(this.serializeCanvas(), 'canvas', new Set([user]));
  }

  private serializeCanvas(): SerializedCanvas {
    return this.layoutState.get().map(({display, position}) => ({
      display,
      position,
      pixels: Array.from(this.getDisplayData(display, position).data)
    }));
  }

  private getDisplayData(display: Display, position: Position): ImageData {
    return this.canvas.getImageData(
      position[0], position[1],
      display.resolution[0], display.resolution[1]
    );
  }

  static builder(): ModeBuilder {
    return (broadcast, layoutState) => new DrawMode(broadcast, layoutState);
  }

}

type SerializedCanvas = DisplayPixels[];
type DisplayPixels = DisplayPosition & {pixels: number[]};

export default DrawMode.builder();