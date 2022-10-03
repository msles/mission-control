import express, {Express, Response} from "express";
import WebAPI from "./api";
import Endpoint, { EndpointType } from "./endpoint";

/**
 * The mission-control web server.
 */
class Server {

  // The express application that hosts the web app.
  private readonly app: Express;

  constructor() {
    this.app = express();
    // Parse the request body as JSON
    this.app.use(express.json());
  }

  /**
   * Add the HTTP endpoints and WebSocket channels defined
   * by the given WebAPI.
   */
  configure(api: WebAPI) {
    // Configure HTTP endpoints
    api.endpoints.forEach(endpoint => {
      this.createEndpoint(`/api/${api.prefix}/${endpoint.name}`, endpoint)
    });
    // TODO: configure WebSocket channels
  }

  /**
   * Start the server on the given port.
   */
  start(port: number) {
    this.app.listen(port);
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
      return await endpoint.run(parseResult.data);
    }
    else {
      throw new Error("Failed to parse parameters. " + parseResult.error);
    }
  }

}

export default Server;