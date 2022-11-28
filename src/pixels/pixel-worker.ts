import { Worker } from "worker_threads";
import path from "path";
import { DisplayID } from "../display";
import { Frame } from "../modes/mode";
import Layout, { LayoutStateWritable } from "../layout";

export class PixelWorker {

  private readonly worker: Worker;

  constructor(layoutState: LayoutStateWritable) {
    this.worker = new Worker(path.join(__dirname, "pixel-worker-thread.js"));
    this.worker.on('message', (layout: Layout) => layoutState.updateLayout(layout));
  }

  render(frame: Frame) {
    const message: RenderMessage = Array.from(frame.entries())
      .map(([display, image]) => [display.id, image.data]);
    const transfer = message.map(([_, image]) => image.buffer);
    this.worker.postMessage(message, transfer);
  }

}

export type RenderMessage = [DisplayID, Uint8ClampedArray][];