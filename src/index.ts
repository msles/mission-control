import express, { Request, Response } from "express";
import { PixelServer } from "./pixel-server";

// Create the express application
const app = express();

// An example route: GET / -> "Example"
app.get('/', (_req: Request, res: Response) => {
  res.send('Example');
});

// Starts the HTTP server on port 8000.
const PORT = 8_000;
app.listen(PORT);

console.log(`Started the web server at http://localhost:${PORT}/.`);

new PixelServer(30).start()
  .then(() => console.log('Pixel server started.'))
  .catch(() => console.warn('Failed to start pixel server.'));