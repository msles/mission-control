import express, { Request, Response } from "express";

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