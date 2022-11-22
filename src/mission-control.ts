import LayoutState, { LayoutStateConditional } from "./layout/layout-state";
import Mode, { ModeAPI, ModeBuilder } from "./modes";
import { PixelServer } from "./pixels";
import WebAPI from "./web/api";
import Endpoint, { EndpointType } from "./web/endpoint";
import {z} from "zod";
import { createZodParser, ParseBuilder, WithParseStage } from "./web/parse";
import WebServer from "./web/server";
import { Privileges } from "./users";
import { LayoutAPI } from "./layout";
import { DisplayType } from "./display";

// The schema for requesting a mode switch
const ModeSwitchCommand = z.object({name: z.string()});

class MissionControl {

  private readonly webServer: WebServer;
  private readonly pixelServer: PixelServer;
  private readonly modes: Map<string, Mode>;
  private readonly layoutAPI: LayoutAPI;
  private readonly modeAPI: ModeAPI;
  private currentMode: Mode;
  private layout: LayoutState;

  constructor(modeBuilders: [string, ModeBuilder][]) {
    if (modeBuilders.length === 0) {
      throw new Error("At least one mode is required.");
    }
    this.layout = new LayoutState([
      {display: {type: DisplayType.Matrix, resolution: [64, 64]}, position: [0, 0]},
      {display: {type: DisplayType.Matrix, resolution: [64, 64]}, position: [0, 0]}
    ]);
    const modes = modeBuilders.map(
      ([name, builder]) => [name, this.buildMode(builder, name)] as const
    );
    this.modes = new Map(modes);
    this.webServer = new WebServer();
    const [name, mode] = modes[0];
    this.currentMode = mode;
    this.pixelServer = new PixelServer(
      this.layout,
      // Inefficient method of rendering... re-renders for each display
      () => this.currentMode.render(this.layout.get())
    );
    this.layoutAPI = new LayoutAPI(this.layout, this.webServer);
    this.modeAPI = new ModeAPI(this.webServer, name);
    this.configureWebServer();
  }

  async start() {
    this.currentMode.start(this.layout.get());
    this.pixelServer.start();
    await this.webServer.start(8000);
  }

  private configureWebServer(): void {
    Array.from(this.modes.entries()).forEach(([name, mode]) => {
      this.webServer.configure(
        name,
        this.wrapAPI(mode, mode.defineApi())
      );
    });
    this.webServer.configure('admin', this.adminAPI());
  }


  private adminAPI(): WebAPI {
    const switchMode: Endpoint<readonly [Mode, string], void> = {
      type: EndpointType.COMMAND,
      name: 'switch-mode',
      privileges: Privileges.Admin,
      parse: new ParseBuilder(createZodParser(ModeSwitchCommand))
        .chain(({name}) => {
          const mode = this.modes.get(name);
          return mode ?
            {success: true, data: [mode, name] as const} :
            {success: false, error: `mode "${name}" is not supported`};
        })
        .build(),
      // eslint-disable-next-line @typescript-eslint/require-await
      run: async ([mode, name]) => {
        this.switchMode(mode);
        this.modeAPI.onModeChange(name);
      }
    }
    return {
      endpoints: [switchMode as Endpoint<unknown, unknown>],
      channels: []
    }
  }

  private switchMode(nextMode: Mode) {
    this.currentMode.stop();
    this.currentMode = nextMode;
    this.currentMode.start(this.layout.get());
  }

  private buildMode(builder: ModeBuilder, name: string): Mode {
    const mode = builder(
      (message, channel) => this.broadcastUnderMode(mode, name, message, channel),
      // Only inform a mode of a layout change when it is the active mode.
      new LayoutStateConditional(
        this.layout,
        () => this.currentMode === mode
      )
    );
    return mode;
  }

  /**
   * Broadcasts a message under the given mode and channel,
   * so long as that mode is active.
   */
  private broadcastUnderMode(mode: Mode, name: string, message: unknown, channel: string): void {
    if (this.currentMode === mode) {
      this.webServer.broadcast({mode: name, channel, message});
    }
  }

  /**
   * Ensures an APIs channels and endpoints are not executed when the given
   * mode is not active.
   */
  private wrapAPI(mode: Mode, api: WebAPI): WebAPI {
    return {
      endpoints: api.endpoints.map(endpoint => this.wrapParser(mode, endpoint)),
      channels: api.channels.map(channel => this.wrapParser(mode, channel))
    }
  }

  private wrapParser<P, T extends WithParseStage<P>>(mode: Mode, withParseStage: T): T {
    return {
      ...withParseStage,
      parse: params => {
        if (this.currentMode === mode) {
          return withParseStage.parse(params);
        }
        return {success: false, error: "that mode is no longer active"};
      }
    }
  }

}

export default MissionControl;