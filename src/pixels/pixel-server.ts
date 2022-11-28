import { Service as PixelPusher, Device as PixelDevice } from "node-pixel-pusher";
import Display, { DisplayType } from "../display/display";
import { LayoutStateWritable } from "../layout";
class PixelServer {

  private readonly layoutState: LayoutStateWritable;
  private readonly displays: Map<string, readonly [PixelDevice, Display]>;
  private readonly render: RenderFn;
  private static readonly MAX_FPS = 30;

  constructor(layoutState: LayoutStateWritable, render: RenderFn) {
    this.layoutState = layoutState;
    this.displays = new Map();
    this.render = render;
  }

  start() {
    const pusher = new PixelPusher();
    pusher.on('discover', device => {
      const {macAddress} = device.deviceData;
      const existing = this.displays.get(macAddress);
      if (existing) {
        this.updateDevice(existing, device);
      }
      else {
        this.addDevice(device);
      }
    });
  }

  private addDevice(device: PixelDevice) {
    const {macAddress, pixelsPerStrip, numberStrips} = device.deviceData;
    const display: Display<DisplayType.Matrix> = {
      // does not need to be cryptographically random
      id: Math.random().toString(36).slice(3),
      type: DisplayType.Matrix,
      resolution: [pixelsPerStrip, numberStrips]
    }
    this.displays.set(macAddress, [device, display]);
    this.layoutState.addDisplayRight(display);
    this.startRendering(device, display);
  }

  private updateDevice(existing: readonly [PixelDevice, Display], newDevice: PixelDevice) {
    const [oldDevice, display] = existing;
    oldDevice.stopRendering();
    this.displays.set(newDevice.deviceData.macAddress, [newDevice, display]);
    if (!this.layoutState.has(display)) {
      this.layoutState.addDisplayRight(display);
    }
    this.startRendering(newDevice, display);
  }

  private startRendering(device: PixelDevice, display: Display) {
    device.startRendering(() => this.renderTo(device, display), PixelServer.MAX_FPS);
  }

  private renderTo(device: PixelDevice, display: Display) {
    // console.time('render');
    const image = this.render(display);
    // console.timeEnd('render');
    if (image) {
      // console.time('push');
      device.setRGBABuffer(image);
      // console.timeEnd('push');
    }
  }

}

type RenderFn = (display: Display) => Uint8ClampedArray|undefined;

export default PixelServer;