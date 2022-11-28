import { parentPort } from "worker_threads";
import Display, { DisplayID } from "../display";
import { LayoutState, LayoutStateWritable } from "../layout";
import PixelServer from "./pixel-server";
import { RenderMessage } from "./pixel-worker";

class PixelWorkerThread {

  private readonly layout: LayoutStateWritable;
  private readonly server: PixelServer;
  private readonly frame: PixelFrame;

  constructor() {
    this.layout = new LayoutState([]);
    this.frame = new Map();
    this.server = new PixelServer(this.layout, display => this.render(display));
  }

  private render(display: Display): Uint8ClampedArray {
    return this.frame.get(display) ?? new Uint8ClampedArray([0]);
  }

  start() {
    parentPort?.on('message', (message: RenderMessage) => {
      message
        .map(([id, image]) => [this.toDisplay(id), image] as const)
        .forEach(([display, image]) => {
          display && this.frame.set(display, image);
        });
    });
    this.layout.onLayoutChanged(layout => parentPort?.postMessage(layout));
    this.server.start();
  }

  private toDisplay(id: DisplayID): Display|undefined {
    return this.layout.get().find(d => d.display.id === id)?.display;
  }

}

type PixelFrame = Map<Display,Uint8ClampedArray>;

new PixelWorkerThread().start();