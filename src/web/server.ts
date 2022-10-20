import express, {Express, Response} from "express";
import { RawData, WebSocket, WebSocketServer } from "ws";
import http from "http";
import WebAPI from "./api";
import Endpoint, { EndpointType } from "./endpoint";
import { Privileges, User } from "../users";
import Channel, { ChannelMessage } from "./channel";
import Mode from "../modes";
import { createZodParser, ParseBuilder, Parser, ParseResult } from "./parse";
import {z} from "zod";

// The schema for requesting a mode switch
const ModeSwitchCommand = z.object({name: z.string()});

/**
 * The mission-control web server.
 */
class Server {

  // The express application that hosts the web app.
  private readonly app: Express;
  private readonly users: Set<User<WebSocket>>;
  private readonly channels: Map<string, readonly Channel<unknown>[]>;
  private readonly modes: Map<string, Mode>;

  constructor(modes: readonly Mode[], onModeRequested: ModeRequestHandler) {
    const modeApis = modes.map(mode => [mode, mode.defineApi()] as const);
    this.app = express();
    // Parse the request body as JSON
    this.app.use(express.json());
    this.users = new Set();
    this.channels = new Map();
    this.modes = new Map(modeApis.map(([mode, api]) => [api.prefix, mode]));
    this.configureAll(modeApis.map(([_mode, api]) => api));
    this.configureModeSwitch(onModeRequested);
  }

  broadcast(message: unknown, onlyUsers?: Set<User>) {
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
  private configure(api: WebAPI): this {
    // Configure HTTP endpoints
    api.endpoints.forEach(endpoint => {
      this.createEndpoint(`/api/mode/${api.prefix}/${endpoint.name}`, endpoint)
    });
    // Set WebSocket channels
    this.channels.set(api.prefix, api.channels);
    return this;
  }

  /**
   * Configure a set of APIs
   */
  private configureAll(apis: readonly WebAPI[]): this {
    apis.forEach(api => this.configure(api));
    return this;
  }

  /**
   * Add the mode switch endpoint, which will invoke the given callback.
   */
  private configureModeSwitch(onModeRequested: ModeRequestHandler): this {
    const switchMode: Endpoint<Mode, void> = {
      type: EndpointType.COMMAND,
      name: 'switch-mode',
      privileges: Privileges.Admin,
      parse: new ParseBuilder(createZodParser(ModeSwitchCommand))
        .chain(({name}) => {
          const mode = this.modes.get(name);
          return mode ?
            {success: true, data: mode} :
            {success: false, error: `mode "${name}" is not supported`};
        })
        .build(),
      run: async mode => onModeRequested(mode)
    }
    this.createEndpoint(`/api/switch-mode`, switchMode)
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
  private onChannelMessage(buffer: RawData) {
    const json = this.parseJSONBuffer(buffer);
    if (!json.success) {
      return;
    }
    const parseResult = ChannelMessage.safeParse(json.data);
    if (parseResult.success) {
      const {mode, channel, message} = parseResult.data;
      // TODO: check if mode matches the current mode.
      this.getChannels(mode)
        .filter(ch => ch.name === channel)
        .forEach(ch => this.parseAndReceive(message, ch));
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
  private parseAndReceive<Params>(query: unknown, channel: Channel<Params>) {
    const parseResult = channel.parse(query);
    if (parseResult.success) {
      // TODO: actually determine user
      channel.onReceived(parseResult.data, new User(0, Privileges.Player));
    }
  }

}

/**
 * A callback that handles a mode switch request.
 */
type ModeRequestHandler = (mode: Mode) => void;

export default Server;