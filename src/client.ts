import {WebSocket} from "ws";

const socket = new WebSocket("ws://localhost:8000");

socket.on('open', () => {
  console.log('connected');
  const pixels = [];
  for (let x = 0; x < 64; x++) {
    for (let y = 0; y < 64; y++) {
      pixels.push({coordinates: [x, y], color: [150, 0, 0]})
      pixels.push({coordinates: [64+x, y], color: [0, 0, 150]})
    }
  }
  const message = {
    mode: "draw",
    channel: "paint",
    message: pixels
  }
  socket.send(JSON.stringify(message));
  console.log('sent message');
  console.dir(message);
});

socket.on('message', msg => console.dir(msg));