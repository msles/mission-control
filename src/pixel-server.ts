/**
 * This is a DEMO file, used for testing just 2 of the displays.
 */
import {Service, Device} from "node-pixel-pusher";
import { Graphics } from "./graphics";

class PixelServer {

  private readonly fps: number;
  private readonly devices: Device[];
  private readonly state: {x: number};

  constructor(fps: number) {
    this.devices = [];
    this.fps = fps;
    this.state = {x: 0};
  }

  /**
   * Starts rendering the given graphics to a new device.
   */
  private addDevice(device: Device, graphics: Graphics) {
    this.devices.push(device);
    const width = device.deviceData.pixelsPerStrip;
    const height = device.deviceData.numberStrips;
    console.log(`Device discovered with resolution ${width}x${height}.`);
    device.startRendering(() => {
      const image = graphics.render(this.state.x)[this.devices.indexOf(device)];
      device.setRGBABuffer(image.data);
    }, this.fps);
  }

  async start() {
    const height = 64;
    const width = height * 2;
    const graphics = await Graphics.build([width, height]);
    const service = new Service();
    service.on('discover', device => {
      if (this.devices.length < 2) {
        this.addDevice(device, graphics);
      }
    });
    // Inefficient way to move the logo... just for testing :)
    setInterval(() => {
      if (this.devices.length > 0) {
        this.state.x = (this.state.x + 1) % width;
      }
    }, Math.floor(1000 / this.fps));
  }

}

export {PixelServer}