import Layout from "../../layout";
import WebAPI from "../../web/api";
import Mode, { Frame, ModeBuilder } from "../mode";

class PongMode implements Mode {

  defineApi(): WebAPI {
    return {
      prefix: 'pong',
      endpoints: [],
      channels: []
    }
  }

  start(layout: Layout): void {
    // Initalize the game state(s)
  }

  stop(): void {
    // Free any resources
  }

  render(layout: Layout): Frame {
    // Something like: new PongRenderer(this.gameState).render()
    throw new Error("Method not implemented.");
  }

  static builder(): ModeBuilder {
    return () => new PongMode();
  }

}

export default PongMode.builder();