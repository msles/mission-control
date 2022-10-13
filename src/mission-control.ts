import LayoutState from "./layout/layout-state";
import Mode, { ModeBuilder } from "./modes";
import WebServer from "./web/server";

class MissionControl {

  private readonly webServer: WebServer;
  // private readonly pixelServer: PixelServer;
  private currentMode: Mode;
  private layout: LayoutState;

  constructor(modeBuilders: ModeBuilder[]) {
    if (modeBuilders.length === 0) {
      throw new Error("At least one mode is required.");
    }
    this.layout = new LayoutState([]);
    const modes = modeBuilders.map(builder => builder(
      message => this.webServer.broadcast(message),
      this.layout
    ));
    this.webServer = new WebServer(modes, mode => this.switchMode(mode));
    // this.pixelServer = new PixelServer();
    this.currentMode = modes[0];
  }

  start() {
    this.currentMode.start(this.layout.get());
    this.webServer.start(8000);
  }

  private switchMode(nextMode: Mode) {
    this.currentMode.stop();
    this.currentMode = nextMode;
    this.currentMode.start(this.layout.get());
  }

}

export default MissionControl;