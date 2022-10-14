import { Service as PixelPusher, Device as PixelDevice } from "node-pixel-pusher";
import Display, { DisplayType } from "../display/display";
import { LayoutStateWritable } from "../layout";
import { layoutBounds, Position } from "../layout/layout";
import { Frame } from "../modes/mode";

class PixelServer {

  private readonly layoutState: LayoutStateWritable;
  private readonly render: RenderFn;

  constructor(layoutState: LayoutStateWritable, render: RenderFn) {
    this.layoutState = layoutState;
    this.render = render;
  }

  start() {
    const pusher = new PixelPusher();
    pusher.on('discover', device => {
      const display: Display = {
        type: DisplayType.Matrix,
        resolution: [
          device.deviceData.pixelsPerStrip,
          device.deviceData.numberStrips
        ]
      };
      const [width] = layoutBounds(this.layoutState.get());
      const position: Position = [width, 0];
      this.layoutState.addDisplay(display, position);
      device.startRendering(() => this.renderTo(device, display));
    });
  }

  private renderTo(device: PixelDevice, display: Display) {
    const image = this.render().get(display);
    if (image) {
      device.setRGBABuffer(image.data);
    }
  }

}

type RenderFn = () => Frame;

export default PixelServer;