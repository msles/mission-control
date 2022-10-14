import LayoutState from "./layout/layout-state";
import Mode, { ModeBuilder } from "./modes";
import { PixelServer } from "./pixels";
import WebServer from "./web/server";

class MissionControl {

  private readonly webServer: WebServer;
  private readonly pixelServer: PixelServer;
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
    this.currentMode = modes[0];
    this.pixelServer = new PixelServer(
      this.layout,
      // Inefficient method of rendering... re-renders for each display
      () => this.currentMode.render(this.layout.get())
    );
  }

  start() {
    this.currentMode.start(this.layout.get());
    this.webServer.start(8000);
    this.pixelServer.start();
  }

  private switchMode(nextMode: Mode) {
    this.currentMode.stop();
    this.currentMode = nextMode;
    this.currentMode.start(this.layout.get());
  }

}

export default MissionControl;