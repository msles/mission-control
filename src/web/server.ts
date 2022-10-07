import express, {Express, Response} from "express";
import { RawData, WebSocket, WebSocketServer } from "ws";
import http from "http";
import WebAPI from "./api";
import Endpoint, { EndpointType } from "./endpoint";
import { Privileges, User } from "../users";
import Channel, { parseChannelMessage } from "./channel";

/**
 * The mission-control web server.
 */
class Server {

  // The express application that hosts the web app.
  private readonly app: Express;
  private readonly users: Set<User<WebSocket>>;
  private readonly channels: Map<string, readonly Channel<unknown>[]>;

  constructor() {
    this.app = express();
    // Parse the request body as JSON
    this.app.use(express.json());
    this.users = new Set();
    this.channels = new Map();
  }

  /**
   * Add the HTTP endpoints and WebSocket channels defined
   * by the given WebAPI.
   */
  configure(api: WebAPI): this {
    // Configure HTTP endpoints
    api.endpoints.forEach(endpoint => {
      this.createEndpoint(`/api/${api.prefix}/${endpoint.name}`, endpoint)
    });
    // Set WebSocket channels
    this.channels.set(api.prefix, api.channels);
    return this;
  }

  /**
   * Start the webserver on the given port.
   */
  start(port: number) {
    const server = http.createServer(this.app);
    const wss = new WebSocketServer({ server });
    wss.on('connection', socket => this.addUser(socket));
    server.listen(port);
  }

  /**
   * Create (or re-identify) a user from a new websocket connection.
   * Process messages from the user by sending them to the corresponding channel.
   */
  private addUser(socket: WebSocket) {
    const user = new User(socket, Privileges.Admin);
    this.users.add(user);
    socket.on('message', message => this.onChannelMessage(message));
    socket.on('close', () => this.users.delete(user));
  }

  /**
   * Parse a WebSocket message and forward it to the corresponding WebSocket channel.
   */
  private onChannelMessage(raw: RawData) {
    const parseResult = parseChannelMessage(JSON.parse(raw.toString('utf8')));
    if (parseResult.success) {
      const {mode, channel} = parseResult.data;
      // TODO: check if mode matches the current mode.
      this.getChannels(mode)
        .filter(ch => ch.name === channel)
        .forEach(ch => this.parseAndReceive(parseResult.data, ch));
    }
  }

  /**
   * Find all WebSocket channels for the given mode.
   */
  private getChannels(mode: string): readonly Channel<unknown>[] {
    return this.channels.get(mode) ?? [];
  }

  /**
   * Create an HTTP endpoint at the given URL
   * @param url The fully-qualified url for the endpoint
   * @param endpoint The endpoint definition
   */
  private createEndpoint<Params, Result>(url: string, endpoint: Endpoint<Params, Result>) {
    // TODO: use session tokens to differentiate 'players' from 'admins'
    if (endpoint.type === EndpointType.GET) {
      this.app.get(url, (request, response) => this.respond(request.params, endpoint, response));
    }
    else {
      this.app.post(url, (request, response) => this.respond(request.body, endpoint, response));
    }
  }

  /**
   * Respondds to an HTTP request to the given endpoint.
   */
  private respond<Params, Result>(query: unknown, endpoint: Endpoint<Params, Result>, response: Response): void {
    this.parseAndRun(query, endpoint)
      .then(result => response.json(result))
      .catch((error: Error) => response.status(400).json({error: error.message}));
  }

  /**
   * Attempts to parse a given query, then passing the result to the given endpoint.
   * If parsing fails, the Promise is rejected.
   */
  private async parseAndRun<Params, Result>(query: unknown, endpoint: Endpoint<Params, Result>): Promise<Result> {
    const parseResult = endpoint.parse(query);
    if (parseResult.success) {
      // TODO: actually determine user
      return await endpoint.run(parseResult.data, new User(0, Privileges.Player));
    }
    else {
      throw new Error("Failed to parse parameters. " + parseResult.error);
    }
  }

  /**
   * Attends to parse a given query, then passing the result to the given channel.
   * If parsing fails, the message is ignored.
   */
  private parseAndReceive<Params>(query: unknown, channel: Channel<Params>) {
    const parseResult = channel.parse(query);
    if (parseResult.success) {
      // TODO: actually determine user
      channel.onReceived(parseResult.data, new User(0, Privileges.Player));
    }
  }

}

export default Server;