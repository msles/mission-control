import { User } from "../../users";

class GameState {

  /**
   * STAGES:
   * 
   * 1. Setup (handled outside of GameState)
   * accumulate users (and assign roles, either player or observer)
   * assign users to games (starting with one game per display)
   * -> use layout.length on start to know how many games there should be
   * -> must be a power of 2
   * start the game (create the GameStates)
   * 
   * 2. Gameplay
   * players can move the paddle
   * observers can place obstacles
   * -> how often? may have to broadcast when a new obstacle can be placed
   * ---
   * the game state will know when a player scores a goal
   * after a set number of goals (or a timer), the game ends
   * 
   * 3. Game end
   * merge games by taking the winner of each (and merge all observers)
   * on the last game, we end the entire thing
   */

  constructor(players: Set<User>, observers: Set<User>) {

  }

  movePaddle(player: User, y: number): GameState {
    return this;
  }

  placeObstacle(obstacle: Obstacle): GameState {
    return this;
  }

  tick(): GameState {
    // TODO: advance the game by one step
    return this;
  }

}

// Represents an obstruction on the pong "board"
interface Obstacle {

}

export default GameState;