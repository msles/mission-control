import { createCanvas, CanvasRenderingContext2D as Context2D } from "canvas";
import Mode, { Frame, ModeBuilder } from "../mode";
import WebAPI from "../../web/api";
import { Privileges, User } from "../../users";
import Layout, {layoutBounds, LayoutStateReadable, normalizeLayout} from "../../layout";
import { z } from "zod";
import { acceptAny, createZodParser } from "../../web/parse";
import GameState from "./game-state";
import Channel from "../../web/channel";

const PaddleMoveCommand = z.number().gte(0).lte(1);
type PaddleMoveCommand = z.infer<typeof PaddleMoveCommand>;

const JoinGameCommand = z.union([z.literal("player"), z.literal("observer")]);
type JoinGameCommand = z.infer<typeof JoinGameCommand>;

class PongMode implements Mode {

  private readonly layout: LayoutStateReadable;
  private readonly games: Map<User, GameRunner>;
  private readonly players: Set<User>;
  private readonly observers: Set<User>;
  private readonly runners: Set<GameRunner>;

  constructor(layout: LayoutStateReadable) {
    this.layout = layout;
    this.games = new Map();
    this.players = new Set();
    this.observers = new Set();
    this.runners = new Set();
  }

  start() {
    // Nothing to do
  }

  stop() {
    // Stop all active games and clear out users.
    this.runners.forEach(runner => runner.stop());
    this.runners.clear();
    this.games.clear();
    this.players.clear();
    this.observers.clear();
  }

  private startGame(): void {
    if (this.players.size >= 2) {
      // just create one game for now
      const [p1, p2] = Array.from(this.players);
      // for now, just take the first display
      const runner = new GameRunner([p1, p2], this.observers, this.layout.get().slice(0, 1));
      this.players.forEach(player => this.games.set(player, runner));
      this.observers.forEach(observer => this.games.set(observer, runner));
      this.runners.add(runner);
      runner.start();
    }
    else {
      console.warn("Too few players to start a game.");
    }
  }

  private stopGame(game: GameRunner): void {
    game.stop();
    this.runners.delete(game);
    const players = Array.from(this.games.entries()).filter(([player, g]) => g === game);
    for (const [player] of players) {
      this.games.delete(player);
    }
  }

  defineApi(): WebAPI {
    return {
      channels: [
        this.joinGameChannel(),
        this.startGameChannel(),
        this.stopGameChannel(),
        this.paddleChannel()
      ],
      endpoints: []
    }
  }

  private joinGameChannel(): Channel<JoinGameCommand> {
    return {
      name: 'join',
      privileges: Privileges.Player,
      parse: createZodParser(JoinGameCommand),
      onReceived: (type, user) => {
        if (type === 'player' && !this.observers.has(user)) {
          this.players.add(user);
        }
        else if (type === 'observer' && !this.players.has(user)) {
          this.observers.add(user);
        }
      }
    }
  }

  private startGameChannel(): Channel<undefined> {
    return {
      name: 'start',
      privileges: Privileges.Player,
      parse: acceptAny(),
      onReceived: () => this.startGame()
    }
  }

  private stopGameChannel(): Channel<undefined> {
    return {
      name: 'stop',
      privileges: Privileges.Player,
      parse: acceptAny(),
      onReceived: (_, user) => {
        const game = this.games.get(user);
        if (game) {
          this.stopGame(game);
        }
      }
    }
  }

  private paddleChannel(): Channel<PaddleMoveCommand> {
    return {
      name: 'paddle',
      privileges: Privileges.Player,
      parse: createZodParser(PaddleMoveCommand),
      onReceived: (y, user) => {
        this.games.get(user)?.movePaddle(user, y);
      }
    }
  }

  render(_layout: Layout): Frame {
    const frame: Frame = new Map();
    this.runners.forEach(runner => {
      for (const [display, image] of runner.render().entries()) {
        frame.set(display, image);
      }
    });
    return frame;
  }

  static builder(): ModeBuilder {
    return (broadcast, layoutState) => new PongMode(layoutState);
  }

}

class GameRunner {

  private readonly game: GameState;
  private readonly size: readonly [number, number];
  private readonly layout: Layout;
  private readonly canvas: Context2D;
  private stopRunning: () => void;

  constructor(players: readonly [User, User], observers: Set<User>, layout: Layout) {
    this.layout = normalizeLayout(layout);
    this.size = layoutBounds(this.layout);
    this.game = new GameState(players, observers, this.size);
    this.canvas = createCanvas(this.size[0], this.size[1]).getContext('2d');
    this.stopRunning = () => {};
  }

  /**
   * Start the game loop. This method restarts the game loop
   * if it was already started.
   */
  start() {
    this.stopRunning();
    const interval = setInterval(() => this.game.tick(33), 33);
    this.stopRunning = () => clearInterval(interval);
  }

  /**
   * Stop the game loop.
   */
  stop() {
    this.stopRunning();
  }

  /**
   * Move the player's paddle if it within the bounds of the board size.
   */
  movePaddle(player: User, y: number) {
    if (y < this.size[1]) {
      this.game.movePaddle(player, y);
    }
  }

  /**
   * Render the game using the layout this runner was created with.
   */
  render(): Frame {
    this.game.render(this.canvas);
    const frame: Frame = new Map();
    for (const {display, position} of this.layout) {
      frame.set(display, this.canvas.getImageData(
        position[0], position[1], display.resolution[0], display.resolution[1]
      ));
    }
    return frame;
  }

}

export default PongMode.builder();
