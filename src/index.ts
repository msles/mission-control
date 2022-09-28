import express, { Request, Response } from "express";
import {Service} from "node-pixel-pusher";
import canvas from "canvas";

// Create the express application
const app = express();

// An example route: GET / -> "Example"
app.get('/', (_req: Request, res: Response) => {
  res.send('Example');
});

// Starts the HTTP server on port 8000.
const PORT = 8_000;
app.listen(PORT);

/**
 * Sample code from https://www.npmjs.com/package/node-pixel-pusher
 */
const service = new Service();
service.on('discover', device => {
  console.log("device discovered: ");
  console.dir(device.deviceData);
  const width = device.deviceData.pixelsPerStrip;
  const height = device.deviceData.numberStrips;
  const ctx = canvas.createCanvas(width, height).getContext('2d');
  const rectWidth = Math.max(1, Math.min(16, Math.floor(width / 4)))
  ctx.fillStyle = 'red';
  let pos = 0;
  const maxFPS = 30;
 
  console.log(`Starting render at ${maxFPS} FPS`);
 
  device.startRendering(() => {
    ctx.clearRect(0, 0, width, height);
    ctx.fillRect(pos, 0, rectWidth, height);
    const ImageData = ctx.getImageData(0, 0, width, height);
    device.setRGBABuffer(ImageData.data);
 
    pos = (pos+1) % (width - rectWidth);
  }, maxFPS);
})

console.log(`Started the web server at http://localhost:${PORT}/.`);