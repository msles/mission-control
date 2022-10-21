import Server from "../web/server";
import { WebSocket } from "ws";
import Channel from "../web/channel";
import { z } from "zod";
import { createZodParser, ParseResult } from "../web/parse";
import { Privileges } from "../users";

const server = new Server();
const parse = jest.fn<ParseResult<string>, [unknown]>(
  createZodParser(z.string())
);
const onReceived = jest.fn();
const channel: Channel<string> = {
  name: 'test',
  privileges: Privileges.Player,
  parse,
  onReceived
};
const sockets: WebSocket[] = [];

beforeAll(done => {
  server.configure('m', {endpoints: [], channels: [channel]});
  server.start(8084).finally(done);
});

afterAll(done => {
  sockets.forEach(s => s.close());
  server.stop().finally(done);
})

test("websocket channel", async () => {
  const ws = new WebSocket('ws://localhost:8084');
  sockets.push(ws);
  await ready(ws);
  await send(ws, {
    mode: 'm',
    channel: 'test',
    message: 'hello world'
  });
  // this is lazy, but wait 100ms for the server to receive the message.
  await new Promise(resolve => setTimeout(resolve, 100));
  expect(parse).toHaveBeenCalledTimes(1);
  expect(onReceived).toHaveBeenCalledWith('hello world', expect.anything());
});

function ready(ws: WebSocket) {
  return new Promise<void>(resolve => ws.on('open', resolve));
}

function send(ws: WebSocket, msg: any) {
  return new Promise<void>((resolve, reject) => ws.send(
    JSON.stringify(msg),
    err => err ? reject(err) : resolve()
  ));
}