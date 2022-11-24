import express, {Express, Response} from "express";
import { RawData, WebSocket, WebSocketServer } from "ws";
import http from "http";
import WebAPI from "./api";
import Endpoint, { EndpointType } from "./endpoint";
import { Privileges, User } from "../users";
import Channel, { ChannelMessage } from "./channel";
import { acceptAny, ParseResult } from "./parse";

/**
 * The mission-control web server.
 */
class Server {

  // The express application that hosts the web app.
  private readonly app: Express;
  private readonly users: Set<User<WebSocket>>;
  private readonly channels: Channel<unknown>[];
  private readonly modeChannels: Map<string, readonly Channel<unknown>[]>;
  private readonly userListeners: Set<UserListener>;
  private httpServer?: http.Server;

  constructor() {
    this.app = express();
    // Parse the request body as JSON
    this.app.use(express.json());
    this.users = new Set();
    this.channels = [this.pingChannel()]
    this.modeChannels = new Map();
    this.userListeners = new Set();
  }

  /**
   * Sends a broadcast message to all users, or only the users
   * specified by `onlyUsers`.
   */
  broadcast(message: ChannelMessage, onlyUsers?: Set<User>) {
    const allUsers = Array.from(this.users);
    const users = onlyUsers ?
      allUsers.filter(user => onlyUsers.has(user)) :
      allUsers;
    users.forEach(user => {
      user.connection.send(JSON.stringify(message));
    });
  }

  /**
   * Add the HTTP endpoints and WebSocket channels defined
   * by the given WebAPI.
   */
  configure(mode: string, api: WebAPI): this {
    // Configure HTTP endpoints
    api.endpoints.forEach(endpoint => {
      this.createEndpoint(`/api/${mode}/${endpoint.name}`, endpoint)
    });
    // Set WebSocket channels
    this.modeChannels.set(mode, api.channels);
    return this;
  }

  addChannel<T>(channel: Channel<T>): this {
    this.channels.push(channel as Channel<unknown>);
    return this;
  }

  /**
   * Start the webserver on the given port.
   * Resolves when the server starts listening.
   */
  start(port: number): Promise<void> {
    const server = http.createServer(this.app);
    const wss = new WebSocketServer({ server });
    wss.on('connection', socket => this.addUser(socket));
    this.httpServer = server;
    return new Promise(resolve => {
      server.listen(port, resolve);
    });
  }

  /**
   * Stop the webserver and free its resources.
   * This closes all active WebSocket connections.
   */
  stop(): Promise<void> {
    return new Promise(resolve => {
      Array.from(this.users).forEach(user => user.connection.close());
      this.httpServer ? 
        this.httpServer?.close(() => resolve()) :
        resolve();
    });
  }

  onUserJoined(listener: UserListener): () => void {
    this.userListeners.add(listener);
    return () => this.userListeners.delete(listener);
  }

  /**
   * Create (or re-identify) a user from a new websocket connection.
   * Process messages from the user by sending them to the corresponding channel.
   */
  private addUser(socket: WebSocket) {
    const user = new User(socket, Privileges.Admin);
    this.users.add(user);
    socket.on('message', message => this.onChannelMessage(message, user));
    socket.on('close', () => this.users.delete(user));
    this.userListeners.forEach(listener => listener(user));
  }

  /**
   * Parse a WebSocket message and forward it to the corresponding WebSocket channel.
   */
  private onChannelMessage(buffer: RawData, from: User<WebSocket>) {
    const json = this.parseJSONBuffer(buffer);
    if (!json.success) {
      return;
    }
    const parseResult = ChannelMessage.safeParse(json.data);
    if (parseResult.success) {
      const {mode, channel, message} = parseResult.data;
      console.log(parseResult.data);
      const channels = this.getChannels(mode).filter(ch => ch.name === channel);
      if (channels.length === 0) {
        console.warn(`No channel ${channel} under mode ${mode ?? 'undefined'}`);
      }
      channels.forEach(ch => this.parseAndReceive(message, ch, from));
    }
    else {
      console.warn('Parsing failed on', json.data, parseResult.error);
    }
  }

  private parseJSONBuffer(buffer: RawData): ParseResult<unknown> {
    try {
      const data: unknown = JSON.parse(buffer.toString('utf8'));
      return {success: true, data};
    }
    catch {
      return {success: false, error: 'Failed to parse JSON value'};
    }
  }

  /**
   * Find all WebSocket channels for the given mode. If no mode is
   * specified, use the list of generic channels.
   */
  private getChannels(mode?: string): readonly Channel<unknown>[] {
    if (mode === undefined) {
      return this.channels;
    }
    return this.modeChannels.get(mode) ?? [];
  }

  /**
   * Sends a 'pong' message back to any user that sends a message on
   * the 'ping' channel.
   */
  private pingChannel(): Channel<unknown> {
    return {
      name: 'ping',
      privileges: Privileges.Player,
      parse: acceptAny(),
      onReceived: (_, user) => this.broadcast(
        {channel: 'ping', message: 'pong'},
        new Set([user])
      )
    }
  }

  /**
   * Create an HTTP endpoint at the given URL
   * @param url The fully-qualified url for the endpoint
   * @param endpoint The endpoint definition
   */
  private createEndpoint<Params, Result>(url: string, endpoint: Endpoint<Params, Result>) {
    // TODO: use session tokens to differentiate 'players' from 'admins'
    if (endpoint.type === EndpointType.FETCH) {
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
  private parseAndReceive<Params>(query: unknown, channel: Channel<Params>, from: User<WebSocket>) {
    const parseResult = channel.parse(query);
    if (parseResult.success) {
      channel.onReceived(parseResult.data, from);
    }
    else {
      console.warn('Failed to parse:', query);
      console.warn('Reason:', parseResult.error);
    }
  }

}

type UserListener = (user: User) => void;

export default Server;