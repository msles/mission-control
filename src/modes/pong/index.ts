import Layout from "../../layout";
import WebAPI from "../../web/api";
import Mode, { Frame, ModeBuilder } from "../mode";

class PongMode implements Mode {
  
  // Starts as mapping of GameState -> Display?

  // broadcast: obstacle positions, game over (to specific players)

  defineApi(): WebAPI {
    return {
      // * endpoint / channel for users to join a game
      // * endpoint / channel for admins to start a game
      // * channel for moving a paddle
      // * channel for placing an obstacle
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