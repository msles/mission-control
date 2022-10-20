import LayoutState, { LayoutStateConditional } from "./layout/layout-state";
import Mode, { ModeBuilder } from "./modes";
import { PixelServer } from "./pixels";
import WebAPI from "./web/api";
import Endpoint, { EndpointType } from "./web/endpoint";
import {z} from "zod";
import { createZodParser, ParseBuilder } from "./web/parse";
import WebServer from "./web/server";
import { Privileges } from "./users";

// The schema for requesting a mode switch
const ModeSwitchCommand = z.object({name: z.string()});

class MissionControl {

  private readonly webServer: WebServer;
  private readonly pixelServer: PixelServer;
  private readonly modes: Map<string, Mode>;
  private currentMode: Mode;
  private layout: LayoutState;

  constructor(modeBuilders: [string, ModeBuilder][]) {
    if (modeBuilders.length === 0) {
      throw new Error("At least one mode is required.");
    }
    this.layout = new LayoutState([]);
    const modes = modeBuilders.map(
      ([name, builder]) => [name, this.buildMode(builder)] as const
    );
    this.modes = new Map(modes);
    this.webServer = new WebServer();
    [, this.currentMode] = modes[0];
    this.pixelServer = new PixelServer(
      this.layout,
      // Inefficient method of rendering... re-renders for each display
      () => this.currentMode.render(this.layout.get())
    );
    this.configureWebServer();
  }

  start() {
    this.currentMode.start(this.layout.get());
    this.webServer.start(8000);
    this.pixelServer.start();
  }

  private configureWebServer(): void {
    Array.from(this.modes.entries()).forEach(([name, mode]) => {
      this.webServer.configure(`mode/${name}`, mode.defineApi());
    });
    this.webServer.configure('admin', this.adminAPI());
  }

  private adminAPI(): WebAPI {
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
      // eslint-disable-next-line @typescript-eslint/require-await
      run: async mode => this.switchMode(mode)
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

  private buildMode(builder: ModeBuilder): Mode {
    const mode = builder(
      message => this.webServer.broadcast(message),
      // Only inform a mode of a layout change when it is the active mode.
      new LayoutStateConditional(
        this.layout,
        () => this.currentMode === mode
      )
    );
    return mode;
  }

}

export default MissionControl;