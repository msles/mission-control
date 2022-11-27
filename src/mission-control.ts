import LayoutState, { LayoutStateConditional } from "./layout/layout-state";
import Mode, { ModeAPI, ModeBuilder } from "./modes";
import { PixelServer } from "./pixels";
import WebAPI from "./web/api";
import { WithParseStage } from "./web/parse";
import WebServer from "./web/server";
import { LayoutAPI } from "./layout";
import { DisplayType } from "./display";
import { User } from "./users";

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
    this.layout = new LayoutState([]);
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
    this.modeAPI = new ModeAPI(this.webServer, name, this.modes, mode => this.switchMode(mode));
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
  }

  private switchMode(nextMode: Mode) {
    this.currentMode.stop();
    this.currentMode = nextMode;
    this.currentMode.start(this.layout.get());
  }

  private buildMode(builder: ModeBuilder, name: string): Mode {
    const mode = builder(
      (message, channel, users) => this.broadcastUnderMode(mode, name, message, channel, users),
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
  private broadcastUnderMode(mode: Mode, name: string, message: unknown, channel: string, users?: Set<User>): void {
    if (this.currentMode === mode) {
      this.webServer.broadcast({mode: name, channel, message}, users);
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